
'use server';

import pool from "@/lib/db";
import { format } from 'date-fns';
import { sendAnnouncementEmail } from '@/lib/email';
import { Resend } from 'resend';

type PaystackVerificationResponse = {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: string;
    reference: string;
    amount: number; // in pesewas
    customer: {
      email: string;
    };
    metadata: {
        user_id?: string; // Should now contain the user's UUID from our new users table
        student_id_display?: string; 
        student_name?: string;
        grade_level?: string;
        donation?: string;
        school_id?: number;
    };
    paid_at: string; // ISO 8601 string
  };
};

interface FeePaymentRecord {
  id: string;
  payment_id_display: string;
  student_id_display: string;
  amount_paid: number;
  payment_date: string; 
  payment_method: string;
  term_paid_for: string;
  notes?: string | null;
}

type ActionResponse = {
    success: boolean;
    message: string;
    payment?: FeePaymentRecord | null;
}

interface VerificationPayload {
    reference: string;
    userId: string; // This is the user_id (UUID) from our new users table
}

export async function verifyPaystackTransaction(payload: VerificationPayload): Promise<ActionResponse> {
    const { reference, userId } = payload;
    const client = await pool.connect();
    
    if (!userId) {
        return { success: false, message: "Authentication failed. User ID is missing." };
    }
    
    try {
        const { rows: studentSchoolData } = await client.query('SELECT school_id FROM students WHERE user_id = $1', [userId]);
        
        if (studentSchoolData.length === 0) {
            return { success: false, message: "Could not determine the school for this transaction." };
        }
        const schoolId = studentSchoolData[0].school_id;

        const { rows: schoolSettings } = await client.query('SELECT paystack_secret_key FROM schools WHERE id = $1', [schoolId]);
        const paystackSecretKey = schoolSettings[0]?.paystack_secret_key || process.env.PAYSTACK_SECRET_KEY;
        
        if (!paystackSecretKey || paystackSecretKey.includes("YOUR")) {
            console.error("Payment Verification Error: Paystack Secret Key is not configured for this school.");
            return { success: false, message: "Server is not configured for payment verification. Please contact support." };
        }

        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${paystackSecretKey}` },
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Paystack API returned an error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const verificationData: PaystackVerificationResponse = await response.json();

        if (verificationData.status && verificationData.data.status === 'success') {
            
            if (verificationData.data.metadata?.donation === "true") {
                return { success: true, message: "Donation successful! Thank you." };
            }
            
            const { rows: existingPayment } = await client.query('SELECT * FROM fee_payments WHERE payment_id_display = $1', [`PS-${reference}`]);
            
            if (existingPayment.length > 0) {
                return { success: true, message: 'Payment was already recorded successfully.', payment: existingPayment[0] as FeePaymentRecord };
            }
            
            const { rows: serverVerifiedStudent } = await client.query('SELECT * FROM students WHERE user_id = $1', [userId]);
            
            if (serverVerifiedStudent.length === 0) {
                 return { success: false, message: "Critical error: Could not verify your student profile after successful payment. Please contact support immediately." };
            }
            
            const student = serverVerifiedStudent[0];
            const { amount, paid_at } = verificationData.data;
            
            const paymentArgs = [
                student.school_id,
                `PS-${reference}`,
                student.student_id_display,
                student.full_name,
                student.grade_level,
                amount / 100,
                format(new Date(paid_at), 'yyyy-MM-dd'),
                'Paystack',
                'Online Payment',
                `Online payment via Paystack with reference: ${reference}`,
                'Paystack Gateway',
                student.user_id
            ];
            
            await client.query(`
              INSERT INTO fee_payments 
              (school_id, payment_id_display, student_id_display, student_name, grade_level, amount_paid, payment_date, payment_method, term_paid_for, notes, received_by_name, received_by_user_id)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `, paymentArgs);
            
            const { rows: settingsRows } = await client.query('SELECT email, name, resend_api_key FROM schools WHERE id = $1', [schoolId]);
            const settings = settingsRows[0];

            if (settings?.email) {
                const resendApiKey = settings.resend_api_key || process.env.RESEND_API_KEY;
                const emailFrom = process.env.EMAIL_FROM_ADDRESS || 'noreply@edusync.app';
                if (resendApiKey && emailFrom) {
                    const resend = new Resend(resendApiKey);
                    await resend.emails.send({
                        from: `EduSync Payments <${emailFrom}>`,
                        to: settings.email,
                        subject: `New Online Payment Received - ${student.full_name}`,
                        html: `<p>A new online payment has been successfully processed for ${settings.name}.</p><p><strong>Student:</strong> ${student.full_name} (${student.student_id_display})</p><p><strong>Amount:</strong> GHS ${(amount / 100).toFixed(2)}</p><p><strong>Reference:</strong> ${reference}</p><p>This payment has been automatically recorded in the system.</p>`,
                    });
                }
            }

            return { success: true, message: `Payment of GHS ${(amount / 100).toFixed(2)} recorded successfully.`, payment: null };

        } else {
            return { success: false, message: `Paystack verification failed: ${verificationData.message}` };
        }
    } catch (error: any) {
        console.error('Error during Paystack verification:', error);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    } finally {
        client.release();
    }
}

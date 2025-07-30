
'use server';

import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

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
        student_id_display?: string; // Optional for donations
        student_name?: string; // Optional for donations
        grade_level?: string; // Optional for donations
        school_id?: string; // Should be present for all new transactions
        donation?: string; // Present for donations
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

export async function verifyPaystackTransaction(reference: string): Promise<ActionResponse> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error("Payment Verification Error: Missing Supabase server environment variables.");
        return { success: false, message: "Server is not configured for payment verification. Please contact support." };
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    let paystackSecretKey: string | null = null;
    try {
        const { data: settingsData, error: settingsError } = await supabaseAdmin
            .from('app_settings')
            .select('paystack_secret_key')
            .eq('id', 1) // Assuming school_id 1 for now, this could be enhanced for multi-tenancy
            .single();

        if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
        
        // Prioritize key from DB, fallback to environment variable
        paystackSecretKey = settingsData?.paystack_secret_key || process.env.PAYSTACK_SECRET_KEY || null;

    } catch (dbError: any) {
        console.error(`Payment Verification DB Error: Could not fetch Paystack key:`, dbError.message);
        return { success: false, message: "Could not fetch school payment settings to verify transaction." };
    }
    
    if (!paystackSecretKey) {
        console.error("Payment Verification Error: Paystack Secret Key is not configured.");
        return { success: false, message: "Server is not configured for payment verification. Please contact support." };
    }

    try {
        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${paystackSecretKey}`,
            },
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
            
            const { metadata, amount, customer, paid_at } = verificationData.data;

            if (!metadata || !metadata.student_id_display || !metadata.student_name || !metadata.grade_level) {
                const errorMsg = `Payment verification failed for reference ${reference}: Required metadata (student_id_display, student_name, grade_level) was missing from Paystack.`;
                console.error(errorMsg, { metadata });
                return { success: false, message: "Payment failed: Critical student information was missing from the transaction. Please contact support." };
            }
            
            const { data: existingPayment, error: checkError } = await supabaseAdmin
                .from('fee_payments')
                .select('*')
                .eq('payment_id_display', `PS-${reference}`)
                .single();
            
            if (checkError && checkError.code !== 'PGRST116') {
                throw new Error(`Database error checking for existing payment: ${checkError.message}`);
            }

            if (existingPayment) {
                console.log(`Transaction with reference ${reference} already processed. Returning existing record.`);
                return { success: true, message: 'Payment was already recorded successfully.', payment: existingPayment as FeePaymentRecord };
            }

            const { data: studentData, error: studentError } = await supabaseAdmin
                .from('students')
                .select('auth_user_id')
                .eq('student_id_display', metadata.student_id_display)
                .single();
            
            if (studentError && studentError.code !== 'PGRST116') {
                console.warn("Payment verification warning: Could not fetch student profile for ID:", metadata.student_id_display, studentError);
            }

            const paymentToSave: { [key: string]: any } = {
                payment_id_display: `PS-${reference}`,
                student_id_display: metadata.student_id_display,
                student_name: metadata.student_name,
                grade_level: metadata.grade_level,
                amount_paid: amount / 100,
                payment_date: format(new Date(paid_at), 'yyyy-MM-dd'),
                payment_method: 'Paystack',
                term_paid_for: 'Online Payment',
                notes: `Online payment via Paystack with reference: ${reference}`,
                received_by_name: 'Paystack Gateway',
            };

            if (studentData?.auth_user_id) {
                paymentToSave.received_by_user_id = studentData.auth_user_id;
            }

            const { data: insertedPayment, error: insertError } = await supabaseAdmin
                .from('fee_payments')
                .insert([paymentToSave])
                .select()
                .single();

            if (insertError) {
                console.error('Failed to save verified payment to database for reference:', reference, 'Payload:', paymentToSave, 'Error:', JSON.stringify(insertError, null, 2));
                let userMessage = `Payment was verified but failed to save to our system. Please contact support with reference: ${reference}.`;
                if (insertError.message.includes('violates row-level security policy')) {
                    userMessage = "Database security policy prevented saving your payment. Please contact administration to resolve this.";
                } else if (insertError.message.includes('violates not-null constraint')) {
                    userMessage = "Payment could not be saved because some required information was missing. Please contact administration.";
                }
                return { success: false, message: userMessage };
            }

            return { success: true, message: `Payment of GHS ${(amount / 100).toFixed(2)} recorded successfully.`, payment: insertedPayment as FeePaymentRecord };

        } else {
            return { success: false, message: `Paystack verification failed: ${verificationData.message}` };
        }
    } catch (error: any) {
        console.error('Error during Paystack verification:', error);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}

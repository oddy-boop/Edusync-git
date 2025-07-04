
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
        student_id_display: string;
        student_name: string;
        grade_level: string;
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
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!paystackSecretKey || !supabaseUrl || !supabaseServiceRoleKey) {
        console.error("Payment Verification Error: Missing server environment variables.");
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
            const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
            const { metadata, amount, customer, paid_at } = verificationData.data;

            // Check if this transaction has already been processed to prevent duplicates
            const { data: existingPayment, error: checkError } = await supabaseAdmin
                .from('fee_payments')
                .select('*') // Select all columns to return if it exists
                .eq('payment_id_display', `PS-${reference}`)
                .single();
            
            if (checkError && checkError.code !== 'PGRST116') { // 'PGRST116' means no rows found, which is good
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

            const paymentToSave = {
                payment_id_display: `PS-${reference}`,
                student_id_display: metadata.student_id_display,
                student_name: metadata.student_name,
                grade_level: metadata.grade_level,
                amount_paid: amount / 100, // Convert from pesewas to GHS
                payment_date: format(new Date(paid_at), 'yyyy-MM-dd'),
                payment_method: 'Paystack',
                term_paid_for: 'Online Payment',
                notes: `Online payment via Paystack with reference: ${reference}`,
                received_by_name: 'Paystack Gateway',
                received_by_user_id: studentData?.auth_user_id || null, // Make this robust, allow null
            };

            const { data: insertedPayment, error: insertError } = await supabaseAdmin
                .from('fee_payments')
                .insert([paymentToSave])
                .select()
                .single();

            if (insertError) {
                console.error('Failed to save verified payment to database:', insertError);
                return { success: false, message: `Payment was verified but failed to save to our system. Please contact support with reference: ${reference}` };
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

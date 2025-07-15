import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import crypto from 'crypto';

interface PaystackWebhookPayload {
  event: 'charge.success';
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
}

// These are your server-side environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;


export async function POST(request: Request) {
    if (!supabaseUrl || !supabaseServiceRoleKey || !paystackSecretKey) {
        console.error("Webhook Error: Missing server environment variables.");
        return new NextResponse('Server configuration error', { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');
    const hash = crypto.createHmac('sha512', paystackSecretKey).update(body).digest('hex');

    if (hash !== signature) {
        console.warn('Webhook Error: Invalid signature received.');
        return new NextResponse('Invalid signature', { status: 401 });
    }

    const payload: PaystackWebhookPayload = JSON.parse(body);

    if (payload.event === 'charge.success') {
        try {
            const { metadata, amount, paid_at, reference } = payload.data;
            
            // Check if payment already exists
            const { data: existingPayment, error: checkError } = await supabaseAdmin
                .from('fee_payments')
                .select('id')
                .eq('payment_id_display', `PS-${reference}`)
                .single();
            
            if (checkError && checkError.code !== 'PGRST116') { // 'PGRST116' means no rows found, which is good
                throw new Error(`Database error checking for existing payment: ${checkError.message}`);
            }

            if (existingPayment) {
                console.log(`Webhook Info: Transaction with reference ${reference} already processed. Ignoring.`);
                return NextResponse.json({ status: 'success', message: 'Already processed' });
            }

            const paymentToSave = {
                payment_id_display: `PS-${reference}`,
                student_id_display: metadata.student_id_display,
                student_name: metadata.student_name,
                grade_level: metadata.grade_level,
                amount_paid: amount / 100, // Convert from pesewas to GHS
                payment_date: format(new Date(paid_at), 'yyyy-MM-dd'),
                payment_method: 'Paystack (Webhook)',
                term_paid_for: 'Online Payment',
                notes: `Online payment via Paystack with reference: ${reference}`,
                received_by_name: 'Paystack Gateway',
            };

            const { error: insertError } = await supabaseAdmin
                .from('fee_payments')
                .insert([paymentToSave]);

            if (insertError) {
                console.error('Webhook Error: Failed to save verified payment to database:', insertError);
                return new NextResponse('Database insert failed', { status: 500 });
            }

            console.log(`Webhook Success: Payment for ${metadata.student_name} (Ref: ${reference}) successfully recorded.`);

        } catch (error: any) {
            console.error('Webhook Error: Unexpected error processing charge.success event:', error);
            return new NextResponse(`Webhook handler error: ${error.message}`, { status: 500 });
        }
    }

    return NextResponse.json({ status: 'success' });
}

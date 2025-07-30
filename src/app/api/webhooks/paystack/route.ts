
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
        student_id_display?: string; // Optional for donations
        student_name?: string; // Optional for donations
        grade_level?: string; // Optional for donations
        school_id?: string; // Present for multi-tenant identification
        donation?: string; // Present for donations
    };
    paid_at: string; // ISO 8601 string
  };
}

// These are your server-side environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error("Webhook Error: Missing Supabase server environment variables.");
        return new NextResponse('Server configuration error', { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const body = await request.text();
    const payload: PaystackWebhookPayload = JSON.parse(body);
    
    // Determine the school_id from the webhook payload. Default to '1' for single-tenant setups.
    const schoolId = payload.data?.metadata?.school_id ? parseInt(payload.data.metadata.school_id, 10) : 1;
    if (isNaN(schoolId)) {
        console.error(`Webhook Error: Invalid school_id in metadata: ${payload.data?.metadata?.school_id}`);
        return new NextResponse('Invalid school identifier in payment metadata', { status: 400 });
    }

    // --- Fetch Paystack Secret Key from Database based on school_id ---
    let paystackSecretKey: string | null = null;
    try {
        const { data: settingsData, error: settingsError } = await supabaseAdmin
            .from('app_settings')
            .select('paystack_secret_key')
            .eq('id', schoolId)
            .single();

        if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
        
        paystackSecretKey = settingsData?.paystack_secret_key || process.env.PAYSTACK_SECRET_KEY || null;

    } catch (dbError: any) {
        console.error(`Webhook DB Error: Could not fetch Paystack key for school_id ${schoolId}:`, dbError.message);
        return new NextResponse('Could not fetch school settings', { status: 500 });
    }

    if (!paystackSecretKey) {
        console.error(`Webhook Error: Paystack Secret Key is not configured for school_id ${schoolId}.`);
        return new NextResponse('Payment processing not configured for this school', { status: 500 });
    }

    // --- Verify Signature ---
    const signature = request.headers.get('x-paystack-signature');
    if (!signature) {
        console.warn(`Webhook Error: Missing x-paystack-signature header.`);
        return new NextResponse('Missing signature', { status: 400 });
    }
    const hash = crypto.createHmac('sha512', paystackSecretKey).update(body).digest('hex');

    if (hash !== signature) {
        console.warn(`Webhook Error: Invalid signature received. Check if the correct secret key is configured.`);
        return new NextResponse('Invalid signature', { status: 401 });
    }

    // --- Process Event ---
    if (payload.event === 'charge.success') {
        if (payload.data.metadata?.donation === "true") {
            console.log(`Webhook Info: Received successful donation of GHS ${payload.data.amount / 100} with reference ${payload.data.reference}. No further action needed by webhook.`);
            return NextResponse.json({ status: 'success', message: 'Donation acknowledged' });
        }
        
        try {
            const { metadata, amount, paid_at, reference } = payload.data;

            if (!metadata.student_id_display || !metadata.student_name || !metadata.grade_level) {
                 console.error(`Webhook Error: Missing required student metadata for reference ${reference}.`, metadata);
                 return new NextResponse('Missing required student metadata for student fee payment.', { status: 400 });
            }
            
            const { data: existingPayment, error: checkError } = await supabaseAdmin
                .from('fee_payments')
                .select('id')
                .eq('payment_id_display', `PS-${reference}`)
                .single();
            
            if (checkError && checkError.code !== 'PGRST116') {
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


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

export async function POST(request: Request) {
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!paystackSecretKey || !supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Webhook Error: Missing server environment variables for Paystack or Supabase.");
    return new NextResponse('Server configuration error', { status: 500 });
  }

  const signature = request.headers.get('x-paystack-signature');
  const body = await request.text();

  const hash = crypto.createHmac('sha512', paystackSecretKey).update(body).digest('hex');
  if (hash !== signature) {
    console.warn('Webhook Error: Invalid signature received.');
    return new NextResponse('Invalid signature', { status: 401 });
  }

  const payload: PaystackWebhookPayload = JSON.parse(body);

  if (payload.event === 'charge.success') {
    try {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
      const { metadata, amount, paid_at, reference } = payload.data;

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

      const { data: studentData, error: studentError } = await supabaseAdmin
        .from('students')
        .select('auth_user_id')
        .eq('student_id_display', metadata.student_id_display)
        .single();

      if (studentError && studentError.code !== 'PGRST116') {
        console.error(`Webhook Warning: Could not fetch student profile for ID: ${metadata.student_id_display}`, studentError);
      }

      const paymentToSave: { [key: string]: any } = {
        payment_id_display: `PS-${reference}`,
        student_id_display: metadata.student_id_display,
        student_name: metadata.student_name,
        grade_level: metadata.grade_level,
        amount_paid: amount / 100,
        payment_date: format(new Date(paid_at), 'yyyy-MM-dd'),
        payment_method: 'Paystack (Webhook)',
        term_paid_for: 'Online Payment',
        notes: `Online payment via Paystack webhook. Ref: ${reference}`,
        received_by_name: 'Paystack Gateway',
      };

      if (studentData?.auth_user_id) {
        paymentToSave.received_by_user_id = studentData.auth_user_id;
      }

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

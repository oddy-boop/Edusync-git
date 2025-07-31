import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { format, parseISO } from 'date-fns';
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
      student_id_display?: string;
      student_name?: string;
      grade_level?: string;
      school_id?: string;
      donation?: string;
      [key: string]: any;
    };
    paid_at: string; // ISO 8601 string
  };
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// The webhook will now ONLY use the secret key from the environment variables.
// This is more secure and reliable than fetching it from the DB for this purpose.
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

// Create a logger for better debugging in Vercel logs
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[PAYSTACK_WEBHOOK_INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[PAYSTACK_WEBHOOK_ERROR] ${message}`, error ? JSON.stringify(error, null, 2) : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[PAYSTACK_WEBHOOK_WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
};

export async function POST(request: Request) {
  logger.info('--- PAYSTACK WEBHOOK PROCESSING STARTED ---');
  
  // Validate environment variables at the start
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    logger.error('Missing Supabase environment variables');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
  
  if (!paystackSecretKey) {
    logger.error('PAYSTACK_SECRET_KEY is not configured in environment variables.');
    return NextResponse.json({ error: 'Payment processing not configured' }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  let body: string;
  try {
    body = await request.text();
    logger.info('Raw webhook body received.');
  } catch (e) {
    logger.error('Error reading request body', e);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Verify the webhook signature from Paystack
  const signature = request.headers.get('x-paystack-signature');
  if (!signature) {
    logger.warn('Missing x-paystack-signature header');
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }
  
  const hash = crypto.createHmac('sha512', paystackSecretKey).update(body).digest('hex');
  if (hash !== signature) {
    logger.warn('Signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  logger.info('Signature verified successfully.');

  let payload: PaystackWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch (e) {
    logger.error('JSON parsing error', e);
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  // Process only successful charges
  if (payload.event !== 'charge.success') {
    logger.warn(`Unhandled event type: ${payload.event}`);
    return NextResponse.json({ status: 'ignored', event: payload.event }, { status: 200 });
  }
  
  logger.info('Processing charge.success event');
  
  const { metadata, amount, reference, paid_at } = payload.data;

  // Handle a donation payment if specified in metadata
  if (metadata?.donation === "true") {
    logger.info(`Donation received: ${amount / 100} GHS. Skipping fee payment record.`);
    return NextResponse.json({ status: 'success', message: 'Donation processed' });
  }
  
  // Validate required metadata for a fee payment
  if (!metadata?.student_id_display) {
    logger.error('Missing student_id_display in webhook metadata', metadata);
    return NextResponse.json({ error: 'Missing student identifier in payment metadata' }, { status: 400 });
  }

  const paymentIdDisplay = `PS-${reference}`;

  // Check for duplicate payment to prevent double recording
  try {
    const { data: existingPayment, error: checkError } = await supabaseAdmin
      .from('fee_payments')
      .select('id')
      .eq('payment_id_display', paymentIdDisplay)
      .maybeSingle();

    if (checkError) {
      logger.error('Error checking for duplicate payment', checkError);
      // Decide if to proceed or not, for now, we will proceed but log the error
    }

    if (existingPayment) {
      logger.warn(`Duplicate payment detected: ${paymentIdDisplay}. Ignoring.`);
      return NextResponse.json({ status: 'success', message: 'Duplicate ignored' });
    }
  } catch (e) {
    logger.error('Unexpected error during duplicate check', e);
  }

  // Prepare the data for insertion into the database
  const paymentData = {
    payment_id_display: paymentIdDisplay,
    student_id_display: metadata.student_id_display,
    student_name: metadata.student_name || 'Online Payer',
    grade_level: metadata.grade_level || 'N/A',
    amount_paid: amount / 100, // Convert from pesewas to GHS
    payment_date: format(new Date(paid_at), 'yyyy-MM-dd'),
    payment_method: 'Paystack (Webhook)',
    term_paid_for: 'Online Payment',
    notes: `Online payment via Paystack | Ref: ${reference}`,
    received_by_name: 'Paystack Gateway',
  };

  logger.info('Prepared payment data for insertion:', paymentData);

  // Insert the payment record into the database
  try {
    const { error: insertError } = await supabaseAdmin
      .from('fee_payments')
      .insert([paymentData]);
    
    if (insertError) {
      logger.error('Database insert error', { message: insertError.message, details: insertError.details, code: insertError.code });
      return NextResponse.json({ error: 'Failed to save payment', details: insertError.message }, { status: 500 });
    }

    logger.info('Payment successfully saved to database');
    return NextResponse.json({ status: 'success', payment_id: paymentData.payment_id_display });
    
  } catch (unexpectedError) {
    logger.error('Unexpected error during insert operation', unexpectedError);
    return NextResponse.json({ error: 'Unexpected server error during database operation' }, { status: 500 });
  }
}

// GET endpoint remains for simple health checks
export async function GET(request: Request) {
  return NextResponse.json({
    status: 'active',
    message: 'Paystack webhook endpoint is operational.',
    environment: {
      supabase_url_configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      paystack_secret_key_configured: !!process.env.PAYSTACK_SECRET_KEY,
    }
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

/**
 * Stripe webhook handler
 * Handles payment notifications from Stripe
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Get webhook secret from platform configuration
    const supabase = createClient();
    const { data: config } = await supabase
      .from('platform_configuration')
      .select('stripe_webhook_secret, stripe_secret_key')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!config?.stripe_webhook_secret || !config?.stripe_secret_key) {
      console.error('Stripe configuration not found');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 });
    }

    // Initialize Stripe with secret key
    const stripe = new Stripe(config.stripe_secret_key, {
      apiVersion: '2025-08-27.basil',
    });

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        config.stripe_webhook_secret
      );
    } catch (err) {
      console.error('Stripe webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Stripe webhook event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer);
        break;
      
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;
      
      default:
        console.log('Unhandled Stripe event:', event.type);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

/**
 * Handle successful payment intent from Stripe
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const supabase = createClient();
    
    const {
      id,
      amount,
      currency,
      customer,
      metadata,
      created,
      application_fee_amount
    } = paymentIntent;

    // Convert amount from cents to dollars/euros etc
    const actualAmount = amount / 100;
    const platformFee = (application_fee_amount || 0) / 100;
    const studentId = metadata?.student_id;
    const schoolId = metadata?.school_id;
    const reference = metadata?.reference || id;

    if (!studentId || !schoolId) {
      console.error('Missing required metadata in Stripe payment:', { id, metadata });
      return;
    }

    // Record the payment transaction
    const { error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        reference,
        student_id: parseInt(studentId),
        school_id: parseInt(schoolId),
        amount: actualAmount,
        platform_fee: platformFee,
        currency: currency.toUpperCase(),
        gateway: 'stripe',
        status: 'completed',
        gateway_response: paymentIntent,
        processed_at: new Date(created * 1000),
        created_at: new Date()
      });

    if (transactionError) {
      console.error('Error recording Stripe payment transaction:', transactionError);
      return;
    }

    // Update fee payment record
    const { error: feeError } = await supabase
      .from('fee_payments')
      .insert({
        student_id: parseInt(studentId),
        amount_paid: actualAmount - platformFee, // School receives amount minus platform fee
        payment_method: 'stripe',
        payment_reference: reference,
        payment_date: new Date(created * 1000),
        status: 'completed',
        gateway_fees: platformFee,
        created_at: new Date()
      });

    if (feeError) {
      console.error('Error updating Stripe fee payment:', feeError);
    }

    // Update platform revenue
    await updatePlatformRevenue(platformFee, currency.toUpperCase(), 'stripe');

    console.log(`Stripe payment processed successfully: ${reference} - ${currency.toUpperCase()}${actualAmount}`);

  } catch (error) {
    console.error('Error handling successful Stripe payment:', error);
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const supabase = createClient();
    
    const { id, metadata, created } = paymentIntent;
    const studentId = metadata?.student_id;
    const schoolId = metadata?.school_id;
    const reference = metadata?.reference || id;

    if (!studentId || !schoolId) {
      console.error('Missing required metadata in failed Stripe payment:', { id, metadata });
      return;
    }

    // Record the failed transaction
    const { error } = await supabase
      .from('payment_transactions')
      .insert({
        reference,
        student_id: parseInt(studentId),
        school_id: parseInt(schoolId),
        amount: 0,
        platform_fee: 0,
        currency: 'USD',
        gateway: 'stripe',
        status: 'failed',
        gateway_response: paymentIntent,
        processed_at: new Date(created * 1000),
        created_at: new Date()
      });

    if (error) {
      console.error('Error recording failed Stripe payment:', error);
    }

    console.log(`Stripe payment failed: ${reference}`);

  } catch (error) {
    console.error('Error handling failed Stripe payment:', error);
  }
}

/**
 * Handle transfer creation (when funds are sent to school accounts)
 */
async function handleTransferCreated(transfer: Stripe.Transfer) {
  try {
    console.log(`Stripe transfer created: ${transfer.id} - ${transfer.currency}${transfer.amount / 100}`);
    // Update transfer status in database
    // This would track when schools receive their portion of payments
  } catch (error) {
    console.error('Error handling Stripe transfer creation:', error);
  }
}

/**
 * Handle account updates (when schools update their connected accounts)
 */
async function handleAccountUpdated(account: Stripe.Account) {
  try {
    console.log(`Stripe account updated: ${account.id}`);
    // Update school account status in database
  } catch (error) {
    console.error('Error handling Stripe account update:', error);
  }
}

/**
 * Update platform revenue tracking
 */
async function updatePlatformRevenue(amount: number, currency: string, gateway: string) {
  try {
    const supabase = createClient();
    
    // Update or insert platform revenue record for the current month
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    const { error } = await supabase
      .from('platform_revenue')
      .upsert({
        month: currentMonth,
        total_revenue: amount,
        currency,
        gateway,
        updated_at: new Date()
      }, {
        onConflict: 'month,currency,gateway',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Error updating platform revenue:', error);
    }

  } catch (error) {
    console.error('Error in updatePlatformRevenue:', error);
  }
}

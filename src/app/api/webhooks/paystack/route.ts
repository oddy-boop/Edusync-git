
import { NextResponse } from 'next/server';

// ==================================================================
// DEPRECATION NOTICE - v4.0.0
// ==================================================================
// This webhook endpoint is officially deprecated and is no longer
// used by the application for processing payments. The payment
// verification logic has been moved to a secure server action
// triggered by the client in `src/lib/actions/payment.actions.ts`.
//
// This file is kept in place to handle any old webhook configurations
// from Paystack and to prevent them from causing errors. It will
// simply acknowledge the request and take no further action.
//
// You can safely delete any webhook URLs in your Paystack dashboard
// that point to this endpoint.
// ==================================================================

export async function POST(request: Request) {
  try {
    // Acknowledge the request immediately to prevent Paystack from retrying.
    const body = await request.text(); // Consume the body to be polite
    console.log('[DEPRECATED_WEBHOOK] Received a webhook call from Paystack. Acknowledging and ignoring. Request body length:', body.length);
    
    return NextResponse.json({ status: 'ignored', message: 'This webhook is deprecated and no longer processed.' });
  } catch (error) {
    console.error('[DEPRECATED_WEBHOOK] Error while consuming deprecated webhook body:', error);
    return NextResponse.json({ status: 'error', message: 'Error processing deprecated webhook.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return NextResponse.json({
    status: 'deprecated',
    message: 'This Paystack webhook endpoint is no longer in use. Please use the client-side verification flow.',
  });
}


import { NextResponse } from 'next/server';

// ==================================================================
// Informational Webhook Endpoint for Twilio
// ==================================================================
// This endpoint exists to satisfy Twilio's requirement for a webhook
// URL in its Messaging Service configuration. The EduSync application
// is designed for ONE-WAY SMS announcements (outbound only) and does
// not process incoming messages or replies.
//
// Any request sent here by Twilio will be acknowledged with a success
// message, but no further action will be taken.
// ==================================================================

export async function POST(request: Request) {
  try {
    const body = await request.text(); // Consume the body to be polite
    console.log('[TWILIO_WEBHOOK] Received an informational webhook call from Twilio. Acknowledging and ignoring. Request body length:', body.length);
    
    // Acknowledge the request immediately with an empty TwiML response
    // to signal that no further action should be taken.
    const response = new NextResponse('<Response/>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
    return response;

  } catch (error) {
    console.error('[TWILIO_WEBHOOK] Error while processing informational webhook:', error);
    return new NextResponse('<Response><Message>Error processing webhook.</Message></Response>', {
        status: 500,
        headers: { 'Content-Type': 'text/xml' },
    });
  }
}

export async function GET(request: Request) {
  return NextResponse.json({
    status: 'ok',
    message: 'This is the Twilio webhook endpoint for the EduSync application. It is for one-way messaging and does not process incoming requests.',
  });
}

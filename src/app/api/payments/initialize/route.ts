import { NextRequest, NextResponse } from 'next/server';
import { initializePayment, PaymentRequest } from '@/lib/actions/payment-gateway.actions';

export async function POST(request: NextRequest) {
  try {
    const body: PaymentRequest = await request.json();

    // Validate required fields
    const requiredFields = ['amount', 'currency', 'email', 'studentId', 'schoolId', 'feeType', 'reference', 'gateway'];
    const missingFields = requiredFields.filter(field => !body[field as keyof PaymentRequest]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Validate gateway
    if (!['paystack', 'stripe'].includes(body.gateway)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid payment gateway. Must be either "paystack" or "stripe"' 
        },
        { status: 400 }
      );
    }

    // Validate amount
    if (body.amount <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Amount must be greater than 0' 
        },
        { status: 400 }
      );
    }

    // Initialize payment
    const result = await initializePayment(body);

    if (result.success) {
      return NextResponse.json({
        success: true,
        authorizationUrl: result.authorizationUrl,
        reference: result.reference,
        gateway: result.gateway
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Payment initialization failed' 
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Payment initialization API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getPaymentAnalytics } from '@/lib/actions/payment-analytics.actions';

export async function GET() {
  try {
    const result = await getPaymentAnalytics();
    
    if (!result.success) {
      const status = result.message === 'Authentication required' ? 401 : 
                    result.message === 'Super admin access required' ? 403 : 500;
      return NextResponse.json({ success: false, message: result.message }, { status });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Payment analytics API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

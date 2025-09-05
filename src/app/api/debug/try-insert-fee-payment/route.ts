import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

// WARNING: This route performs a transient insert and delete for diagnostic purposes.
// It will attempt to insert a tiny payment row and then delete it. Use only in secure environments.
export async function POST(req: Request) {
  try {
    if (process.env.ADMIN_DEBUG !== 'true') {
      return new Response('Not Found', { status: 404 });
    }
    const svc = createClient();

    // Minimal test payload
    const now = new Date();
    const paymentId = `DIAG-${Date.now()}`;
    const payload = {
      school_id: 3,
      payment_id_display: paymentId,
      student_id_display: '25STD2630',
      student_name: 'DIAGNOSTIC TEST',
      amount_paid: 0.01,
      payment_date: format(now, 'yyyy-MM-dd'),
      payment_method: 'debug',
      term_paid_for: 'debug',
      notes: 'diagnostic insert test',
      received_by_name: 'diagnostic',
      received_by_user_id: null,
    };

    const { data: insertData, error: insertError } = await svc.from('fee_payments').insert(payload).select('id').limit(1).single();
    if (insertError) {
      return NextResponse.json({ success: false, insertError: { code: insertError?.code, message: insertError?.message, details: insertError?.details } }, { status: 400 });
    }

    const insertedId = (insertData as any)?.id;
    // Attempt cleanup - delete the diagnostic row
    try {
      await svc.from('fee_payments').delete().eq('id', insertedId);
    } catch (e) {
      // ignore cleanup errors
    }

    return NextResponse.json({ success: true, insertedId });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

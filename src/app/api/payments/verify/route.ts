import { NextResponse } from 'next/server';
import { verifyPaystackTransaction } from '@/lib/actions/payment.actions';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reference, userId, userEmail } = body;
    if (!reference || (!userId && !userEmail)) return NextResponse.json({ success: false, message: 'reference and either userId or userEmail required' }, { status: 400 });

    let resolvedUserId = userId;
    if (!resolvedUserId && userEmail) {
      // Resolve auth_user_id from students table by contact_email
      const svc = createClient();
      try {
        const { data: studentRow, error: studentError } = await svc.from('students').select('auth_user_id').eq('contact_email', userEmail).maybeSingle();
        if (studentError) {
          return NextResponse.json({ success: false, message: 'Could not resolve user by email', details: studentError.message }, { status: 400 });
        }
        if (!studentRow?.auth_user_id) {
          return NextResponse.json({ success: false, message: 'No student found with that email' }, { status: 404 });
        }
        resolvedUserId = studentRow.auth_user_id;
      } catch (e: any) {
        return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
      }
    }

    const result = await verifyPaystackTransaction({ reference, userId: resolvedUserId! });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}

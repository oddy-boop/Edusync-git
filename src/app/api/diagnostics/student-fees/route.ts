import { NextResponse } from 'next/server';
import { createClient, createAuthClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Auth client uses incoming cookies to resolve the caller's user
    const authClient = createAuthClient();
    const { data: getUserData, error: getUserError }: { data: any; error: any } = await authClient.auth.getUser();
    if (getUserError) return NextResponse.json({ error: 'Could not resolve user from cookies', details: getUserError.message }, { status: 401 });
    const user = getUserData?.user;
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // Service client uses the service role key and will bypass RLS so we can compare results
    const svc = createClient();

    const { data: student, error: studentError } = await svc
      .from('students')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    const studentSchoolId = (student as any)?.school_id ?? null;
    const studentIdDisplay = (student as any)?.student_id_display ?? null;

    const { data: schoolSettings, error: schoolSettingsError } = studentSchoolId
      ? await svc.from('schools').select('current_academic_year').eq('id', studentSchoolId).maybeSingle()
      : { data: null, error: null };

    const { data: feeItems, error: feeItemsError } = studentSchoolId
      ? await svc.from('school_fee_items').select('*').eq('school_id', studentSchoolId).limit(500)
      : { data: null, error: null };

    // Also return a recent global sample and counts to help detect misplaced or mis-tagged rows
    let recentFeeItems: any = null;
    let recentFeeItemsError: any = null;
    try {
      const res = await svc
        .from('school_fee_items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      recentFeeItems = res.data;
      recentFeeItemsError = res.error ?? null;
    } catch (err: any) {
      recentFeeItems = null;
      recentFeeItemsError = err?.message ?? String(err);
    }

    let allFeeItemsRaw: any = null;
    let allFeeItemsError: any = null;
    try {
      const res2 = await svc
        .from('school_fee_items')
        .select('*')
        .limit(1000);
      allFeeItemsRaw = res2.data;
      allFeeItemsError = res2.error ?? null;
    } catch (err: any) {
      allFeeItemsRaw = null;
      allFeeItemsError = err?.message ?? String(err);
    }

    const feeItemsCountTotal = Array.isArray(allFeeItemsRaw) ? allFeeItemsRaw.length : 0;
    const feeItemsCountForSchool = Array.isArray(allFeeItemsRaw) && studentSchoolId
      ? allFeeItemsRaw.filter((r: any) => Number(r.school_id) === Number(studentSchoolId)).length
      : 0;

    const { data: payments, error: paymentsError } = studentIdDisplay
      ? await svc.from('fee_payments').select('*').eq('student_id_display', studentIdDisplay).order('payment_date', { ascending: false }).limit(500)
      : { data: null, error: null };

    const { data: arrears, error: arrearsError } = studentIdDisplay
      ? await svc.from('student_arrears').select('*').eq('student_id_display', studentIdDisplay).limit(200)
      : { data: null, error: null };

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      student,
      schoolSettings,
  feeItems,
  recentFeeItems,
  feeItemsCountTotal,
  feeItemsCountForSchool,
      payments,
      arrears,
      errors: {
        getUserError: getUserError?.message ?? null,
        studentError: (studentError as any)?.message ?? null,
        schoolSettingsError: (schoolSettingsError as any)?.message ?? null,
  feeItemsError: (feeItemsError as any)?.message ?? null,
  recentFeeItemsError: (recentFeeItemsError as any)?.message ?? null,
  allFeeItemsError: (allFeeItemsError as any)?.message ?? null,
        paymentsError: (paymentsError as any)?.message ?? null,
        arrearsError: (arrearsError as any)?.message ?? null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient, createAuthClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const schoolId = url.searchParams.get('schoolId');
    if (!schoolId) return NextResponse.json({ data: null, error: 'Missing schoolId' }, { status: 400 });

    const supabase = createClient();
    const { data, error } = await supabase
      .from('school_fees')
      .select('id, grade_level, term, description, base_amount, platform_fee, total_amount, academic_year, created_at, updated_at')
      .eq('school_id', schoolId)
      .order('academic_year', { ascending: false })
      .order('grade_level', { ascending: true })
      .order('term', { ascending: true })
      .order('description', { ascending: true });

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err?.message ?? String(err) }, { status: 500 });
  }
}

async function verifyAdmin(req: Request) {
  try {
    const supabaseAuth = createAuthClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return { ok: false, status: 401, message: 'Authentication required' };

    const { data: role } = await supabaseAuth
      .from('user_roles')
      .select('role, school_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!role) return { ok: false, status: 403, message: 'User role not found' };
    // allow super_admin or admin for the same school
    return { ok: true, role };
  } catch (err: any) {
    return { ok: false, status: 500, message: err?.message ?? String(err) };
  }
}

export async function POST(req: Request) {
  // create fee
  try {
    const verification = await verifyAdmin(req);
    if (!verification.ok) return NextResponse.json({ error: verification.message }, { status: verification.status });

    const body = await req.json();
    const { schoolId, gradeLevel, term, description, base_amount, platform_fee, academic_year } = body;
    if (!schoolId || !gradeLevel || !term || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient();
    const { error } = await supabase.from('school_fees').insert({
      school_id: schoolId,
      grade_level: gradeLevel,
      term,
      description,
      base_amount: base_amount ?? 0,
      platform_fee: platform_fee ?? 0,
      academic_year,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const verification = await verifyAdmin(req);
    if (!verification.ok) return NextResponse.json({ error: verification.message }, { status: verification.status });

    const body = await req.json();
    const { id, updates } = body;
    if (!id || !updates) return NextResponse.json({ error: 'Missing id or updates' }, { status: 400 });

    const supabase = createClient();
    const { error } = await supabase.from('school_fees').update(updates).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const verification = await verifyAdmin(req);
    if (!verification.ok) return NextResponse.json({ error: verification.message }, { status: verification.status });

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const supabase = createClient();
    const { error } = await supabase.from('school_fees').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

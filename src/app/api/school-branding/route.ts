import { NextResponse } from 'next/server';
import { getSchoolSettings } from '@/lib/actions/settings.actions';
import { createClient } from '@/lib/supabase/server';
import { resolveAssetUrl } from '@/lib/supabase/storage.server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (id) {
      // Fetch specific school by id and resolve its logo_url to a public URL
      const supabase = createClient();
      const { data: school, error } = await supabase.from('schools').select('*').eq('id', Number(id)).maybeSingle();
      if (error && error.code !== 'PGRST116') {
        return NextResponse.json({ data: null, error: error.message }, { status: 500 });
      }
      if (!school) {
        return NextResponse.json({ data: null, error: 'School not found' }, { status: 404 });
      }
      try {
        if (school?.logo_url) {
          const resolved = await resolveAssetUrl(school.logo_url);
          (school as any).school_logo_url = resolved ?? school.logo_url;
        } else {
          (school as any).school_logo_url = school.logo_url ?? null;
        }
      } catch (e) {
        (school as any).school_logo_url = school.logo_url ?? null;
      }
      return NextResponse.json({ data: school, error: null });
    }

    const result = await getSchoolSettings();
    // result shape: { data, error }
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err?.message ?? String(err) }, { status: 500 });
  }
}

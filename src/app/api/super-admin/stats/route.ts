import { NextResponse } from 'next/server';
import { getSuperAdminStats } from '@/lib/actions/superAdmin.actions';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const debug = url.searchParams.get('debug') === '1';

  const result = await getSuperAdminStats();
  if (!result.success) {
    const status = result.message === 'Unauthorized' ? 401 : result.message === 'Forbidden' ? 403 : 500;
    const body = debug ? { ...result } : { success: false, message: result.message };
    return NextResponse.json(body, { status });
  }

  const body = debug ? { ...result } : { success: true, data: result.data };
  return NextResponse.json(body);
}

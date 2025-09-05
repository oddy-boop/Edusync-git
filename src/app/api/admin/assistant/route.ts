import { NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { generateAssistantResponse } from '@/ai/flows/assistant-flow';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = String(body?.prompt || '');

    if (!prompt.trim()) {
      return NextResponse.json({ error: 'Empty prompt' }, { status: 400 });
    }

    // Create an auth-aware server client so we can resolve the caller and also
    // optionally persist logs with a service role key if needed.
    const supabase = createAuthClient();

    // Resolve caller information (if any)
    const { data: { user } } = await supabase.auth.getUser();

    // Generate assistant response using existing flow
    const text = await generateAssistantResponse(prompt);

    // Try to log the interaction (best-effort). If logging fails, continue.
    try {
      // Use a service-role client for safe logging to avoid RLS issues if present.
      const svc = (await import('@/lib/supabase/server')).createClient();
      await svc.from('assistant_logs').insert({
        user_id: user?.id ?? null,
        prompt,
        response: text,
      });
    } catch (e) {
      // swallow logging errors — assistant should still work.
      console.warn('assistant: failed to persist log', e);
    }

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error('assistant route error', err);
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}

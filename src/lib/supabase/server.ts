/**
 * @fileOverview Supabase client for server-side usage (Server Actions, Route Handlers).
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookie = await (await cookieStore).get(name);
          return cookie?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            (await cookieStore).set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            (await cookieStore).set({ name, value: '', ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

// Create a Supabase client that will use the browser/anon key and
// propagate the incoming cookies so server actions can resolve the
// current authenticated user session. Use this when you need to call
// auth.getUser() based on the caller's session.
export function createAuthClient() {
  const cookieStore = cookies();

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY for createAuthClient.');
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey,
    {
      cookies: {
        async get(name: string) {
          const store = await cookieStore;
          // Try the exact requested name first
          const exact = store.get(name);
          if (exact?.value) return exact.value;

          // Fallback: some environments / helper libraries write cookies
          // with names that don't match the canonical names the SSR client
          // asks for. Search known patterns (e.g. names containing
          // 'auth-token', 'supabase' or 'sb-') and return the first match.
          try {
            const all = store.getAll();
            const candidate = all.find((c) => {
              const n = String(c?.name || '').toLowerCase();
              return n.includes('auth-token') || n.includes('supabase') || n.startsWith('sb-');
            });
            if (candidate?.value) return candidate.value;
          } catch (e) {
            // ignore and fall through
          }

          return undefined;
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            (await cookieStore).set({ name, value, ...options });
          } catch (error) {
            // ignore when called from server component
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            (await cookieStore).set({ name, value: '', ...options });
          } catch (error) {
            // ignore when called from server component
          }
        },
      },
    }
  );
}

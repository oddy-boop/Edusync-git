
// DEPRECATED: This file is no longer in use.
// Please use the new client/server specific creation functions.
// `src/lib/supabase/client.ts` for browser usage.
// `src/lib/supabase/server.ts` for server-side usage.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// This implementation is left for reference but should not be imported.
let supabaseInstance: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL or Anon Key not configured.");
  }
  supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!);
  return supabaseInstance;
}


import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || supabaseUrl.includes("YOUR_SUPABASE_PROJECT_URL")) {
    const errorMessage = "Supabase URL is not configured correctly. Please update the NEXT_PUBLIC_SUPABASE_URL in your .env file with your actual project URL and restart the server.";
    console.error(`FATAL: ${errorMessage}`);
    throw new Error(errorMessage);
  }
  if (!supabaseAnonKey || supabaseAnonKey.includes("YOUR_SUPABASE_ANON_KEY")) {
    const errorMessage = "Supabase Anon Key is not configured correctly. Please update the NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file with your actual project key and restart the server.";
    console.error(`FATAL: ${errorMessage}`);
    throw new Error(errorMessage);
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return supabaseInstance;
}

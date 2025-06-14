
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL is not defined. Check your .env file and ensure your Next.js server was restarted.");
    throw new Error("Supabase URL is not defined. Please check your .env file for NEXT_PUBLIC_SUPABASE_URL and ensure the server was restarted.");
  }
  if (!supabaseAnonKey) {
    console.error("ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined. Check your .env file and ensure your Next.js server was restarted.");
    throw new Error("Supabase anon key is not defined. Please check your .env file for NEXT_PUBLIC_SUPABASE_ANON_KEY and ensure the server was restarted.");
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}

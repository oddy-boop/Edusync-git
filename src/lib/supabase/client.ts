
import { createBrowserClient } from '@supabase/ssr'

// Note: The `createBrowserClient` function is now imported from `@supabase/ssr`
// It is the recommended way to use Supabase in client components.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

import { createClient } from "@/lib/supabase/server";

/**
 * Resolve an asset path or URL to a public URL from Supabase Storage.
 * - If the value is already an absolute URL (http/https) it is returned as-is.
 * - Otherwise, the value is treated as an object path inside the given bucket
 *   and getPublicUrl is used to build the public URL.
 *
 * Note: This assumes the bucket is public. For private buckets you'd call
 * createSignedUrl on the server instead.
 */
export async function resolveAssetUrl(path: string | null | undefined, bucket = 'school-assets'): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const supabase = createClient();
  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch (e) {
    console.error('resolveAssetUrl error:', e);
    return null;
  }
}

'use server'

import { revalidatePath } from 'next/cache'

/**
 * Revalidates the cache for the main public-facing website pages.
 * This should be called whenever the data in `app_settings` is changed.
 */
export async function revalidateWebsitePages(): Promise<{ success: boolean }> {
  try {
    revalidatePath('/')
    revalidatePath('/about')
    revalidatePath('/contact')
    revalidatePath('/admissions') // Revalidate this as well, just in case.
    console.log("Revalidated paths: /, /about, /contact, /admissions");
    return { success: true };
  } catch (error) {
    console.error("Failed to revalidate website pages:", error);
    return { success: false };
  }
}

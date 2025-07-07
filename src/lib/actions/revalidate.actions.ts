'use server'

import { revalidatePath } from 'next/cache'

/**
 * Revalidates the cache for all main public-facing website pages.
 * This should be called whenever the data in `app_settings` is changed.
 */
export async function revalidateWebsitePages(): Promise<{ success: boolean }> {
  try {
    // Revalidate all pages that pull data from app_settings
    revalidatePath('/')
    revalidatePath('/about')
    revalidatePath('/admissions')
    revalidatePath('/programs')
    revalidatePath('/contact')
    
    console.log("Revalidated paths: /, /about, /admissions, /programs, /contact");
    return { success: true };
  } catch (error) {
    console.error("Failed to revalidate website pages:", error);
    return { success: false };
  }
}


'use server'

import { revalidatePath } from 'next/cache'

/**
 * Revalidates the cache for all main public-facing website pages.
 * This should be called whenever the data in `app_settings` is changed.
 */
export async function revalidateWebsitePages(): Promise<{ success: boolean }> {
  try {
    revalidatePath('/', 'layout'); // Revalidate all pages using the layout
    console.log("Revalidated all public paths via layout revalidation.");
    return { success: true };
  } catch (error) {
    console.error("Failed to revalidate website pages:", error);
    return { success: false };
  }
}

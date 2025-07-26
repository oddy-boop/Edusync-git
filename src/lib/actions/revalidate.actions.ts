
'use server'

import { revalidatePath } from 'next/cache'

/**
 * Revalidates the cache for all main public-facing website pages.
 * This should be called whenever the data in `app_settings` is changed.
 */
export async function revalidateWebsitePages(): Promise<{ success: boolean }> {
  try {
    revalidatePath('/'); // Revalidate Home page
    revalidatePath('/about'); // Revalidate About Us page
    revalidatePath('/programs'); // Revalidate Programs page
    revalidatePath('/contact'); // Revalidate Contact Us page
    console.log("Revalidated Home, About Us, Programs, and Contact Us pages.");
    return { success: true };
  } catch (error) {
    console.error("Failed to revalidate website pages:", error);
    return { success: false };
  }
}

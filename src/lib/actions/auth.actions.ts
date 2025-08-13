
'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { headers } from 'next/headers';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

type ActionResponse = {
  success: boolean;
  message: string;
};

// This function does not log the user in. It sends the reset email.
export async function sendPasswordResetAction(
  values: z.infer<typeof forgotPasswordSchema>
): Promise<ActionResponse> {
  const supabase = createClient();
  const { email } = values;
  const lowerCaseEmail = email.toLowerCase();
  
  const headersList = headers();
  const siteUrl = headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(lowerCaseEmail, {
        redirectTo: `${siteUrl}/auth/update-password`,
    });

    if (error) {
        console.error("Password Reset Error:", error);
        // Do not reveal if an email exists for security reasons.
        // The message is the same for success and "user not found" errors.
        if(error.message.includes("user not found")) {
            return { success: true, message: "If an account with this email exists, a password reset link has been sent." };
        }
        return { success: false, message: `Could not send reset link: ${error.message}` };
    }

    return { success: true, message: "If an account with this email exists, a password reset link has been sent." };

  } catch (error: any) {
    console.error('Password Reset Action Error:', error);
    return { success: false, message: 'An unexpected server error occurred.' };
  }
}

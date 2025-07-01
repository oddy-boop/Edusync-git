
'use server';

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const formSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
});

export async function registerAdminAction(
  prevState: any,
  formData: FormData
): Promise<{
  success: boolean;
  message: string;
  errors?: z.ZodIssue[];
}> {
  const validatedFields = formSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    const errorMessages = Object.values(validatedFields.error.flatten().fieldErrors)
      .flat()
      .join(' ');
    return {
      success: false,
      message: `Validation failed: ${errorMessages}`,
      errors: validatedFields.error.issues,
    };
  }
  
  const { fullName, email } = validatedFields.data;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Admin Registration Error: Supabase credentials are not configured.");
    return { success: false, message: "Server configuration error for database. Cannot process registration." };
  }
  
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { data: { full_name: fullName, role: 'admin' } }
    );

    if (error) {
      // Check for a specific error indicating the user already exists
      if (error.message.includes('User already registered')) {
        return { success: false, message: `An account with the email ${email} already exists.` };
      }
      throw error;
    }

    return { success: true, message: `An invitation has been sent to ${email}. They will need to click the link in the email to set their password and complete the registration.` };

  } catch (error: any) {
    console.error('Admin Registration Action Error:', error);
    return {
      success: false,
      message: error.message || 'An unexpected server error occurred during registration.',
    };
  }
}

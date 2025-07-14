'use server';

import { z } from 'zod';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const formSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  schoolId: z.string().uuid("School ID is missing or invalid."),
});

type ActionResponse = {
  success: boolean;
  message: string;
  errors?: z.ZodIssue[];
  temporaryPassword?: string | null;
};

export async function registerAdminAction(
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // Validate environment variables
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Missing Supabase configuration");
    return { success: false, message: "Server configuration error" };
  }

  try {
    // Verify creator session and permissions
    const { data: { user: creatorUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !creatorUser) {
      console.error('Session error:', authError);
      return { success: false, message: "Authentication Error: Please log in again." };
    }

    // Check creator permissions
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role, school_id')
      .eq('user_id', creatorUser.id)
      .single();

    if (roleError || !roleData || !['admin', 'super_admin'].includes(roleData.role)) {
      return { success: false, message: "Permission Denied: Administrator access required." };
    }

    // Validate form data
    const validatedFields = formSchema.safeParse({
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      schoolId: formData.get('schoolId'),
    });

    if (!validatedFields.success) {
      const errorMessages = Object.values(validatedFields.error.flatten().fieldErrors)
        .flat()
        .join(' ');
      return { success: false, message: `Validation failed: ${errorMessages}` };
    }

    const { fullName, email, schoolId } = validatedFields.data;
    const lowerCaseEmail = email.toLowerCase();

    // Verify school permissions
    if (roleData.role === 'admin' && roleData.school_id !== schoolId) {
      return { success: false, message: "Permission Denied: You can only create administrators for your own school." };
    }

    // Create admin client
    const supabaseAdmin = createServerClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check for existing user
    const { data: existingUser } = await supabaseAdmin
      .from('auth.users')
      .select('id')
      .eq('email', lowerCaseEmail)
      .maybeSingle();

    if (existingUser) {
      return { success: false, message: `User ${lowerCaseEmail} already exists.` };
    }

    // Invite new admin
    const redirectTo = `${siteUrl}/auth/update-password`;
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      lowerCaseEmail,
      { 
        data: { full_name: fullName, role: 'admin' },
        redirectTo,
      }
    );

    if (error || !data.user) {
      throw error || new Error("User invitation failed");
    }

    // Assign admin role with retry
    const roleAssigned = await assignAdminRole(data.user.id, schoolId);
    if (!roleAssigned) {
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      return { success: false, message: "Failed to assign admin role." };
    }

    return {
      success: true,
      message: `Invitation sent to ${lowerCaseEmail}. They must set their password via the email link.`,
    };

  } catch (error: any) {
    console.error('Admin registration error:', error);
    return {
      success: false,
      message: error.message.includes('already registered') 
        ? `User already exists.` 
        : 'Registration failed. Please try again.',
    };
  }
}

// Helper function with retry logic
async function assignAdminRole(userId: string, schoolId: string): Promise<boolean> {
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await supabaseAdmin
      .from('user_roles')
      .upsert({ 
        user_id: userId, 
        role: 'admin', 
        school_id: schoolId 
      }, { 
        onConflict: 'user_id' 
      });

    if (!error) return true;
    await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
  }
  return false;
}
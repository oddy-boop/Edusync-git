
'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

const registerAccountantSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
});

type ActionResponse = {
  success: boolean;
  message: string;
  errors?: z.ZodIssue[];
  temporaryPassword?: string | null;
  inviteMeta?: { userId?: string | null; email?: string | null };
};

// This action is for an already logged-in admin to invite an accountant
export async function registerAccountantAction(
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = createClient();
  const { data: { user: adminUser } } = await supabase.auth.getUser();

  if (!adminUser) {
    return { success: false, message: "Unauthorized: You must be logged in as an administrator." };
  }

  const { data: adminRole } = await supabase.from('user_roles').select('role, school_id').eq('user_id', adminUser.id).single();
  if (!adminRole || (adminRole.role !== 'admin' && adminRole.role !== 'super_admin')) {
      return { success: false, message: "Unauthorized: You do not have permission to register accountants." };
  }
  if (!adminRole.school_id) {
    return { success: false, message: "Action Failed: Your admin account is not associated with a specific school branch." };
  }
  
  const validatedFields = registerAccountantSchema.safeParse({
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
  const lowerCaseEmail = email.toLowerCase();
  
  try {
    // First try the RPC which may be present in some deployments for a single lookup.
    let existingUser: any = null;
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_user_by_email', { p_email: lowerCaseEmail });
      if (rpcError) {
        console.warn('admin_get_user_by_email rpc failed or is not present; falling back to auth.admin.getUserByEmail', rpcError?.message ?? rpcError);
      } else if (rpcData) {
        existingUser = rpcData;
      }
    } catch (rpcEx) {
      console.warn('admin_get_user_by_email rpc threw, falling back to auth.admin.getUserByEmail', rpcEx);
    }

    // Fallback: use Supabase Admin API to check for an existing auth user by email.
    if (!existingUser) {
      try {
        // Fall back to listing users and finding an exact email match.
        const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
          console.warn('auth.admin.listUsers failed while checking existing user:', listError?.message ?? listError);
        } else if (listData?.users && listData.users.length > 0) {
          const found = listData.users.find((u: any) => u.email?.toLowerCase() === lowerCaseEmail);
          if (found) existingUser = found;
        }
      } catch (authEx) {
        console.warn('auth.admin.listUsers threw an error:', authEx);
      }
    }

    if (existingUser) {
      throw new Error(`An account with the email ${lowerCaseEmail} already exists.`);
    }
  const headersList = await headers();
  const siteUrl = headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    lowerCaseEmail,
    { data: { full_name: fullName }, redirectTo: `${siteUrl}/auth/update-password` }
  );
  if (inviteError) throw inviteError;
  // Log invite response for debugging delivery issues
  console.info('accountant inviteData:', { ok: true, email: lowerCaseEmail, inviteData: { userId: inviteData?.user?.id, user: inviteData?.user?.email } });
  const newUserId = inviteData.user.id;
    
    const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: newUserId, role: 'accountant', school_id: adminRole.school_id });

    if(roleError) throw roleError;
    
    const successMessage = `Invitation sent to ${lowerCaseEmail}. They must check their email to complete registration.`;

    return {
        success: true,
        message: successMessage,
        temporaryPassword: null, // Supabase handles the password setup
        inviteMeta: {
          userId: inviteData?.user?.id ?? null,
          email: inviteData?.user?.email ?? lowerCaseEmail,
        }
    };

  } catch (error: any) {
    console.error('Accountant Registration Action Error:', error);
    return { success: false, message: error.message || 'An unexpected server error occurred during registration.' };
  }
}

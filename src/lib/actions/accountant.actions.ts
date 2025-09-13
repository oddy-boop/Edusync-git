
'use server';

import { z } from 'zod';
import { createClient, createAuthClient } from '@/lib/supabase/server';
import { headers, cookies } from 'next/headers';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

const registerAccountantSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  phone: z.string().optional(),
});

const updateAccountantSchema = z.object({
  fullName: z.string().min(3),
  phone: z.string().optional(),
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
  // Use an auth client that propagates the caller's cookies to detect
  // the currently signed-in admin user session. Use the service-role
  // client for admin operations below.
  const authSupabase = createAuthClient();
  let adminUser = null;
  try {
    const userRes = await authSupabase.auth.getUser();
    adminUser = userRes?.data?.user ?? null;
  } catch (e) {
    console.warn('Error while attempting authSupabase.auth.getUser()', e);
  }
  // Fallback: try getSession() which may return the session.user when
  // cookies are present in some setups.
  if (!adminUser) {
    try {
      const sessRes = await authSupabase.auth.getSession();
      const sessionUser = sessRes?.data?.session?.user ?? null;
      if (sessionUser) adminUser = sessionUser;
    } catch (e) {
      console.warn('Error while attempting authSupabase.auth.getSession()', e);
    }
  }
  const supabase = createClient();

  if (!adminUser) {
    // Debugging hint: return whether request cookies are present so you can
    // see if the request is carrying the session cookie. Only return this
    // extra info in non-production to avoid leaking cookie contents.
    try {
      const hdrs = await headers();
      const cookieHeader = hdrs.get('cookie');
      const hasCookies = !!cookieHeader;

      // Also enumerate cookie names (no values) to help identify which
      // Supabase cookie(s) are being sent in the request. This is safe to
      // print in non-production for debugging only.
      const cookieStore = cookies();
      let cookieNames: string[] = [];
      try {
        const store = await cookieStore;
        // Read cookie names without exposing values
        cookieNames = store.getAll().map((c) => (c && typeof c.name === 'string') ? c.name : '');
        cookieNames = cookieNames.filter(Boolean);
      } catch (e) {
        // If cookies() isn't iterable in this environment, fall back to parsing header.
        if (cookieHeader) {
          cookieNames = cookieHeader.split(';').map(s => s.split('=')[0].trim()).filter(Boolean);
        }
      }

      const debugMsgBase = process.env.NODE_ENV === 'production'
        ? 'Unauthorized: no active admin session.'
        : `Unauthorized: no active admin session. hasCookies=${hasCookies}; cookieNames=${cookieNames.join(',')}`;

      // Attempt a cautious JWT decode from any candidate cookie to extract
      // the user id (sub) without exposing token values. This helps in
      // environments where the SSR client doesn't map cookie names exactly.
      try {
        const store = await cookieStore;
        const all = store.getAll();
        const candidate = all.find((c) => {
          const n = String(c?.name || '').toLowerCase();
          return n.includes('auth-token') || n.includes('supabase') || n.startsWith('sb-');
        });
        if (candidate?.value) {
          let tokenStr: string | null = null;
          // Some cookie names hold JSON session objects; try to parse
          try {
            const parsed = JSON.parse(candidate.value);
            tokenStr = parsed?.access_token ?? parsed?.token ?? null;
          } catch (e) {
            // Not JSON, treat value as possible raw token
            tokenStr = candidate.value;
          }

          if (tokenStr) {
            // Try decode JWT payload (second segment)
            const parts = tokenStr.split('.');
            if (parts.length >= 2) {
              try {
                const payload = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
                const payloadJson = JSON.parse(payload);
                const possibleSub = payloadJson.sub || payloadJson.user_id || payloadJson?.aud?.toString?.();
                if (possibleSub) {
                  // Use the service-role client to verify role by user_id
                  const supabase = createClient();
                  const { data: adminRole } = await supabase.from('user_roles').select('role, school_id').eq('user_id', possibleSub).single();
                  if (adminRole && (adminRole.role === 'admin' || adminRole.role === 'super_admin')) {
                    // We treat this as the authenticated admin user id for the action.
                    adminUser = { id: possibleSub } as any;
                  }
                }
              } catch (e) {
                console.warn('Failed to decode candidate auth cookie JWT payload', e);
              }
            }
          }
        }
      } catch (e) {
        // ignore parsing/lookup errors here
      }

      if (adminUser) {
        // continue execution below with adminUser set
      } else {
        return { success: false, message: debugMsgBase };
      }
    } catch (e) {
      return { success: false, message: 'Unauthorized: no active admin session (could not inspect headers).' };
    }
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
    phone: formData.get('phone'),
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
  
  const { fullName, email, phone } = validatedFields.data;
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
    // Also create a record in the accountants table so the UI can list accountants immediately
    try {
      const { error: acctInsertError } = await supabase.from('accountants').insert({
        auth_user_id: newUserId,
        name: fullName,
        email: lowerCaseEmail,
        phone: phone || null,
        school_id: adminRole.school_id,
      });
      if (acctInsertError) {
        // non-fatal: log and continue, but surface for debugging
        console.warn('Failed to insert into accountants table after invite:', acctInsertError);
      }
    } catch (acctErr) {
      console.warn('Exception inserting accountant record:', acctErr);
    }
    
    // Create audit log for accountant invitation
    await createAuditLog({
      action: AUDIT_ACTIONS.USER_INVITED,
      table_name: 'accountants',
      record_id: newUserId,
      target_id: lowerCaseEmail,
      details: {
        invited_role: 'accountant',
        invited_email: lowerCaseEmail,
        invited_name: fullName,
        invited_by: adminUser.id
      },
      school_id: adminRole.school_id,
      performed_by: adminUser.id
    });
    
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

// Action to update accountant details (excluding email)
export async function updateAccountantAction(
  accountantId: string,
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
  const authSupabase = createAuthClient();
  let adminUser = null;
  
  try {
    const userRes = await authSupabase.auth.getUser();
    adminUser = userRes?.data?.user ?? null;
  } catch (e) {
    console.warn('Error while attempting authSupabase.auth.getUser()', e);
  }
  
  if (!adminUser) {
    try {
      const sessRes = await authSupabase.auth.getSession();
      const sessionUser = sessRes?.data?.session?.user ?? null;
      if (sessionUser) adminUser = sessionUser;
    } catch (e) {
      console.warn('Error while attempting authSupabase.auth.getSession()', e);
    }
  }

  if (!adminUser) {
    return { success: false, message: 'Unauthorized: no active admin session.' };
  }

  const supabase = createClient();
  const { data: adminRole } = await supabase.from('user_roles').select('role, school_id').eq('user_id', adminUser.id).single();
  
  if (!adminRole || (adminRole.role !== 'admin' && adminRole.role !== 'super_admin')) {
    return { success: false, message: "Unauthorized: You do not have permission to update accountants." };
  }

  const validatedFields = updateAccountantSchema.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
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

  const { fullName, phone } = validatedFields.data;

  try {
    // Update the accountant record
    const { error: updateError } = await supabase
      .from('accountants')
      .update({
        name: fullName,
        phone: phone || null,
      })
      .eq('id', accountantId)
      .eq('school_id', adminRole.school_id);

    if (updateError) throw updateError;

    // Create audit log for accountant update
    await createAuditLog({
      action: AUDIT_ACTIONS.USER_PROFILE_UPDATED,
      table_name: 'accountants',
      record_id: accountantId,
      details: {
        updated_fields: { fullName, phone },
        updated_by: adminUser.id
      },
      school_id: adminRole.school_id,
      performed_by: adminUser.id
    });

    return {
      success: true,
      message: 'Accountant details updated successfully.',
    };

  } catch (error: any) {
    console.error('Accountant Update Action Error:', error);
    return { success: false, message: error.message || 'An unexpected server error occurred during update.' };
  }
}

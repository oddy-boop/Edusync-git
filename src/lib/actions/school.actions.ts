
'use server';

import { z } from 'zod';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const schoolSchema = z.object({
  name: z.string().min(3, 'School name must be at least 3 characters.'),
  domain: z.string()
    .min(3, 'Domain must be at least 3 characters')
    .refine(val => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(val), {
      message: 'Domain must be a valid format (e.g., your-school)'
    })
    .optional()
    .or(z.literal('')),
  paystack_public_key: z.string().optional(),
  paystack_secret_key: z.string().optional(),
  resend_api_key: z.string().optional(),
  google_api_key: z.string().optional(),
});


type ActionResponse = {
  success: boolean;
  message: string;
  schoolId?: string;
};


function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Server configuration error: Supabase service role credentials are not set.");
  }
  return createServerClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { 
      autoRefreshToken: false, 
      persistSession: false,
      detectSessionInUrl: false
    },
  });
}

async function verifySuperAdmin(supabase: any): Promise<{ user: any; error?: string }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { user: null, error: "Authentication Error: Could not verify your session." };
  }

  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roleError || roleData?.role !== 'super_admin') {
    return { user: null, error: "Permission Denied: Super admin access required." };
  }

  return { user };
}


export async function createSchoolAction(
  prevState: any, 
  formData: FormData
): Promise<ActionResponse> {
  const supabase = createClient();

  try {
    const { user, error: adminError } = await verifySuperAdmin(supabase);
    if (adminError) {
      return { success: false, message: adminError };
    }

    const validatedFields = schoolSchema.safeParse({
      name: formData.get('name'),
      domain: formData.get('domain'),
      paystack_public_key: formData.get('paystack_public_key'),
      paystack_secret_key: formData.get('paystack_secret_key'),
      resend_api_key: formData.get('resend_api_key'),
      google_api_key: formData.get('google_api_key'),
    });

    if (!validatedFields.success) {
      const errors = validatedFields.error.flatten();
      return { 
        success: false, 
        message: Object.values(errors.fieldErrors).flat().join(' ') || 'Invalid input.' 
      };
    }

    const { name, domain, ...apiKeys } = validatedFields.data;
    const supabaseAdmin = getSupabaseAdminClient();

    const { data: school, error } = await supabaseAdmin
      .from('schools')
      .insert({
        name,
        domain: domain || null,
        paystack_public_key: apiKeys.paystack_public_key || null,
        paystack_secret_key: apiKeys.paystack_secret_key || null,
        resend_api_key: apiKeys.resend_api_key || null,
        google_api_key: apiKeys.google_api_key || null,
      })
      .select('id, name')
      .single();

    if (error) throw error;

    return { 
      success: true, 
      message: `School "${name}" created successfully.`,
      schoolId: school.id
    };

  } catch (error: any) {
    console.error("School creation failed:", error);
    return { success: false, message: error.message || "An unexpected error occurred." };
  }
}

export async function updateSchoolAction(
  prevState: any, 
  formData: FormData
): Promise<ActionResponse> {
  const supabase = createClient();
  const schoolId = formData.get('id') as string;

  if (!schoolId) {
    return { success: false, message: 'School ID is required.' };
  }

  try {
    const { user, error: adminError } = await verifySuperAdmin(supabase);
    if (adminError) {
      return { success: false, message: adminError };
    }

    const validatedFields = schoolSchema.safeParse({
      name: formData.get('name'),
      domain: formData.get('domain'),
      paystack_public_key: formData.get('paystack_public_key'),
      paystack_secret_key: formData.get('paystack_secret_key'),
      resend_api_key: formData.get('resend_api_key'),
      google_api_key: formData.get('google_api_key'),
    });

    if (!validatedFields.success) {
      const errors = validatedFields.error.flatten();
      return { 
        success: false, 
        message: Object.values(errors.fieldErrors).flat().join(' ') || 'Invalid input.' 
      };
    }

    const { name, domain, ...apiKeys } = validatedFields.data;
    const supabaseAdmin = getSupabaseAdminClient();

    const { error } = await supabaseAdmin
      .from('schools')
      .update({
        name,
        domain: domain || null,
        paystack_public_key: apiKeys.paystack_public_key || null,
        paystack_secret_key: apiKeys.paystack_secret_key || null,
        resend_api_key: apiKeys.resend_api_key || null,
        google_api_key: apiKeys.google_api_key || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', schoolId);

    if (error) throw error;

    return { 
      success: true, 
      message: `School "${name}" updated successfully.` 
    };

  } catch (error: any) {
    console.error("School update failed:", error);
    return { success: false, message: error.message || "An unexpected error occurred." };
  }
}

export async function deleteSchoolAction(schoolId: string): Promise<ActionResponse> {
  const supabase = createClient();

  if (!schoolId) {
    return { success: false, message: 'School ID is required.' };
  }

  try {
    const { user, error: adminError } = await verifySuperAdmin(supabase);
    if (adminError) {
      return { success: false, message: adminError };
    }

    const supabaseAdmin = getSupabaseAdminClient();
    
    // You might want to soft delete instead of hard delete
    const { data: school, error } = await supabaseAdmin
      .from('schools')
      .delete()
      .eq('id', schoolId)
      .select()
      .single();

    if (error) throw error;
    if (!school) return { success: false, message: "School not found." };


    return { 
      success: true, 
      message: `School "${school.name}" has been deleted.` 
    };

  } catch (error: any) {
    console.error("School deletion failed:", error);
    return { success: false, message: error.message || "An unexpected error occurred." };
  }
}

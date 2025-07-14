
'use server';

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getSupabase } from '../supabaseClient'; // We need the user's supabase client too

const schoolSchema = z.object({
  name: z.string().min(3, 'School name must be at least 3 characters.'),
  domain: z.string().optional(),
  paystack_public_key: z.string().optional(),
  paystack_secret_key: z.string().optional(),
  resend_api_key: z.string().optional(),
  google_api_key: z.string().optional(),
});

type ActionResponse = {
  success: boolean;
  message: string;
};

// This function checks the role of the *currently authenticated user* making the request.
async function checkSuperAdmin(): Promise<boolean> {
  const supabase = getSupabase(); // Gets the client for the current user's session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  return roleData?.role === 'super_admin';
}

function getSupabaseAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error("Server configuration error: Supabase credentials are not set.");
    }
    return createClient(supabaseUrl, supabaseServiceRoleKey);
}

function formatErrorMessage(error: any): string {
    if (error.code === '42501') {
        return "Database Permission Denied: The current user's role does not have the required permissions for this action. Please check the relevant RLS policies in Supabase.";
    }
     if (error.code === '23505') {
        return "Database Error: This entry already exists or conflicts with another entry (unique constraint violation).";
    }
    return error.message || "An unknown database error occurred.";
}


export async function createSchoolAction(prevState: any, formData: FormData): Promise<ActionResponse> {
    const validatedFields = schoolSchema.safeParse({
        name: formData.get('name'),
        domain: formData.get('domain'),
        paystack_public_key: formData.get('paystack_public_key'),
        paystack_secret_key: formData.get('paystack_secret_key'),
        resend_api_key: formData.get('resend_api_key'),
        google_api_key: formData.get('google_api_key'),
    });

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.flatten().fieldErrors.name?.[0] || 'Invalid input.' };
    }
    
    try {
        if (!(await checkSuperAdmin())) {
            return { success: false, message: "Permission Denied: You must be a super administrator to create a school." };
        }

        const supabaseAdmin = getSupabaseAdminClient();
        const { name, domain, ...apiKeys } = validatedFields.data;

        const payload = {
            name,
            domain: domain || null,
            paystack_public_key: apiKeys.paystack_public_key || null,
            paystack_secret_key: apiKeys.paystack_secret_key || null,
            resend_api_key: apiKeys.resend_api_key || null,
            google_api_key: apiKeys.google_api_key || null,
        };

        const { error } = await supabaseAdmin.from('schools').insert(payload);

        if (error) throw error;
        
        return { success: true, message: `School "${name}" created successfully.` };

    } catch (error: any) {
        console.error("Create School Action Error:", error);
        return { success: false, message: formatErrorMessage(error) };
    }
}

export async function updateSchoolAction(prevState: any, formData: FormData): Promise<ActionResponse> {
    const id = formData.get('id') as string;
    if (!id) return { success: false, message: 'School ID is missing.' };

    const validatedFields = schoolSchema.safeParse({
        name: formData.get('name'),
        domain: formData.get('domain'),
        paystack_public_key: formData.get('paystack_public_key'),
        paystack_secret_key: formData.get('paystack_secret_key'),
        resend_api_key: formData.get('resend_api_key'),
        google_api_key: formData.get('google_api_key'),
    });

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.flatten().fieldErrors.name?.[0] || 'Invalid input.' };
    }
    
    try {
        if (!(await checkSuperAdmin())) {
            return { success: false, message: "Permission Denied: You must be a super administrator to update a school." };
        }

        const supabaseAdmin = getSupabaseAdminClient();
        const { name, domain, ...apiKeys } = validatedFields.data;

        const payload = {
            name,
            domain: domain || null,
            paystack_public_key: apiKeys.paystack_public_key || null,
            paystack_secret_key: apiKeys.paystack_secret_key || null,
            resend_api_key: apiKeys.resend_api_key || null,
            google_api_key: apiKeys.google_api_key || null,
            updated_at: new Date().toISOString()
        };
        const { error } = await supabaseAdmin.from('schools').update(payload).eq('id', id);

        if (error) throw error;

        return { success: true, message: `School "${name}" updated successfully.` };
    } catch (error: any) {
        console.error("Update School Action Error:", error);
        return { success: false, message: formatErrorMessage(error) };
    }
}

export async function deleteSchoolAction(id: string): Promise<ActionResponse> {
  if (!id) return { success: false, message: 'School ID is missing.' };
  
  try {
    if (!(await checkSuperAdmin())) {
        return { success: false, message: "Permission Denied: You must be a super administrator to delete a school." };
    }
    
    const supabaseAdmin = getSupabaseAdminClient();
    const { error } = await supabaseAdmin.from('schools').delete().eq('id', id);

    if (error) throw error;
    
    return { success: true, message: "School and all its data deleted successfully." };

  } catch (error: any) {
    console.error("Delete School Action Error:", error);
    return { success: false, message: formatErrorMessage(error) };
  }
}

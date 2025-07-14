'use server';

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const schoolSchema = z.object({
  name: z.string().min(3, 'School name must be at least 3 characters.'),
  domain: z.string().optional(),
});

type ActionResponse = {
  success: boolean;
  message: string;
};

async function checkSuperAdmin(supabase: any): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  return roleData?.role === 'super_admin';
}

export async function createSchoolAction(prevState: any, formData: FormData): Promise<ActionResponse> {
    const validatedFields = schoolSchema.safeParse({
        name: formData.get('name'),
        domain: formData.get('domain'),
    });

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.flatten().fieldErrors.name?.[0] || 'Invalid input.' };
    }
    
    const { name, domain } = validatedFields.data;
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        return { success: false, message: "Server configuration error." };
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    if (!(await checkSuperAdmin(supabaseAdmin))) {
        return { success: false, message: "Permission denied." };
    }

    try {
        const { error } = await supabaseAdmin.from('schools').insert({ name, domain: domain || null });
        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                return { success: false, message: "A school with this domain already exists." };
            }
            throw error;
        }
        return { success: true, message: `School "${name}" created successfully.` };
    } catch (error: any) {
        return { success: false, message: `Failed to create school: ${error.message}` };
    }
}

export async function updateSchoolAction(prevState: any, formData: FormData): Promise<ActionResponse> {
    const id = formData.get('id') as string;
    if (!id) return { success: false, message: 'School ID is missing.' };

    const validatedFields = schoolSchema.safeParse({
        name: formData.get('name'),
        domain: formData.get('domain'),
    });

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.flatten().fieldErrors.name?.[0] || 'Invalid input.' };
    }
    
    const { name, domain } = validatedFields.data;
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        return { success: false, message: "Server configuration error." };
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    if (!(await checkSuperAdmin(supabaseAdmin))) {
        return { success: false, message: "Permission denied." };
    }
    
    try {
        const { error } = await supabaseAdmin.from('schools').update({ name, domain: domain || null }).eq('id', id);
        if (error) {
             if (error.code === '23505') {
                return { success: false, message: "A school with this domain already exists." };
            }
            throw error;
        }
        return { success: true, message: `School "${name}" updated successfully.` };
    } catch (error: any) {
        return { success: false, message: `Failed to update school: ${error.message}` };
    }
}

export async function deleteSchoolAction(id: string): Promise<ActionResponse> {
  if (!id) return { success: false, message: 'School ID is missing.' };
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { success: false, message: "Server configuration error." };
  }
  
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  if (!(await checkSuperAdmin(supabaseAdmin))) {
    return { success: false, message: "Permission denied." };
  }
  
  try {
    const { error } = await supabaseAdmin.from('schools').delete().eq('id', id);
    if (error) throw error;
    return { success: true, message: "School and all its data deleted successfully." };
  } catch (error: any) {
    return { success: false, message: `Failed to delete school: ${error.message}` };
  }
}

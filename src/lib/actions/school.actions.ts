
'use server';

import { z } from 'zod';
import { createClient } from "@/lib/supabase/server";

const schoolFormSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(3, { message: 'School name must be at least 3 characters.' }),
  domain: z.string().regex(/^[a-z0-9-]+$/, { message: 'Subdomain can only contain lowercase letters, numbers, and hyphens.' }).optional().nullable(),
});

type ActionResponse = {
  success: boolean;
  message: string;
  data?: any;
};

export async function getSchoolsAction(): Promise<ActionResponse> {
    const supabase = createClient();
    // This action is public to allow the portals page to list schools for selection.
    try {
        const { data, error } = await supabase.from('schools').select('id, name').order('created_at', { ascending: true });
        if (error) throw error;
        return { success: true, message: "Schools fetched successfully", data };
    } catch (error: any) {
        console.error("Error fetching schools:", error);
        return { success: false, message: error.message };
    }
}

export async function createOrUpdateSchoolAction(prevState: any, formData: FormData): Promise<ActionResponse> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Unauthorized access." };

    // Use the reliable get_my_role() function for the check
    const { data: role, error: rpcError } = await supabase.rpc('get_my_role');

    if (rpcError || role !== 'super_admin') {
        console.error("Super admin authorization failed.", rpcError);
        return { success: false, message: "Unauthorized: You do not have permission to modify schools." };
    }

    const validatedFields = schoolFormSchema.safeParse({
        id: formData.get('id'),
        name: formData.get('name'),
        domain: formData.get('domain') || null,
    });

    if (!validatedFields.success) {
        return { success: false, message: "Invalid data provided." };
    }
    
    const { id, name, domain } = validatedFields.data;
    
    try {
        if (id) {
            const { error } = await supabase.from('schools').update({ name, domain }).eq('id', id);
            if (error) throw error;
            return { success: true, message: `School "${name}" updated successfully.` };
        } else {
            const { error } = await supabase.from('schools').insert({ name, domain });
            if (error) throw error;
            return { success: true, message: `School "${name}" created successfully.` };
        }
    } catch (error: any) {
        console.error("Error creating/updating school:", error);
        if (error.code === '23505') { // unique_violation
            return { success: false, message: `The subdomain "${domain}" is already taken.` };
        }
        return { success: false, message: error.message };
    }
}

export async function deleteSchoolAction({ schoolId }: { schoolId: number }): Promise<ActionResponse> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Unauthorized access." };

    const { data: role, error: rpcError } = await supabase.rpc('get_my_role');

    if (rpcError || role !== 'super_admin') {
      return { success: false, message: "Unauthorized: You do not have permission to delete schools." };
    }

    try {
        const { error } = await supabase.from('schools').delete().eq('id', schoolId);
        if(error) throw error;
        return { success: true, message: "School deleted successfully." };
    } catch (error: any) {
        console.error("Error deleting school:", error);
        return { success: false, message: error.message };
    }
}

'use server';

import { z } from 'zod';
import { createAuthClient } from "@/lib/supabase/server";

const schoolFormSchema = z.object({
    id: z.coerce.number().optional(),
    name: z.string().min(3, { message: 'School name must be at least 3 characters.' }),
    domain: z.string()
        .transform(val => val?.trim()?.toLowerCase() || null) // Transform first
        .nullable()
        .refine(val => {
            // If null or empty, it's valid (optional field)
            if (!val) return true;
            // Otherwise, check the regex pattern
            return /^[a-z0-9-]+$/.test(val);
        }, {
            message: 'Subdomain can only contain lowercase letters, numbers, and hyphens (e.g., "kasoa" or "tema-branch").'
        })
        .optional(),
});

type ActionResponse = {
    success: boolean;
    message: string;
    data?: any;
    errors?: z.ZodIssue[];
};

export async function getSchoolsAction(): Promise<ActionResponse> {
    const supabase = createAuthClient();
    try {
        // Get all schools
        const { data: schools, error: schoolsError } = await supabase
            .from('schools')
            .select('id, name')
            .order('created_at', { ascending: true });

        if (schoolsError) throw schoolsError;

        // Get schools that already have admins (include super_admin as administrator too)
        const { data: schoolsWithAdmins, error: adminsError } = await supabase
            .from('user_roles')
            .select('school_id')
            .in('role', ['admin', 'super_admin']);

        if (adminsError) throw adminsError;

    // Create a set of school IDs that already have admins (normalize to strings)
    const schoolsWithAdminsSet = new Set(schoolsWithAdmins.map(role => String(role.school_id)));

    // Filter out schools that already have admins (compare as strings)
    const availableSchools = schools.filter(school => !schoolsWithAdminsSet.has(String(school.id)));

        return {
            success: true,
            message: "Schools fetched successfully",
            data: availableSchools
        };
    } catch (error: any) {
        console.error("Error fetching schools:", error);
        return {
            success: false,
            message: "Unable to fetch schools. Please try again or contact support if the problem persists."
        };
    }
}

export async function getAllSchoolsAction(): Promise<ActionResponse> {
    const supabase = createAuthClient();
    try {
        // Get all schools
        const { data: schools, error: schoolsError } = await supabase
            .from('schools')
            .select('id, name, domain, created_at')
            .order('created_at', { ascending: true });

        if (schoolsError) throw schoolsError;

        // Get schools that have admins (include super_admin as administrator too)
        const { data: schoolsWithAdmins, error: adminsError } = await supabase
            .from('user_roles')
            .select('school_id')
            .in('role', ['admin', 'super_admin']);

        if (adminsError) throw adminsError;

        // Create a set of school IDs that have admins (normalize to strings)
        const schoolsWithAdminsSet = new Set(schoolsWithAdmins.map(role => String(role.school_id)));

        // Add the has_admin flag to each school (compare as strings)
        const schoolsWithAdminStatus = schools.map(school => ({
            ...school,
            has_admin: schoolsWithAdminsSet.has(String(school.id))
        }));

        return {
            success: true,
            message: "Schools fetched successfully",
            data: schoolsWithAdminStatus
        };
    } catch (error: any) {
        console.error("Error fetching all schools:", error);
        return { success: false, message: error.message };
    }
}

export async function createOrUpdateSchoolAction(prevState: any, formData: FormData): Promise<ActionResponse> {
    const supabase = createAuthClient();
    
    let id: number | undefined;
    let name: string;
    let domain: string | null | undefined;
    
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
            console.error('Auth error:', userError);
            return { success: false, message: "Authentication error: " + userError.message };
        }

        if (!user) {
            return { success: false, message: "Unauthorized: You must be logged in to perform this action." };
        }

        console.log('Authenticated user ID:', user.id);

        const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

        console.log('Role query result:', { roleData, roleError });

        if (roleError) {
            console.error('Role error:', roleError);
            return { success: false, message: "Error checking user permissions: " + roleError.message };
        }

        if (!roleData || roleData.role !== 'super_admin') {
            return { success: false, message: "Unauthorized: You do not have permission to modify schools. Current role: " + (roleData?.role || 'none') };
        }

        // Debug: Log the form data
        console.log('Form data received:', {
            id: formData.get('id'),
            name: formData.get('name'),
            domain: formData.get('domain'),
        });

        const validatedFields = schoolFormSchema.safeParse({
            id: formData.get('id'),
            name: formData.get('name'),
            domain: formData.get('domain') || null,
        });

        if (!validatedFields.success) {
            console.error('Validation errors:', validatedFields.error.errors);
            return { 
                success: false, 
                message: validatedFields.error.errors.map(err => err.message).join(', '),
                errors: validatedFields.error.errors
            };
        }

        ({ id, name, domain } = validatedFields.data);

        const timestamp = new Date().toISOString();

        if (id) {
            const { error } = await supabase.from('schools')
                .update({
                    name,
                    domain,
                    updated_at: timestamp
                })
                .eq('id', id);
            if (error) throw error;
            return { success: true, message: `School "${name}" updated successfully.` };
        } else {
            // Create new school with default settings
            const { data: school, error: schoolError } = await supabase.from('schools')
                .insert({
                    name,
                    domain,
                    current_academic_year: new Date().getFullYear().toString(),
                    created_at: timestamp,
                    updated_at: timestamp
                })
                .select()
                .single();

            if (schoolError) throw schoolError;

            return {
                success: true,
                message: `School "${name}" created successfully.`,
                data: school
            };
        }
    } catch (error: any) {
        console.error("Error creating/updating school:", error);
        if (error.code === '23505') { // unique_violation
            return { success: false, message: `The subdomain "${domain || 'unknown'}" is already taken.` };
        }
        return { success: false, message: error.message };
    }
}

export async function deleteSchoolAction({ schoolId }: { schoolId: number }): Promise<ActionResponse> {
    const supabase = createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "Unauthorized: You must be logged in to perform this action." };
    }

    const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

    if (roleError || !roleData || roleData.role !== 'super_admin') {
        return { success: false, message: "Unauthorized: You do not have permission to delete schools." };
    }

    try {
        const { error } = await supabase.from('schools').delete().eq('id', schoolId);
        if (error) throw error;
        return { success: true, message: "School deleted successfully." };
    } catch (error: any) {
        console.error("Error deleting school:", error);
        return { success: false, message: error.message };
    }
}

export async function getSchoolByIdAction(id: number): Promise<ActionResponse> {
    const supabase = createAuthClient();
    try {
        const { data: school, error } = await supabase
            .from('schools')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        return { success: true, message: 'School fetched', data: school };
    } catch (error: any) {
        console.error('Error fetching school by id:', error);
        return { success: false, message: error.message };
    }
}
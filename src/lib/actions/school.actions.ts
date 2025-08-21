
'use server';

import { z } from 'zod';
import { createClient } from "@/lib/supabase/server";

const schoolFormSchema = z.object({
    id: z.coerce.number().optional(),
    name: z.string().min(3, { message: 'School name must be at least 3 characters.' }),
    domain: z.string()
        .regex(/^[a-z0-9-]+$/, {
            message: 'Subdomain can only contain lowercase letters, numbers, and hyphens (e.g., "kasoa" or "tema-branch").'
        })
        .transform(val => val?.toLowerCase())
        .optional()
        .nullable(),
});

type ActionResponse = {
    success: boolean;
    message: string;
    data?: any;
};

export async function getSchoolsAction(): Promise<ActionResponse> {
    const supabase = createClient();
    try {
        // Get all schools
        const { data: schools, error: schoolsError } = await supabase
            .from('schools')
            .select('id, name')
            .order('created_at', { ascending: true });

        if (schoolsError) throw schoolsError;

        // Get schools that already have admins
        const { data: schoolsWithAdmins, error: adminsError } = await supabase
            .from('user_roles')
            .select('school_id')
            .eq('role', 'admin');

        if (adminsError) throw adminsError;

        // Create a set of school IDs that already have admins
        const schoolsWithAdminsSet = new Set(schoolsWithAdmins.map(role => role.school_id));

        // Filter out schools that already have admins
        const availableSchools = schools.filter(school => !schoolsWithAdminsSet.has(school.id));

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
    const supabase = createClient();
    try {
        // Get all schools
        const { data: schools, error: schoolsError } = await supabase
            .from('schools')
            .select('id, name, domain, created_at')
            .order('created_at', { ascending: true });

        if (schoolsError) throw schoolsError;

        // Get schools that have admins
        const { data: schoolsWithAdmins, error: adminsError } = await supabase
            .from('user_roles')
            .select('school_id')
            .eq('role', 'admin');

        if (adminsError) throw adminsError;

        // Create a set of school IDs that have admins
        const schoolsWithAdminsSet = new Set(schoolsWithAdmins.map(role => role.school_id));

        // Add the has_admin flag to each school
        const schoolsWithAdminStatus = schools.map(school => ({
            ...school,
            has_admin: schoolsWithAdminsSet.has(school.id)
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
    const supabase = createClient();
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
            return { success: false, message: `The subdomain "${domain}" is already taken.` };
        }
        return { success: false, message: error.message };
    }
}

export async function deleteSchoolAction({ schoolId }: { schoolId: number }): Promise<ActionResponse> {
    const supabase = createClient();
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

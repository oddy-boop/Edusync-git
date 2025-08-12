
'use server';

import { z } from 'zod';
import pool from "@/lib/db";
import { getSession } from "@/lib/session";

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
    const session = await getSession();
    if (session.role !== 'super_admin') {
        return { success: false, message: "Unauthorized access." };
    }
    const client = await pool.connect();
    try {
        const { rows } = await client.query('SELECT id, name, domain, created_at FROM schools ORDER BY created_at ASC');
        return { success: true, message: "Schools fetched successfully", data: rows };
    } catch (error: any) {
        console.error("Error fetching schools:", error);
        return { success: false, message: error.message };
    } finally {
        client.release();
    }
}

export async function createOrUpdateSchoolAction(prevState: any, formData: FormData): Promise<ActionResponse> {
    const session = await getSession();
    if (session.role !== 'super_admin') {
        return { success: false, message: "Unauthorized access." };
    }

    const validatedFields = schoolFormSchema.safeParse({
        id: formData.get('id'),
        name: formData.get('name'),
        domain: formData.get('domain'),
    });

    if (!validatedFields.success) {
        return { success: false, message: "Invalid data provided." };
    }
    
    const { id, name, domain } = validatedFields.data;
    const client = await pool.connect();
    
    try {
        if (id) {
            // Update existing school
            await client.query('UPDATE schools SET name = $1, domain = $2 WHERE id = $3', [name, domain, id]);
            return { success: true, message: `School "${name}" updated successfully.` };
        } else {
            // Create new school
            await client.query('INSERT INTO schools (name, domain) VALUES ($1, $2)', [name, domain]);
            return { success: true, message: `School "${name}" created successfully.` };
        }
    } catch (error: any) {
        console.error("Error creating/updating school:", error);
        if (error.code === '23505') { // unique_violation
            return { success: false, message: `The subdomain "${domain}" is already taken.` };
        }
        return { success: false, message: error.message };
    } finally {
        client.release();
    }
}

export async function deleteSchoolAction({ schoolId }: { schoolId: number }): Promise<ActionResponse> {
    const session = await getSession();
    if (session.role !== 'super_admin') {
        return { success: false, message: "Unauthorized access." };
    }
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM schools WHERE id = $1', [schoolId]);
        return { success: true, message: "School deleted successfully." };
    } catch (error: any) {
        console.error("Error deleting school:", error);
        return { success: false, message: error.message };
    } finally {
        client.release();
    }
}

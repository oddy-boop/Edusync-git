
'use server';

import { getSession } from '@/lib/session';
import pool from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

type ActionResponse = {
  success: boolean;
  message: string;
};

// This action is now simplified to delete a user from the 'users' table,
// which will cascade and delete their profile from 'students' or 'teachers'.
export async function deleteUserAction(authUserId: string): Promise<ActionResponse> {
    const session = await getSession();
    if (!session.isLoggedIn || (session.role !== 'admin' && session.role !== 'super_admin')) {
        return { success: false, message: "You are not authorized to perform this action." };
    }
    
    if (!authUserId) {
        return { success: false, message: "User ID is required for deletion." };
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        return { success: false, message: "Server configuration error for database." };
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    try {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
        if (error) throw error;
        
        return { success: true, message: "User profile and login account deleted successfully." };
    } catch (error: any) {
        console.error('Error deleting user:', error);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}

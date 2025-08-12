
'use server';

import { getSession } from '@/lib/session';
import pool from '@/lib/db';

type ActionResponse = {
  success: boolean;
  message: string;
};

// This action is now simplified to delete a user from the 'users' table,
// which will cascade and delete their profile from 'students' or 'teachers'.
export async function deleteUserAction(authUserId: string): Promise<ActionResponse> {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== 'admin' && session.role !== 'super_admin') {
        return { success: false, message: "You are not authorized to perform this action." };
    }
    
    if (!authUserId) {
        return { success: false, message: "User ID is required for deletion." };
    }

    const client = await pool.connect();

    try {
        // The CASCADE DELETE on the user_roles table will handle profile deletion
        const { rowCount } = await client.query('DELETE FROM users WHERE id = $1', [authUserId]);
        
        if (rowCount === 0) {
            return { success: false, message: "User not found or already deleted." };
        }

        return { success: true, message: "User profile and login account deleted successfully." };
    } catch (error: any) {
        console.error('Error deleting user:', error);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    } finally {
        client.release();
    }
}

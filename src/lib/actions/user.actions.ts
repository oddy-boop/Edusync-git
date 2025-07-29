
'use server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { GRADE_LEVELS } from '@/lib/constants';

type ActionResponse = {
  success: boolean;
  message: string;
};

interface DeleteUserPayload {
  authUserId: string;
  profileTable: 'students' | 'teachers';
}

export async function deleteUserAction({ authUserId, profileTable }: DeleteUserPayload): Promise<ActionResponse> {
  if (!authUserId) {
    return { success: false, message: "Authentication User ID is required to perform deletion." };
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Delete User Action Error: Supabase admin credentials are not configured.");
    return { success: false, message: "Server configuration error prevents user deletion." };
  }

  const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);

    if (authError) {
        if (authError.message.includes("User not found")) {
            console.warn(`User with auth ID ${authUserId} not found in Supabase Auth, but proceeding to mark profile.`);
        } else {
            throw authError;
        }
    }

    const { error: profileError } = await supabaseAdmin
        .from(profileTable)
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('auth_user_id', authUserId);

    if (profileError) {
        console.error(`Delete User Action Error (Profile): Failed to mark as deleted in '${profileTable}' table for auth_user_id ${authUserId}.`, profileError);
        return { success: false, message: `User login was deleted, but profile could not be updated: ${profileError.message}` };
    }

    return { success: true, message: "User has been successfully deleted." };

  } catch (error: any) {
    console.error(`Delete User Action Error (Overall):`, error);
    return { success: false, message: `An unexpected error occurred during deletion: ${error.message}` };
  }
}

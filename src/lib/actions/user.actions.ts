
'use server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

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
    // Delete the user from Supabase Auth first
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);

    if (authError) {
        // If user not found in auth, it's not a critical failure if profile was marked.
        if (authError.message.includes("User not found")) {
            console.warn(`User with auth ID ${authUserId} not found in Supabase Auth, but proceeding to mark profile.`);
        } else {
            // For other auth errors, we should stop and report the failure.
            throw authError;
        }
    }

    // Now, mark the user as deleted in their profile table.
    // This runs even if the auth user was already gone, to clean up the profile.
    const { error: profileError } = await supabaseAdmin
        .from(profileTable)
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('auth_user_id', authUserId);

    if (profileError) {
        console.error(`Delete User Action Error (Profile): Failed to mark as deleted in '${profileTable}' table for auth_user_id ${authUserId}.`, profileError);
        // This is a partial success state, the auth user is gone but profile update failed.
        return { success: false, message: `User login was deleted, but profile could not be updated: ${profileError.message}` };
    }

    return { success: true, message: "User has been successfully deleted." };

  } catch (error: any) {
    console.error(`Delete User Action Error (Overall):`, error);
    return { success: false, message: `An unexpected error occurred during deletion: ${error.message}` };
  }
}

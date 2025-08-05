
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
    // Step 1: Mark the user's profile as deleted.
    const { error: profileUpdateError } = await supabaseAdmin
      .from(profileTable)
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('auth_user_id', authUserId);

    if (profileUpdateError) {
      console.error(`Error marking ${profileTable} profile as deleted for auth_id ${authUserId}:`, profileUpdateError);
      throw new Error(`Failed to update user profile before deletion. Reason: ${profileUpdateError.message}`);
    }

    // Step 2: Delete the authentication user.
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
    
    // If the auth user doesn't exist, it's not a critical failure if the profile was marked.
    if (authError && authError.message.includes("User not found")) {
        console.warn(`User with auth ID ${authUserId} not found in Supabase Auth, but profile was successfully marked as deleted.`);
        return { success: true, message: "User profile was marked as deleted. The authentication account was already gone." };
    }
    
    if (authError) {
        throw new Error(`Auth user deletion failed: ${authError.message}`);
    }

    return { success: true, message: "User has been successfully deleted." };

  } catch (error: any) {
    console.error(`Delete User Action Error (Overall):`, error);
    return { success: false, message: `An unexpected error occurred during deletion: ${error.message}` };
  }
}

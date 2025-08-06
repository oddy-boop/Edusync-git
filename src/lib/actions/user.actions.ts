
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
    // Step 1: Mark the user's profile as deleted. This is crucial.
    // The RLS policies must allow an admin to perform this UPDATE.
    const { error: profileUpdateError } = await supabaseAdmin
      .from(profileTable)
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('auth_user_id', authUserId);

    if (profileUpdateError) {
      console.error(`Error marking ${profileTable} profile as deleted for auth_id ${authUserId}:`, profileUpdateError);
      throw new Error(`Failed to update user profile. Please check RLS policies. Reason: ${profileUpdateError.message}`);
    }

    // Step 2: Delete the authentication user. This revokes their access.
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
    
    if (authError) {
      // If the user is not found, it's a soft error since the profile is already marked deleted.
      if (authError.message.toLowerCase().includes("user not found")) {
        console.warn(`User with auth ID ${authUserId} not found in Supabase Auth, but profile was marked as deleted.`);
        return { success: true, message: "User profile marked as deleted. The auth account was already gone." };
      }
      // For other auth errors, we should report them.
      throw new Error(`Auth user deletion failed: ${authError.message}`);
    }

    return { success: true, message: "User has been successfully deleted." };

  } catch (error: any) {
    console.error(`Delete User Action Error (Overall):`, error);
    // Ensure we always return a message string.
    const errorMessage = error.message || "An unknown error occurred during the deletion process.";
    return { success: false, message: `Failed to delete user. Reason: ${errorMessage}` };
  }
}


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

  // Mark the user as deleted in their profile table instead of hard deleting.
  const { error: profileError } = await supabaseAdmin
    .from(profileTable)
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('auth_user_id', authUserId);

  if (profileError) {
      console.error(`Delete User Action Error (Profile): Failed to mark as deleted in '${profileTable}' table for auth_user_id ${authUserId}.`, profileError);
      return { success: false, message: `Failed to update user profile: ${profileError.message}` };
  }
  
  // Delete the user from Supabase Auth
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);

  if (authError) {
    // If user not found in auth, it's not a critical failure if profile was marked.
    if (authError.message.includes("User not found")) {
      console.warn(`User with auth ID ${authUserId} not found in Supabase Auth, but their profile in '${profileTable}' was marked as deleted.`);
      return { success: true, message: "User profile was marked as deleted, but the authentication account was already removed." };
    } else {
      console.error('Delete User Action Error (Auth):', authError);
      // NOTE: In a real-world scenario, you might want to roll back the profile `is_deleted` flag here.
      // For this app's purpose, we'll report the mixed success state.
      return { success: false, message: `User profile was marked as deleted, but their login account could not be removed: ${authError.message}. Please check the Supabase Auth dashboard.` };
    }
  }

  return { success: true, message: "User has been successfully deleted." };
}

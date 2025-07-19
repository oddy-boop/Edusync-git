
'use server';
import { createClient } from '@supabase/supabase-js';

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

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  // First, delete the user's profile from the corresponding table
  // This also effectively soft-deletes by removing the link, but we also delete from auth
  const { error: profileError } = await supabaseAdmin
    .from(profileTable)
    .delete()
    .eq('auth_user_id', authUserId);

  if (profileError) {
      console.error(`Delete User Action Error (Profile): Failed to delete from '${profileTable}' table for auth_user_id ${authUserId}.`, profileError);
      return { success: false, message: `Failed to delete user profile: ${profileError.message}` };
  }
  
  // Second, delete the user from Supabase Auth
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);

  if (authError) {
    // If user not found in auth, they might still have a profile record to clean up.
    if (authError.message.includes("User not found")) {
      console.warn(`User with auth ID ${authUserId} not found in Supabase Auth, but their orphaned profile in '${profileTable}' was deleted.`);
      return { success: true, message: "User profile was deleted, but the authentication account was already removed." };
    } else {
      console.error('Delete User Action Error (Auth):', authError);
      return { success: false, message: `User profile was deleted, but their login account could not be removed: ${authError.message}. Please check the Supabase Auth dashboard.` };
    }
  }


  return { success: true, message: "User and all related data have been successfully deleted." };
}

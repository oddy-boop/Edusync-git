
'use server';
import { createClient } from '@supabase/supabase-js';

type ActionResponse = {
  success: boolean;
  message: string;
};

interface DeleteUserPayload {
  userId: string;
  profileTable: 'students' | 'teachers';
}

export async function deleteUserAction({ userId, profileTable }: DeleteUserPayload): Promise<ActionResponse> {
  if (!userId) {
    return { success: false, message: "User ID is required to perform deletion." };
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Delete User Action Error: Supabase admin credentials are not configured.");
    return { success: false, message: "Server configuration error prevents user deletion." };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  
  // First, delete the user from Supabase Auth
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (authError) {
    // If user not found in auth, they might still have a profile record to clean up.
    if (authError.message.includes("User not found")) {
      console.warn(`User with auth ID ${userId} not found in Supabase Auth, but proceeding to check for orphaned profile in '${profileTable}'.`);
    } else {
      console.error('Delete User Action Error (Auth):', authError);
      return { success: false, message: authError.message || "An unknown error occurred while deleting the user's authentication account." };
    }
  }

  // Second, delete the user's profile from the corresponding table
  const { error: profileError } = await supabaseAdmin
    .from(profileTable)
    .delete()
    .eq('auth_user_id', userId);

  if (profileError) {
      console.error(`Delete User Action Error (Profile): Failed to delete from '${profileTable}' table for auth_user_id ${userId}.`, profileError);
      // Return a partial success if the auth user was deleted but profile wasn't.
      if (!authError) {
        return { success: false, message: `User's login was deleted, but their profile record could not be removed: ${profileError.message}. Please check database permissions.` };
      }
      return { success: false, message: `Failed to delete user profile: ${profileError.message}` };
  }


  return { success: true, message: "User and all related data have been successfully deleted." };
}

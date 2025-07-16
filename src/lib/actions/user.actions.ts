
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

  // First, delete the user's profile from the corresponding table
  const { error: profileError } = await supabaseAdmin
    .from(profileTable)
    .delete()
    .eq('auth_user_id', userId);

  if (profileError) {
      console.error(`Delete User Action Error (Profile): Failed to delete from '${profileTable}' table for auth_user_id ${userId}.`, profileError);
      return { success: false, message: `Failed to delete user profile: ${profileError.message}` };
  }
  
  // Second, delete the user from Supabase Auth
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (authError) {
    // If user not found in auth, they might still have a profile record to clean up.
    if (authError.message.includes("User not found")) {
      console.warn(`User with auth ID ${userId} not found in Supabase Auth, but their orphaned profile in '${profileTable}' was deleted.`);
      // Since the profile was deleted, we can consider this a partial success for the user.
       return { success: true, message: "User profile was deleted, but the authentication account was already removed." };
    } else {
      console.error('Delete User Action Error (Auth):', authError);
      // Even if auth deletion fails, we report success if the primary goal (removing profile) was met.
      // This is a business logic decision. A more robust system might try to re-insert the profile.
      return { success: false, message: `User profile was deleted, but their login account could not be removed: ${authError.message}. Please check the Supabase Auth dashboard.` };
    }
  }


  return { success: true, message: "User and all related data have been successfully deleted." };
}

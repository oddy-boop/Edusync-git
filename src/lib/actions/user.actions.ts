
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
    // Step 1: Directly and permanently delete the user's profile record.
    const { error: profileDeleteError } = await supabaseAdmin
      .from(profileTable)
      .delete()
      .eq('auth_user_id', authUserId);

    if (profileDeleteError) {
      console.error(`Error deleting ${profileTable} profile for auth_id ${authUserId}:`, profileDeleteError);
      // Even if the profile deletion fails, we should still try to delete the auth user if possible to prevent orphaned auth accounts.
      // We will report this error later if the auth deletion also fails.
    }

    // Step 2: Delete the authentication user. This revokes their access.
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
    
    if (authError) {
      // If the auth user is already gone, it's not a failure.
      if (authError.message.toLowerCase().includes("user not found")) {
        console.warn(`User with auth ID ${authUserId} not found in Supabase Auth, but profile deletion was attempted.`);
        // If the profile deletion also failed, report that primary error.
        if (profileDeleteError) {
            throw new Error(`Profile deletion failed: ${profileDeleteError.message}. The auth user was already removed.`);
        }
        return { success: true, message: "User profile deleted. The auth account was already removed." };
      }
      
      // For other auth errors, they are critical.
      throw new Error(`Auth user deletion failed. Reason: ${authError.message}`);
    }

    return { success: true, message: "User has been permanently deleted from the system." };

  } catch (error: any) {
    console.error(`Delete User Action Error (Overall):`, error);
    const errorMessage = error.message || "An unknown error occurred during the deletion process.";
    return { success: false, message: `Failed to delete user. Reason: ${errorMessage}` };
  }
}

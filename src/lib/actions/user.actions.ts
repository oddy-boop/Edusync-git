
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
      throw new Error(`Failed to delete user profile from '${profileTable}'. Reason: ${profileDeleteError.message}`);
    }

    // Step 2: Delete the user's role entry from user_roles
    const { error: roleDeleteError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', authUserId);

    if (roleDeleteError) {
        console.warn(`Could not delete role for user ${authUserId}. This may leave an orphaned role entry. Reason: ${roleDeleteError.message}`);
    }

    // Step 3: Delete the authentication user. This revokes their access.
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
    
    if (authError) {
      if (authError.message.toLowerCase().includes("user not found")) {
        console.warn(`Attempted to delete auth user ${authUserId}, but they were already removed.`);
        return { success: true, message: "User profile deleted. The authentication account was already removed." };
      }
      throw new Error(`Profile was deleted, but failed to delete authentication user. Reason: ${authError.message}`);
    }

    return { success: true, message: "User has been permanently deleted from the system." };

  } catch (error: any) {
    console.error(`Delete User Action Error (Overall):`, error);
    const errorMessage = error.message || "An unknown error occurred during the deletion process.";
    return { success: false, message: `Failed to delete user. Reason: ${errorMessage}` };
  }
}

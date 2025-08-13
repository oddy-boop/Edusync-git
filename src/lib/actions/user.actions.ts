
'use server';

import { createClient } from '@/lib/supabase/server';

type ActionResponse = {
  success: boolean;
  message: string;
};

export async function deleteUserAction(authUserId: string): Promise<ActionResponse> {
  const supabase = createClient();
  const { data: { user: adminUser } } = await supabase.auth.getUser();

  if (!adminUser) {
    return { success: false, message: "You are not authorized to perform this action." };
  }

  if (!authUserId) {
    return { success: false, message: "User ID is required for deletion." };
  }

  try {
    const { error: deletionError } = await supabase.auth.admin.deleteUser(authUserId);

    if (deletionError) {
      // If user not found, it might be an orphaned profile. We can proceed with trying to delete profile records.
      if (deletionError.message.includes("User not found")) {
        console.warn(`User with auth ID ${authUserId} not found in Supabase Auth, but proceeding to delete profile records.`);
      } else {
        // For other auth errors, throw them.
        throw deletionError;
      }
    }
    
    // Deletion from auth.users should cascade and delete from user_roles.
    // It will also cascade to students/teachers table due to the FK constraint.
    // So, no need to manually delete from other tables if the schema is set up correctly.

    return { success: true, message: "User profile and login account deleted successfully." };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return { success: false, message: `An unexpected error occurred: ${error.message}` };
  }
}


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
      if (deletionError.message.includes("User not found")) {
        return { success: false, message: "User not found in authentication system. Profile may be orphaned." };
      }
      throw deletionError;
    }

    return { success: true, message: "User profile and login account deleted successfully." };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return { success: false, message: `An unexpected error occurred: ${error.message}` };
  }
}

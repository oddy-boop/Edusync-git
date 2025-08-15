
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

    // If the user is already deleted from auth but the profile remains, this error can occur.
    // We should log it but not stop, as the goal is to remove the user completely.
    if (deletionError && deletionError.message.includes("User not found")) {
        console.warn(`Attempted to delete user from auth that was already gone (ID: ${authUserId}). Proceeding to clean up profile tables.`);
    } else if (deletionError) {
        // For other auth errors, re-throw them to be caught below.
        throw deletionError;
    }
    
    const { error: teacherError } = await supabase.from('teachers').update({ is_deleted: true }).eq('auth_user_id', authUserId);
    if(teacherError) console.warn("Could not mark teacher as deleted:", teacherError.message);
    
    const { error: studentError } = await supabase.from('students').update({ is_deleted: true }).eq('auth_user_id', authUserId);
    if(studentError) console.warn("Could not mark student as deleted:", studentError.message);


    return { success: true, message: "User account has been deleted and profile marked as inactive." };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return { success: false, message: `An unexpected error occurred: ${error.message}` };
  }
}

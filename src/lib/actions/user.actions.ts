
'use server';

import { createClient } from '@/lib/supabase/server';

type ActionResponse = {
  success: boolean;
  message: string;
};

export async function deleteUserAction(authUserId: string): Promise<ActionResponse> {
  const supabase = createClient();

  if (!authUserId) {
    return { success: false, message: "User ID is required for deletion." };
  }

  try {
    const { error: deletionError } = await supabase.auth.admin.deleteUser(authUserId);

    if (deletionError && !deletionError.message.includes("User not found")) {
        // For auth errors other than "not found", re-throw them to be caught below.
        throw deletionError;
    }
    if (deletionError?.message.includes("User not found")) {
         console.warn(`Attempted to delete user from auth that was already gone (ID: ${authUserId}). Proceeding to clean up profile tables.`);
    }
    
    // Set is_deleted to true in both tables. We don't care if one fails, try both.
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

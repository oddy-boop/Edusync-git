
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
    
    // The database schema now uses ON DELETE CASCADE for the `auth_user_id` foreign key
    // in both `students` and `teachers` tables. When `supabase.auth.admin.deleteUser`
    // removes the user from `auth.users`, the database will automatically delete the
    // corresponding row in the `students` or `teachers` table.
    //
    // The same cascade applies to the `user_roles` table.
    //
    // Therefore, manual deletion from profile tables is no longer necessary if the
    // schema is set up correctly.
    // I am adding an explicit delete just in case the cascade fails for some reason.
    
    const { error: studentDeleteError } = await supabase.from('students').delete().eq('auth_user_id', authUserId);
    if(studentDeleteError) console.warn("Could not clean student profile, may have been cascaded already.", studentDeleteError.message);

    const { error: teacherDeleteError } = await supabase.from('teachers').delete().eq('auth_user_id', authUserId);
    if(teacherDeleteError) console.warn("Could not clean teacher profile, may have been cascaded already.", teacherDeleteError.message);

    return { success: true, message: "User account and profile deleted successfully." };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return { success: false, message: `An unexpected error occurred: ${error.message}` };
  }
}

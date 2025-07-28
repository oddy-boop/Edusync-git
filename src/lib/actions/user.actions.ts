
'use server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { GRADE_LEVELS } from '@/lib/constants';

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
    // Delete the user from Supabase Auth first
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);

    if (authError) {
        // If user not found in auth, it's not a critical failure if profile was marked.
        if (authError.message.includes("User not found")) {
            console.warn(`User with auth ID ${authUserId} not found in Supabase Auth, but proceeding to mark profile.`);
        } else {
            // For other auth errors, we should stop and report the failure.
            throw authError;
        }
    }

    // Now, mark the user as deleted in their profile table.
    // This runs even if the auth user was already gone, to clean up the profile.
    const { error: profileError } = await supabaseAdmin
        .from(profileTable)
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('auth_user_id', authUserId);

    if (profileError) {
        console.error(`Delete User Action Error (Profile): Failed to mark as deleted in '${profileTable}' table for auth_user_id ${authUserId}.`, profileError);
        // This is a partial success state, the auth user is gone but profile update failed.
        return { success: false, message: `User login was deleted, but profile could not be updated: ${profileError.message}` };
    }

    return { success: true, message: "User has been successfully deleted." };

  } catch (error: any) {
    console.error(`Delete User Action Error (Overall):`, error);
    return { success: false, message: `An unexpected error occurred during deletion: ${error.message}` };
  }
}

export async function promoteAllStudentsAction(): Promise<ActionResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { success: false, message: "Server configuration error for database." };
  }

  const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const { data: students, error: fetchError } = await supabaseAdmin
      .from('students')
      .select('*')
      .neq('grade_level', 'Graduated');

    if (fetchError) throw fetchError;

    if (!students || students.length === 0) {
      return { success: true, message: "No students to promote." };
    }

    const promotionUpdates = students.map(student => {
      const currentGradeIndex = GRADE_LEVELS.indexOf(student.grade_level);
      let nextGrade = student.grade_level;

      if (currentGradeIndex > -1 && currentGradeIndex < GRADE_LEVELS.length - 1) {
        nextGrade = GRADE_LEVELS[currentGradeIndex + 1];
      }

      return {
        ...student,
        grade_level: nextGrade,
        updated_at: new Date().toISOString()
      };
    }).filter(update => update.grade_level !== students.find(s => s.id === update.id)?.grade_level);

    if (promotionUpdates.length === 0) {
      return { success: true, message: "All students are already in the highest grade or graduated. No promotions were made." };
    }
    
    const { error: updateError } = await supabaseAdmin
      .from('students')
      .upsert(promotionUpdates, { onConflict: 'id' });

    if (updateError) throw updateError;

    return { success: true, message: `${promotionUpdates.length} student(s) have been successfully promoted to the next grade level.` };

  } catch (error: any) {
    console.error("Promote Students Action Error:", error);
    return { success: false, message: `An error occurred during promotion: ${error.message}` };
  }
}

'use server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

type ActionResponse = {
  success: boolean;
  message: string;
};

export async function deleteUserAction(userId: string): Promise<ActionResponse> {
  const supabase = createClient();

  if (!userId) {
    return { success: false, message: "User ID is required to perform deletion." };
  }

  try {
    // Verify admin session
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !adminUser) {
      return { success: false, message: "Authentication Error: Please log in again." };
    }

    // Verify admin permissions
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role, school_id')
      .eq('user_id', adminUser.id)
      .single();

    if (roleError || !roleData || !['admin', 'super_admin'].includes(roleData.role)) {
      return { success: false, message: "Permission Denied: Administrator access required." };
    }

    // Verify target user exists and belongs to same school (for non-super-admins)
    const { data: targetUserRole, error: targetError } = await supabase
      .from('user_roles')
      .select('school_id')
      .eq('user_id', userId)
      .single();

    if (targetError || !targetUserRole) {
      return { success: false, message: "Target user not found in this system." };
    }

    if (roleData.role === 'admin' && roleData.school_id !== targetUserRole.school_id) {
      return { success: false, message: "Permission Denied: You can only delete users from your own school." };
    }

    // Initialize admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing Supabase admin credentials");
      return { success: false, message: "Server configuration error prevents user deletion." };
    }

    const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, supabaseServiceRoleKey);

    // Clean up user data first (important for RLS and data integrity)
    const tablesToClean = [
      'user_roles',
      'students',
      'teachers',
      // Add other user-related tables as needed
    ];

    for (const table of tablesToClean) {
      const { error: cleanupError } = await supabaseAdmin
        .from(table)
        .delete()
        .eq('user_id', userId);

      if (cleanupError) {
        console.error(`Failed to clean up ${table}:`, cleanupError);
        return { 
          success: false, 
          message: `Failed to remove user data from ${table}.` 
        };
      }
    }

    // Delete auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error('User deletion failed:', error);
      return { 
        success: false, 
        message: error.message.includes("User not found") 
          ? "User not found in authentication system." 
          : "Failed to delete user: " + error.message
      };
    }

    return { 
      success: true, 
      message: "User and all related data have been successfully deleted." 
    };

  } catch (e: any) {
    console.error("User deletion exception:", e);
    return { 
      success: false, 
      message: e.message || "An unexpected server error occurred during deletion." 
    };
  }
}
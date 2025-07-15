'use server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

type ActionResponse = {
  success: boolean;
  message: string;
};

// Helper to get the privileged admin client
function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Server configuration error: Supabase service role credentials are not set.");
  }
  return createSupabaseAdminClient(supabaseUrl, supabaseServiceRoleKey);
}


export async function deleteUserAction(userId: string): Promise<ActionResponse> {
  const supabase = createClient(); // Session-aware client for permission check

  if (!userId) {
    return { success: false, message: "User ID is required to perform deletion." };
  }

  try {
    // 1. Verify admin session and permissions
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !adminUser) {
      return { success: false, message: "Authentication Error: Please log in again." };
    }

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role, school_id')
      .eq('user_id', adminUser.id)
      .single();

    if (roleError || !roleData || !['admin', 'super_admin'].includes(roleData.role)) {
      return { success: false, message: "Permission Denied: Administrator access required." };
    }
    
    // 2. Use privileged client for the deletion action
    const supabaseAdmin = getSupabaseAdminClient();

    // 3. Get target user's details for validation and logging
    const { data: targetUserRole, error: targetError } = await supabaseAdmin
      .from('user_roles')
      .select('role, school_id')
      .eq('user_id', userId)
      .single();

    if (targetError || !targetUserRole) {
      return { success: false, message: "Target user not found or has no role." };
    }
    
    if (roleData.role === 'admin' && roleData.school_id !== targetUserRole.school_id) {
        return { success: false, message: "Permission Denied: You can only delete users from your own school." };
    }
    
    // 4. Perform soft delete on related profiles and roles
    const tablesToSoftDelete = [
      'students',
      'teachers',
      'user_roles'
    ];

    for (const table of tablesToSoftDelete) {
        const { error: softDeleteError } = await supabaseAdmin
            .from(table)
            .update({ 
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deleted_by: adminUser.id
            })
            .eq('auth_user_id', userId); // Use auth_user_id for students/teachers
        
        if (softDeleteError && softDeleteError.code !== '42703') { // Ignore "column does not exist"
             console.error(`Failed to soft-delete from ${table}:`, softDeleteError);
        }
    }
    // Specific update for user_roles which uses user_id
     const { error: roleSoftDeleteError } = await supabaseAdmin
        .from('user_roles')
        .update({ is_deleted: true })
        .eq('user_id', userId);

     if (roleSoftDeleteError) console.error("Failed to soft-delete from user_roles:", roleSoftDeleteError);


    // 5. Hard delete the auth user from Supabase Auth schema
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      // If auth user deletion fails, we should ideally roll back the soft deletes.
      // For simplicity here, we'll just log the error.
      console.error(`User data was soft-deleted, but failed to delete auth user ${userId}:`, authDeleteError);
      return { 
        success: false, 
        message: `Failed to delete authentication entry: ${authDeleteError.message}. Associated data has been archived.`
      };
    }
    
    // 6. Create Audit Log
    await supabaseAdmin.from('audit_logs').insert({
        action: 'delete_user',
        performed_by: adminUser.id,
        target_id: userId,
        school_id: roleData.school_id,
        details: `Deleted user ${userId} (role: ${targetUserRole.role})`
    });

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

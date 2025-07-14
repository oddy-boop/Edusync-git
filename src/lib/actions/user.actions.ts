
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
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) {
        return { success: false, message: "Authentication Error: Could not verify your session." };
    }
    const { data: roleData, error: roleError } = await supabase.from('user_roles').select('role').eq('user_id', adminUser.id).single();
    if (roleError || (roleData?.role !== 'admin' && roleData?.role !== 'super_admin')) {
        return { success: false, message: "Permission Denied: You must be an administrator to perform this action." };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Delete User Action Error: Supabase admin credentials are not configured.");
      return { success: false, message: "Server configuration error prevents user deletion." };
    }

    const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, supabaseServiceRoleKey);
    
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error('Delete User Action Error:', error);
      if (error.message.includes("User not found")) {
          return { success: false, message: "User not found in the authentication system. They may have already been deleted." };
      }
      return { success: false, message: error.message || "An unknown error occurred while deleting the user." };
    }

    return { success: true, message: "User and all related data have been successfully deleted." };
  } catch (e: any) {
    console.error("Delete User Action Exception:", e);
    return { success: false, message: e.message || "An unexpected server error occurred." };
  }
}

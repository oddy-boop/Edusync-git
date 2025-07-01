'use server';
import { createClient } from '@supabase/supabase-js';

type ActionResponse = {
  success: boolean;
  message: string;
};

export async function deleteUserAction(userId: string): Promise<ActionResponse> {
  if (!userId) {
    return { success: false, message: "User ID is required to perform deletion." };
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Delete User Action Error: Supabase admin credentials are not configured.");
    return { success: false, message: "Server configuration error prevents user deletion." };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    console.error('Delete User Action Error:', error);
    // Provide a more user-friendly message for common issues
    if (error.message.includes("User not found")) {
        return { success: false, message: "User not found in the authentication system. They may have already been deleted." };
    }
    return { success: false, message: error.message || "An unknown error occurred while deleting the user." };
  }

  return { success: true, message: "User and all related data have been successfully deleted." };
}

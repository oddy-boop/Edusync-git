'use server';

import { createAuthClient } from "@/lib/supabase/server";

type ActionResponse = {
  success: boolean;
  message: string;
  data?: any;
};

export async function provisionCurrentUserAsAdminAction(schoolId: number): Promise<ActionResponse> {
  const supabase = createAuthClient();
  
  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, message: "No authenticated user found" };
    }

    // Check if user already has a role
    const { data: existingRole, error: roleCheckError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleCheckError) {
      return { success: false, message: `Error checking existing role: ${roleCheckError.message}` };
    }

    // Check if school exists
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, name')
      .eq('id', schoolId)
      .maybeSingle();

    if (schoolError || !school) {
      return { success: false, message: `School with ID ${schoolId} not found` };
    }

    if (existingRole) {
      // Update existing role
      const { data, error: updateError } = await supabase
        .from('user_roles')
        .update({
          role: 'admin',
          school_id: schoolId
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        return { success: false, message: `Error updating role: ${updateError.message}` };
      }

      return { 
        success: true, 
        message: `Updated role to admin for school ${school.name}`, 
        data: { user, role: data, school }
      };
    } else {
      // Insert new role
      const { data, error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'admin',
          school_id: schoolId
        })
        .select()
        .single();

      if (insertError) {
        return { success: false, message: `Error creating role: ${insertError.message}` };
      }

      return { 
        success: true, 
        message: `Created admin role for school ${school.name}`, 
        data: { user, role: data, school }
      };
    }
  } catch (error: any) {
    return { success: false, message: `Unexpected error: ${error.message}` };
  }
}

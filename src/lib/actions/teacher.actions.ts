'use server';

import { getLessonPlanIdeas, type LessonPlanIdeasInput, type LessonPlanIdeasOutput } from "@/ai/flows/lesson-plan-ideas";
import { z } from "zod";
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'; // Use the server-aware client

const LessonPlannerSchema = z.object({
  subject: z.string().min(1, "Subject is required."),
  topic: z.string().min(1, "Topic is required."),
});

export async function generateLessonPlanIdeasAction(
  prevState: any,
  formData: FormData
): Promise<{
  message: string;
  data: LessonPlanIdeasOutput | null;
  errors?: { subject?: string[]; topic?: string[] };
}> {
  const validatedFields = LessonPlannerSchema.safeParse({
    subject: formData.get("subject"),
    topic: formData.get("topic"),
  });

  if (!validatedFields.success) {
    return {
      message: "Validation failed.",
      data: null,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const input: LessonPlanIdeasInput = {
    subject: validatedFields.data.subject,
    topic: validatedFields.data.topic,
  };

  try {
    const result = await getLessonPlanIdeas(input);
    return { message: "Lesson plan ideas generated successfully.", data: result };
  } catch (error) {
    console.error("[generateLessonPlanIdeasAction] Error generating lesson plan ideas:", error);
    let errorMessage = "Failed to generate lesson plan ideas. Please check server logs for more details.";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { message: errorMessage, data: null };
  }
}

const teacherSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  email: z.string().email("Invalid email address."),
  subjectsTaught: z.string().optional(),
  contactNumber: z.string()
    .min(10, "Contact number must be at least 10 digits.")
    .refine(
      (val) => {
        const internationalFormat = /^\+\d{11,14}$/;
        const localFormat = /^0\d{9}$/;
        return internationalFormat.test(val) || localFormat.test(val);
      },
      {
        message: "Invalid phone. Expecting format like +233XXXXXXXXX or 0XXXXXXXXX."
      }
    ),
  assignedClasses: z.preprocess(
    (val) => (typeof val === 'string' && val.length > 0 ? val.split(',') : []),
    z.array(z.string()).min(1, { message: "At least one class must be assigned." })
  ),
});


type ActionResponse = {
  success: boolean;
  message: string;
  temporaryPassword?: string | null;
};

// This helper is for creating the privileged client
function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Server configuration error: Supabase service role credentials are not set.");
  }
  return createSupabaseServerClient(supabaseUrl, supabaseServiceRoleKey);
}

export async function registerTeacherAction(prevState: any, formData: FormData): Promise<ActionResponse> {
  const supabase = createSupabaseServerClient(); // Session-aware client
  const supabaseAdmin = getSupabaseAdminClient(); // Privileged client

  try {
     // 1. Check if the current user is an admin
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) {
      return { success: false, message: 'Authentication Error: Please log in again.' };
    }
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles').select('role').eq('user_id', adminUser.id).single();
    if (roleError || !roleData || !['admin', 'super_admin'].includes(roleData.role)) {
      return { success: false, message: 'Permission Denied: You must be an administrator to perform this action.' };
    }

    // 2. Validate form data
    const validatedFields = teacherSchema.safeParse({
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      subjectsTaught: formData.get('subjectsTaught'),
      contactNumber: formData.get('contactNumber'),
      assignedClasses: formData.get('assignedClasses'),
    });

    if (!validatedFields.success) {
      const errorMessages = Object.values(validatedFields.error.flatten().fieldErrors)
        .flat()
        .join(' ');
      return { success: false, message: `Validation failed: ${errorMessages || 'Check your input.'}` };
    }
    
    const { fullName, email, contactNumber, subjectsTaught: subjectsTaughtString, assignedClasses } = validatedFields.data;
    const subjectsTaught = subjectsTaughtString ? subjectsTaughtString.split(',').map(s => s.trim()).filter(Boolean) : [];
    const lowerCaseEmail = email.toLowerCase();
    
    // 3. Create the user
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const redirectTo = `${siteUrl}/auth/update-password`;
    
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      lowerCaseEmail,
      {
        data: { full_name: fullName },
        redirectTo: redirectTo,
      }
    );

    if (inviteError) {
      if (inviteError.message.includes('User already registered')) {
        return { success: false, message: `An account with the email ${lowerCaseEmail} already exists.` };
      }
      throw inviteError;
    }
    if (!inviteData?.user) throw new Error("User invitation did not return the expected user object.");

    const newUser = inviteData.user;
    
    // 4. Create the teacher profile
    const { error: teacherInsertError } = await supabaseAdmin
      .from('teachers')
      .insert({
        auth_user_id: newUser.id,
        full_name: fullName,
        email: lowerCaseEmail,
        contact_number: contactNumber,
        subjects_taught: subjectsTaught,
        assigned_classes: assignedClasses,
      });

    if (teacherInsertError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.id);
      throw new Error(`Failed to create teacher profile: ${teacherInsertError.message}`);
    }

    // 5. Create the user role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: newUser.id, role: 'teacher' });
      
    if (roleInsertError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.id); // Attempt cleanup
      throw new Error(`Failed to assign teacher role: ${roleInsertError.message}`);
    }

    // 6. Respond with success
    const showPassword = process.env.APP_MODE === 'development';
    const successMessage = `Teacher ${fullName} has been invited. They must check their email at ${lowerCaseEmail} to complete registration.`;

    return { 
      success: true, 
      message: successMessage,
      temporaryPassword: showPassword ? inviteData.user.user_metadata?.temporary_password : null,
    };

  } catch (error: any) {
    console.error("Teacher Registration Action Error:", error);
    let userMessage = error.message || "An unexpected error occurred.";
    return { success: false, message: userMessage };
  }
}

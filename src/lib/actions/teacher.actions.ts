
'use server';

import { getLessonPlanIdeas, type LessonPlanIdeasInput, type LessonPlanIdeasOutput } from "@/ai/flows/lesson-plan-ideas";
import { z } from "zod";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from '@/lib/supabase/server'; 

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

// Helper to get the privileged admin client
function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Server configuration error: Supabase service role credentials are not set.");
  }
  return createSupabaseAdminClient(supabaseUrl, supabaseServiceRoleKey);
}

export async function registerTeacherAction(prevState: any, formData: FormData): Promise<ActionResponse> {
  const supabase = createClient();

  try {
    // 1. Verify creator session and permissions
    const { data: { user: creatorUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !creatorUser) {
      return { success: false, message: "Authentication Error: Please log in again." };
    }
    
    const { data: adminRoleData, error: adminRoleError } = await supabase
      .from('user_roles')
      .select('school_id')
      .eq('user_id', creatorUser.id)
      .single();

    if (adminRoleError || !adminRoleData?.school_id) {
      throw new Error(`Could not find the school for the current admin: ${adminRoleError?.message || 'No school ID found'}.`);
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
    
    // 3. Use the privileged Supabase Admin client for creation
    const supabaseAdmin = getSupabaseAdminClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // 4. Invite user and create records
    const redirectTo = `${siteUrl}/auth/update-password`;
    const { data: newUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        lowerCaseEmail,
        { 
          data: { 
            role: 'teacher', 
            full_name: fullName,
            school_id: adminRoleData.school_id,
            // Pass teacher-specific data for the trigger
            contact_number: contactNumber,
            subjects_taught: subjectsTaught,
            assigned_classes: assignedClasses,
          },
          redirectTo: redirectTo,
        }
    );
    if (inviteError) {
        if (inviteError.message.includes('User already registered')) {
            return { success: false, message: `An account with the email ${lowerCaseEmail} already exists.` };
        }
        throw inviteError;
    }
    if (!newUser?.user) throw new Error("User invitation did not return the expected user object.");
    
    // The database trigger 'handle_new_user' will now create the user_roles and teachers records.

    const successMessage = `Teacher ${fullName} has been invited. They must check their email at ${lowerCaseEmail} to complete registration.`;

    return { 
      success: true, 
      message: successMessage,
    };

  } catch (error: any) {
    console.error("Teacher Registration Action Error:", error);
    let userMessage = error.message || "An unexpected error occurred.";
    return { success: false, message: userMessage };
  }
}

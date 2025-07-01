
"use server";

import { getLessonPlanIdeas, type LessonPlanIdeasInput, type LessonPlanIdeasOutput } from "@/ai/flows/lesson-plan-ideas";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from 'crypto';

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
  subjectsTaught: z.string().min(3, "Please list at least one subject area."),
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
  assignedClasses: z.string().transform(val => val ? val.split(',').filter(Boolean) : []),
});

type ActionResponse = {
  success: boolean;
  message: string;
  temporaryPassword?: string | null;
};


export async function registerTeacherAction(prevState: any, formData: FormData): Promise<ActionResponse> {
  const assignedClassesValue = formData.get('assignedClasses');
  
  const validatedFields = teacherSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    subjectsTaught: formData.get('subjectsTaught'),
    contactNumber: formData.get('contactNumber'),
    assignedClasses: assignedClassesValue,
  });

  if (!validatedFields.success) {
    const errorMessages = Object.values(validatedFields.error.flatten().fieldErrors)
      .flat()
      .join(' ');
    return { success: false, message: `Validation failed: ${errorMessages}` };
  }
  
  const { fullName, email, subjectsTaught, contactNumber, assignedClasses } = validatedFields.data;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isDevelopmentMode = process.env.APP_MODE === 'development';

  if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Teacher Registration Error: Supabase credentials are not configured.");
      return { success: false, message: "Server configuration error for database. Cannot process registration." };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    let authUserId: string;
    let tempPassword: string | null = null;

    // DEVELOPMENT MODE: Create user directly with temporary password
    if (isDevelopmentMode) {
        const temporaryPassword = randomBytes(12).toString('hex');
        tempPassword = temporaryPassword;
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: temporaryPassword,
            email_confirm: true,
            user_metadata: { role: 'teacher', full_name: fullName }
        });
        if (createError) {
            if (createError.message.includes('User already registered')) {
                return { success: false, message: `An account with the email ${email} already exists.` };
            }
            throw createError;
        }
        if (!newUser?.user) {
            throw new Error("User creation did not return the expected user object in dev mode.");
        }
        authUserId = newUser.user.id;
    } else { // PRODUCTION MODE: Invite user by email
        const { data: newUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
            email,
            { data: { full_name: fullName, role: 'teacher' } }
        );
        if (inviteError) {
            if (inviteError.message.includes('User already registered')) {
                return { success: false, message: `An account with the email ${email} already exists.` };
            }
            throw inviteError;
        }
        if (!newUser?.user) {
            throw new Error("User invitation did not return the expected user object.");
        }
        authUserId = newUser.user.id;
    }
    
    // The trigger will have created a basic teacher profile. Now we update it.
    const { error: profileUpdateError } = await supabaseAdmin
        .from('teachers')
        .update({
            contact_number: contactNumber,
            subjects_taught: subjectsTaught,
            assigned_classes: assignedClasses,
            updated_at: new Date().toISOString()
        })
        .eq('auth_user_id', authUserId);
    
    if (profileUpdateError) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        throw new Error(`Failed to update teacher profile after creation: ${profileUpdateError.message}`);
    }

    const successMessage = isDevelopmentMode
      ? `Teacher ${fullName} created in dev mode. Share the temporary password with them.`
      : `Teacher ${fullName} has been invited. They must check their email at ${email} to complete registration.`;

    return { 
      success: true, 
      message: successMessage,
      temporaryPassword: tempPassword,
    };

  } catch (error: any) {
    console.error("Teacher Registration Action Error:", error);
    return { success: false, message: error.message || "An unexpected error occurred." };
  }
}

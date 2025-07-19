
'use server';

import { getLessonPlanIdeas, type LessonPlanIdeasInput, type LessonPlanIdeasOutput } from "@/ai/flows/lesson-plan-ideas";
import { z } from "zod";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { randomBytes } from 'crypto';
import { createClient as createServerClient } from '@/lib/supabase/server';

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
  subjectsTaught: z.string().transform(val => val ? val.split(',').map(s => s.trim()).filter(Boolean) : []).refine(val => val.length > 0, "Please list at least one subject area."),
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
  assignedClasses: z.string().transform(val => val ? val.split(',').filter(Boolean) : []).refine(val => val.length > 0, "At least one class must be assigned."),
});

type ActionResponse = {
  success: boolean;
  message: string;
  temporaryPassword?: string | null;
};


export async function registerTeacherAction(prevState: any, formData: FormData): Promise<ActionResponse> {
  const serverSupabase = createServerClient();
  const { data: { user: adminUser } } = await serverSupabase.auth.getUser();

  if (!adminUser) {
    return { success: false, message: "Action failed. Current admin is not authenticated." };
  }

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
  const lowerCaseEmail = email.toLowerCase();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isDevelopmentMode = process.env.APP_MODE === 'development';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Teacher Registration Error: Supabase credentials are not configured.");
      return { success: false, message: "Server configuration error for database. Cannot process registration." };
  }

  const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const schoolId = 1;

  try {
    let authUserId: string;
    let tempPassword: string | null = null;
   
    if (isDevelopmentMode) {
        const temporaryPassword = randomBytes(12).toString('hex');
        tempPassword = temporaryPassword;
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: lowerCaseEmail,
            password: temporaryPassword,
            email_confirm: true,
            user_metadata: { role: 'teacher', full_name: fullName }
        });
        if (createError) throw createError;
        if (!newUser?.user) throw new Error("User creation did not return the expected user object in dev mode.");
        authUserId = newUser.user.id;
    } else {
        const redirectTo = `${siteUrl}/auth/update-password`;
        const { data: newUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
            lowerCaseEmail,
            { 
              data: { full_name: fullName, role: 'teacher' },
              redirectTo: redirectTo,
            }
        );
        if (inviteError) throw inviteError;
        if (!newUser?.user) throw new Error("User invitation did not return the expected user object.");
        authUserId = newUser.user.id;
    }

    const { error: roleError } = await supabaseAdmin.from('user_roles').upsert(
      { user_id: authUserId, role: 'teacher' },
      { onConflict: 'user_id' }
    );
    if (roleError) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        throw new Error(`Failed to assign role: ${roleError.message}`);
    }

    const { error: profileError } = await supabaseAdmin.from('teachers').upsert({
        auth_user_id: authUserId,
        full_name: fullName,
        email: lowerCaseEmail,
        contact_number: contactNumber,
        subjects_taught: subjectsTaught,
        assigned_classes: assignedClasses,
        school_id: schoolId,
        updated_at: new Date().toISOString()
    }, { onConflict: 'auth_user_id' });

    if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        throw new Error(`Failed to create/update teacher profile: ${profileError.message}`);
    }

    const successMessage = isDevelopmentMode && tempPassword
      ? `Teacher ${fullName} created in dev mode. Share the temporary password with them.`
      : `Teacher ${fullName} has been invited. They must check their email at ${lowerCaseEmail} to complete registration.`;

    return { 
      success: true, 
      message: successMessage,
      temporaryPassword: tempPassword,
    };

  } catch (error: any) {
    console.error("Teacher Registration Action Error:", error);
    let userMessage = error.message || "An unexpected error occurred.";
    if (error.message && error.message.toLowerCase().includes('user already registered')) {
        userMessage = `An account with the email ${lowerCaseEmail} already exists. You cannot register them again.`;
    }
    return { success: false, message: userMessage };
  }
}

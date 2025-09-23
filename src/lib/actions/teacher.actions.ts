
'use server';

import { getLessonPlanIdeas, type LessonPlanIdeasInput, type LessonPlanIdeasOutput } from "@/ai/flows/lesson-plan-ideas";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAuthClient } from "@/lib/supabase/server";
import { Resend } from 'resend';
import { randomBytes } from 'crypto';
import { headers } from 'next/headers';

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
  dateOfBirth: z.string().optional(),
  location: z.string().optional(),
  subjectsTaught: z.array(z.string()).min(1, "Please select at least one subject area."),
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
  assignedClasses: z.array(z.string()).min(1, "At least one class must be assigned."),
});

type ActionResponse = {
  success: boolean;
  message: string;
  temporaryPassword?: string | null;
};


export async function registerTeacherAction(prevState: any, formData: FormData): Promise<ActionResponse> {
  const authSupabase = createAuthClient();
  const serviceSupabase = createClient(); // Service role client to bypass RLS
  
  const subjectsTaughtValue = formData.get('subjectsTaught');
  const assignedClassesValue = formData.get('assignedClasses');
  
  const validatedFields = teacherSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    dateOfBirth: formData.get('dateOfBirth'),
    location: formData.get('location'),
    subjectsTaught: typeof subjectsTaughtValue === 'string' ? subjectsTaughtValue.split(',') : [],
    contactNumber: formData.get('contactNumber'),
    assignedClasses: typeof assignedClassesValue === 'string' ? assignedClassesValue.split(',') : [],
  });

  if (!validatedFields.success) {
    const errorMessages = Object.values(validatedFields.error.flatten().fieldErrors)
      .flat()
      .join(' ');
    return { success: false, message: `Validation failed: ${errorMessages}` };
  }
  
  const { fullName, email, dateOfBirth, location, subjectsTaught, contactNumber, assignedClasses } = validatedFields.data;
  const lowerCaseEmail = email.toLowerCase();
  
  const isDevelopmentMode = process.env.APP_MODE === 'development';

  try {
    // Verify current user is an admin and get their school_id
    const { data: { user } } = await authSupabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Unauthorized, you must be logged in as an admin." };
    }
    
    const { data: adminRole } = await authSupabase
      .from('user_roles')
      .select('role, school_id')
      .eq('user_id', user.id)
      .single();
    
    if (!adminRole || adminRole.role !== 'admin') {
      return { success: false, message: "Unauthorized, you must be logged in as an admin." };
    }
    
    const { data: existingUser } = await serviceSupabase.from('auth.users').select('id').eq('email', lowerCaseEmail).single();
    if (existingUser) {
      return { success: false, message: `An account with the email ${lowerCaseEmail} already exists.` };
    }

    const temporaryPassword = randomBytes(12).toString('hex');
    
    // Invite the user, which sends a magic link/invite email
  const headersList = await headers();
  const siteUrl = headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const { data: inviteData, error: inviteError } = await serviceSupabase.auth.admin.inviteUserByEmail(
      lowerCaseEmail,
      { data: { full_name: fullName }, redirectTo: `${siteUrl}/auth/update-password` }
    );
    
    if (inviteError) throw inviteError;
    const newUserId = inviteData.user.id;

    // Insert into teachers profile table
    const { error: teacherInsertError } = await serviceSupabase
      .from('teachers')
      .insert({
        auth_user_id: newUserId, 
        full_name: fullName, 
        email: lowerCaseEmail, 
        date_of_birth: dateOfBirth || null, 
        location: location || null,
        contact_number: contactNumber, 
        subjects_taught: subjectsTaught, 
        assigned_classes: assignedClasses,
        school_id: adminRole.school_id, // Add the missing school_id
             });
    
    if (teacherInsertError) throw teacherInsertError;

    // Insert user role
    const { error: roleError } = await serviceSupabase
        .from('user_roles')
        .insert({ user_id: newUserId, role: 'teacher', school_id: adminRole.school_id });

    if(roleError) throw roleError;
    
    return { 
      success: true, 
      message: `Teacher ${fullName} has been registered and an invitation email has been sent to ${lowerCaseEmail}.`,
      temporaryPassword: null, // Password is set via invitation, not returned here.
    };

  } catch (error: any) {
    console.error("Teacher Registration Action Error:", error);
    return { success: false, message: error.message || "An unexpected error occurred." };
  }
}

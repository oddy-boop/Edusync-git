
"use server";

import { getLessonPlanIdeas, type LessonPlanIdeasInput, type LessonPlanIdeasOutput } from "@/ai/flows/lesson-plan-ideas";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { Resend } from 'resend';

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
  fullName: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  subjectsTaught: z.string().min(3),
  contactNumber: z.string().min(10),
  assignedClasses: z.string().transform(val => val.split(',').filter(Boolean)), // Comes as comma-separated string from FormData
});

export async function registerTeacherAction(prevState: any, formData: FormData) {
  const validatedFields = teacherSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
    subjectsTaught: formData.get('subjectsTaught'),
    contactNumber: formData.get('contactNumber'),
    assignedClasses: formData.get('assignedClasses'),
  });

  if (!validatedFields.success) {
    return { success: false, message: "Validation failed: " + validatedFields.error.flatten().fieldErrors };
  }
  
  const { fullName, email, password, subjectsTaught, contactNumber, assignedClasses } = validatedFields.data;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev';

  if (!supabaseUrl || !supabaseServiceRoleKey || !resendApiKey) {
      console.error("Teacher Registration Error: Server environment variables are not fully configured.");
      return { success: false, message: "Server configuration error. Cannot process registration." };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    // Step 1: Create the user in Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: {
        full_name: fullName,
        role: 'teacher',
      },
    });

    if (createError) throw createError;
    if (!newUser?.user) throw new Error("User creation did not return a user object.");

    // The `handle_new_user_with_profile_creation` trigger will create a basic teacher profile.
    // Now, we update it with the additional details.
    const { error: profileError } = await supabaseAdmin
      .from('teachers')
      .update({
          contact_number: contactNumber,
          subjects_taught: subjectsTaught,
          assigned_classes: assignedClasses,
          updated_at: new Date().toISOString(),
      })
      .eq('auth_user_id', newUser.user.id);
      
    if (profileError) {
      // Attempt to clean up the created auth user if profile update fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Failed to update teacher profile after user creation: ${profileError.message}`);
    }

    // Step 2: Generate verification link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: email,
    });
    if (linkError) throw linkError;
    const verificationLink = linkData.properties?.action_link;
    if (!verificationLink) throw new Error("Failed to generate verification link.");

    // Step 3: Email the link
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: `St. Joseph's Montessori <${fromAddress}>`,
      to: email,
      subject: "Activate Your Teacher Account",
      html: `<h1>Welcome, ${fullName}!</h1><p>Your teacher account has been created. Please click the link below to verify your email and get started:</p><p><a href="${verificationLink}">Verify Your Email</a></p>`,
    });

    return { success: true, message: `Teacher ${fullName} registered. A verification link has been sent to ${email}.` };

  } catch (error: any) {
    console.error("Teacher Registration Action Error:", error);
    return { success: false, message: error.message || "An unexpected error occurred." };
  }
}

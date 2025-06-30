
'use server';

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const studentSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val))),
  gradeLevel: z.string().min(1),
  guardianName: z.string().min(3),
  guardianContact: z.string().min(10),
});

export async function registerStudentAction(prevState: any, formData: FormData) {
  const validatedFields = studentSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
    dateOfBirth: formData.get('dateOfBirth'),
    gradeLevel: formData.get('gradeLevel'),
    guardianName: formData.get('guardianName'),
    guardianContact: formData.get('guardianContact'),
  });

  if (!validatedFields.success) {
    const errorMessages = Object.values(validatedFields.error.flatten().fieldErrors)
      .flat()
      .join(' ');
    return { success: false, message: `Validation failed: ${errorMessages}` };
  }
  
  const { fullName, email, password, dateOfBirth, gradeLevel, guardianName, guardianContact } = validatedFields.data;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev';

  if (!supabaseUrl || !supabaseServiceRoleKey || !resendApiKey) {
      console.error("Student Registration Error: Server environment variables are not fully configured.");
      return { success: false, message: "Server configuration error. Cannot process registration." };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  let newUserId: string | undefined;

  try {
    const studentIdDisplay = `${"2" + (new Date().getFullYear() % 100).toString().padStart(2, '0')}SJM${Math.floor(1000 + Math.random() * 9000).toString()}`;
    
    // Step 1: Create the user in Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: {
        role: 'student',
        full_name: fullName,
        student_id_display: studentIdDisplay,
      },
    });

    if (createError) throw createError;
    if (!newUser?.user) throw new Error("User creation did not return a user object.");
    newUserId = newUser.user.id; // Store for potential cleanup

    // The trigger `handle_new_user_with_profile_creation` creates the basic student profile.
    // Now, we update it with the additional form details.
    const { error: profileError } = await supabaseAdmin
        .from('students')
        .update({
            date_of_birth: dateOfBirth,
            grade_level: gradeLevel,
            guardian_name: guardianName,
            guardian_contact: guardianContact,
            updated_at: new Date().toISOString(),
        })
        .eq('auth_user_id', newUser.user.id);
        
    if (profileError) {
        throw new Error(`Failed to update student profile after user creation: ${profileError.message}`);
    }

    // Step 2: Generate verification link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: email,
    });
    if (linkError) throw linkError;
    const verificationLink = linkData.properties?.action_link;
    if (!verificationLink) throw new Error("Failed to generate verification link.");

    // Step 3: Email the link using Resend
    const resend = new Resend(resendApiKey);
    const { error: emailError } = await resend.emails.send({
        from: `St. Joseph's Montessori <${fromAddress}>`,
        to: email,
        subject: "Activate Your Student Portal Account",
        html: `<h1>Welcome, ${fullName}!</h1><p>Your student portal account has been created. Please click the link below to verify your email and get started:</p><p><a href="${verificationLink}">Verify Your Email</a></p><p>Your Student ID is: <strong>${studentIdDisplay}</strong></p>`,
    });

    if (emailError) {
        throw new Error(`Failed to send verification email: ${emailError.message}`);
    }

    return { success: true, message: `Student ${fullName} registered. A verification link has been sent to ${email}.`, studentId: studentIdDisplay };
  
  } catch (error: any) {
    console.error("Student Registration Action Error:", error);
    // If we created a user but failed later, try to clean it up.
    if (newUserId) {
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
    }
    return { success: false, message: error.message || "An unexpected error occurred.", studentId: null };
  }
}

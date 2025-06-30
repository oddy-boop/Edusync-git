
'use server';

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const formSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function registerAdminAction(
  prevState: any,
  formData: FormData
): Promise<{
  success: boolean;
  message: string;
  errors?: z.ZodIssue[];
}> {
  const validatedFields = formSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Validation failed. Please check your inputs.',
      errors: validatedFields.error.issues,
    };
  }
  
  const { fullName, email, password } = validatedFields.data;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev';

  if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Admin Registration Error: Supabase server environment variables are not configured.");
      return { success: false, message: "Server configuration error. Cannot process registration." };
  }
  
  if (!resendApiKey) {
      console.error("Admin Registration Error: Resend API Key is not configured.");
      return { success: false, message: "Email provider is not configured on the server. Cannot send verification link." };
  }

  // This admin client has elevated privileges and must only be used in server actions.
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const { count, error: countError } = await supabaseAdmin
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (countError) {
      throw new Error(`Database error checking for existing admins: ${countError.message}`);
    }

    if (count && count > 0) {
      return {
        success: false,
        message: 'An admin account already exists. Further admin registrations must be done by an existing administrator from within the admin portal.',
      };
    }

    // Step 1: Create the user. Note: This does NOT send a confirmation email by itself.
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: {
        full_name: fullName,
        role: 'admin',
      },
    });

    if (createError) {
      if (createError.message.includes('User already registered')) {
        return { success: false, message: 'This email address is already in use. Please use a different email or log in.' };
      }
      throw createError;
    }
    
    if (!newUser?.user) {
        throw new Error("User creation process did not return the expected user object.");
    }
    
    // Step 2: Generate a verification link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: email,
    });
    
    if (linkError) {
        throw new Error(`Could not generate verification link: ${linkError.message}`);
    }
    const verificationLink = linkData.properties?.action_link;
    if (!verificationLink) {
        throw new Error("Failed to get verification link from Supabase.");
    }

    // Step 3: Send the verification link using Resend
    const resend = new Resend(resendApiKey);
    const { data, error: emailError } = await resend.emails.send({
      from: `St. Joseph's Montessori <${fromAddress}>`,
      to: email,
      subject: "Verify Your Admin Account for St. Joseph's Montessori",
      html: `
        <h1>Welcome, ${fullName}!</h1>
        <p>Your administrator account has been created. Please click the link below to verify your email address and activate your account:</p>
        <p><a href="${verificationLink}">Verify Your Email</a></p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });

    if (emailError) {
        // If email fails, delete the created user to prevent a "ghost" account.
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        throw new Error(`Failed to send verification email: ${emailError.message}`);
    }

    return {
      success: true,
      message: `Admin account for ${email} created. A verification link has been sent to the email address. Please check the inbox to complete registration.`,
    };

  } catch (error: any) {
    console.error('Admin Registration Action Error:', error);
    return {
      success: false,
      message: error.message || 'An unexpected server error occurred during registration.',
    };
  }
}

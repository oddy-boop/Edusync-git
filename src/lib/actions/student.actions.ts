'use server';
import { z } from 'zod';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const studentSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  email: z.string().email("Must be a valid email address"),
  dateOfBirth: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date < new Date();
  }, {
    message: "Must be a valid date in the past (YYYY-MM-DD format)"
  }),
  gradeLevel: z.string().min(1, "Grade level is required"),
  guardianName: z.string().min(3, "Guardian name must be at least 3 characters"),
  guardianContact: z.string().min(10, "Guardian contact must be at least 10 characters"),
});

type ActionResponse = {
  success: boolean;
  message: string;
  studentId?: string | null;
  temporaryPassword?: string | null;
};

export async function registerStudentAction(
  prevState: any, 
  formData: FormData
): Promise<ActionResponse> {
  const supabase = createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // Validate configuration
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Missing Supabase configuration");
    return { success: false, message: "Server configuration error" };
  }

  try {
    // Verify creator session and permissions
    const { data: { user: creatorUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !creatorUser) {
      return { success: false, message: "Authentication Error: Please log in again." };
    }

    // Get creator's school
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('school_id')
      .eq('user_id', creatorUser.id)
      .single();

    if (roleError || !roleData?.school_id) {
      return { success: false, message: "Permission Denied: Could not determine your school." };
    }

    // Validate form data
    const validatedFields = studentSchema.safeParse({
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      dateOfBirth: formData.get('dateOfBirth'),
      gradeLevel: formData.get('gradeLevel'),
      guardianName: formData.get('guardianName'),
      guardianContact: formData.get('guardianContact'),
    });

    if (!validatedFields.success) {
      const errors = validatedFields.error.flatten();
      return { 
        success: false, 
        message: "Validation errors: " + 
          Object.values(errors.fieldErrors).flat().join(', ') 
      };
    }

    const { fullName, email, dateOfBirth, gradeLevel, guardianName, guardianContact } = validatedFields.data;
    const lowerCaseEmail = email.toLowerCase();

    // Initialize admin client
    const supabaseAdmin = createServerClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check for existing user
    const { data: existingUser } = await supabaseAdmin
      .from('auth.users')
      .select('id')
      .eq('email', lowerCaseEmail)
      .maybeSingle();

    if (existingUser) {
      return { 
        success: false, 
        message: `Email ${lowerCaseEmail} is already registered.` 
      };
    }

    // Generate student ID
    const yearDigits = new Date().getFullYear().toString().slice(-2);
    const studentIdDisplay = `2${yearDigits}STU${Math.floor(1000 + Math.random() * 9000)}`;

    // Create student account
    const redirectTo = `${siteUrl}/auth/update-password`;
    const { data: newUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      lowerCaseEmail,
      { 
        data: { 
          role: 'student', 
          full_name: fullName,
          student_id: studentIdDisplay
        },
        redirectTo,
      }
    );

    if (inviteError || !newUser?.user) {
      throw inviteError || new Error("User invitation failed");
    }

    // Create database records
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'student',
        school_id: roleData.school_id
      });

    if (roleInsertError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Failed to assign student role: ${roleInsertError.message}`);
    }

    const { error: profileInsertError } = await supabaseAdmin
      .from('students')
      .insert({
        auth_user_id: newUser.user.id,
        student_id_display: studentIdDisplay,
        full_name: fullName,
        contact_email: lowerCaseEmail,
        date_of_birth: dateOfBirth,
        grade_level: gradeLevel,
        guardian_name: guardianName,
        guardian_contact: guardianContact,
        school_id: roleData.school_id
      });

    if (profileInsertError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      await supabaseAdmin.from('user_roles').delete().eq('user_id', newUser.user.id);
      throw new Error(`Failed to create student profile: ${profileInsertError.message}`);
    }

    // =============================================
    // AUDIT LOGGING IMPLEMENTATION
    // =============================================
    const { error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'student_registration',
        performed_by: creatorUser.id,
        target_user: newUser.user.id,
        school_id: roleData.school_id,
        details: `Registered student ${studentIdDisplay}`,
        metadata: {
          student_id: studentIdDisplay,
          email: lowerCaseEmail,
          guardian: guardianName
        }
      });

    if (auditError) {
      console.error("Failed to create audit log:", auditError);
      // Don't fail the operation just because audit logging failed
    }

    // =============================================
    // GUARDIAN NOTIFICATION IMPLEMENTATION
    // =============================================
    const { error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert({
        recipient_email: guardianContact.includes('@') ? guardianContact : null,
        recipient_phone: guardianContact.includes('@') ? null : guardianContact,
        subject: 'Student Registration Complete',
        message: `
          Dear ${guardianName},
          
          Your child ${fullName} has been successfully registered at our school.
          
          Student ID: ${studentIdDisplay}
          Grade Level: ${gradeLevel}
          
          They will receive an email to complete their account setup.
          
          Thank you,
          School Administration
        `,
        school_id: roleData.school_id,
        priority: 'high',
        notification_type: 'student_registration'
      });

    if (notificationError) {
      console.error("Failed to create guardian notification:", notificationError);
      // Don't fail the operation just because notification failed
    }

    return { 
      success: true, 
      message: `Invitation sent to ${lowerCaseEmail}. Student ID: ${studentIdDisplay}`,
      studentId: studentIdDisplay
    };

  } catch (error: any) {
    console.error("Student registration error:", error);
    return { 
      success: false, 
      message: error.message.includes('already registered') 
        ? "Email already registered" 
        : "Registration failed. Please try again."
    };
  }
}
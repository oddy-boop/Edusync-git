
'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const studentSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  email: z.string().email("A valid email is required for student login."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format. Please use YYYY-MM-DD.",
  }),
  gradeLevel: z.string().min(1, "Grade level is required."),
  guardianName: z.string().min(3, "Guardian name must be at least 3 characters."),
  guardianContact: z.string()
    .min(10, "Contact number must be at least 10 digits.")
    .refine(
      (val) => {
        const startsWithPlusRegex = /^\+\d{11,14}$/; 
        const startsWithZeroRegex = /^0\d{9}$/;     
        return startsWithPlusRegex.test(val) || startsWithZeroRegex.test(val);
      },
      {
        message: "Invalid phone. Expecting format like +233XXXXXXXXX or 0XXXXXXXXX."
      }
    ),
});

type ActionResponse = {
  success: boolean;
  message: string;
  studentId?: string | null;
  temporaryPassword?: string | null; // This name is kept for consistency but now holds the admin-set password
};

export async function registerStudentAction(prevState: any, formData: FormData): Promise<ActionResponse> {
    const supabase = createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (!adminUser) {
        return { success: false, message: "Unauthorized: You must be logged in as an administrator." };
    }
    const { data: adminRole } = await supabase.from('user_roles').select('role, school_id').eq('user_id', adminUser.id).single();

    if (!adminRole || (adminRole.role !== 'admin' && adminRole.role !== 'super_admin')) {
        return { success: false, message: "Unauthorized: You do not have permission to register students." };
    }
  
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
    const lowerCaseEmail = email.toLowerCase();
  
    try {
        const { data: existingUser } = await supabase.from('auth.users').select('id').eq('email', lowerCaseEmail).single();
        if (existingUser) {
            throw new Error(`An account with the email ${lowerCaseEmail} already exists.`);
        }

        const { data: signupData, error: signupError } = await supabase.auth.admin.createUser({
            email: lowerCaseEmail,
            password: password,
            email_confirm: true, // Auto-confirm email since admin is creating it
            user_metadata: { full_name: fullName }
        });
        if (signupError) throw signupError;

        const newUserId = signupData.user.id;

        const { error: roleError } = await supabase.from('user_roles').insert({ user_id: newUserId, role: 'student', school_id: adminRole.school_id });
        if (roleError) throw roleError;
        
        const yearDigits = new Date().getFullYear().toString().slice(-2);
        const schoolYearPrefix = `${yearDigits}`;
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const studentIdDisplay = `${schoolYearPrefix}STD${randomNum}`;

        const { error: studentInsertError } = await supabase.from('students').insert({
            school_id: adminRole.school_id,
            auth_user_id: newUserId,
            student_id_display: studentIdDisplay,
            full_name: fullName,
            contact_email: lowerCaseEmail,
            date_of_birth: dateOfBirth,
            grade_level: gradeLevel,
            guardian_name: guardianName,
            guardian_contact: guardianContact
        });

        if (studentInsertError) throw studentInsertError;
    
        const successMessage = `Student ${fullName} created successfully. They can now log in with their email and the password you provided.`;

        return { 
            success: true, 
            message: successMessage,
            studentId: studentIdDisplay,
            temporaryPassword: null, 
        };
  
    } catch (error: any) {
        console.error("Student Registration Action Error:", error);
        return { success: false, message: error.message || "An unexpected error occurred." };
    }
}

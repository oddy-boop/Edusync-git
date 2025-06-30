
'use server';

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const teacherSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
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
  assignedClasses: z.array(z.string()).min(1, "At least one class must be assigned."),
});

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

const adminSchema = z.object({
    fullName: z.string().min(3, { message: "Full name must be at least 3 characters." }),
    email: z.string().email({ message: "Invalid email address." }).trim(),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});


async function handleServiceRoleAction(action: (supabaseAdmin: any) => Promise<any>) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey || serviceRoleKey.includes("YOUR_")) {
        const errorMessage = "Server Error: Admin client is not configured. SUPABASE_SERVICE_ROLE_KEY is missing or invalid. Please check server environment variables.";
        console.error(errorMessage);
        return { success: false, message: errorMessage };
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    return action(supabaseAdmin);
}

export async function registerAdminAction(prevState: any, formData: FormData) {
    const validatedFields = adminSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { success: false, message: "Validation failed.", errors: validatedFields.error.flatten().fieldErrors };
    }
    
    return handleServiceRoleAction(async (supabaseAdmin) => {
        let createdUser;
        try {
            // Step 1: Create the user in auth.users
            const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.createUser({
                email: validatedFields.data.email,
                password: validatedFields.data.password,
                email_confirm: true, // Auto-confirm user
                user_metadata: { 
                    full_name: validatedFields.data.fullName,
                }
            });

            if (userError) throw userError;
            if (!user) throw new Error("User creation did not return a user object.");
            createdUser = user;

            // Step 2: Create the role in public.user_roles
            const { error: roleError } = await supabaseAdmin
                .from('user_roles')
                .insert({ user_id: user.id, role: 'admin' });
            
            if (roleError) {
              // Add context to the generic roleError
              throw new Error(`Failed to assign role: ${roleError.message}`);
            }
            
            return { success: true, message: `Admin ${validatedFields.data.fullName} registered successfully. They can now log in.` };

        } catch (error: any) {
            // If any step fails, attempt to clean up the created auth user
            if (createdUser) {
                await supabaseAdmin.auth.admin.deleteUser(createdUser.id);
                console.log(`Cleaned up partially created auth user: ${createdUser.email}`);
            }

            console.error("registerAdminAction Error:", error);
            let userMessage = `Registration failed: ${error.message}`;

            if (error.message) {
                if (error.message.toLowerCase().includes("user already registered")) {
                    userMessage = "This email is already registered. Please try logging in.";
                } else if (error.message.toLowerCase().includes("duplicate key value violates unique constraint")) {
                    userMessage = "A profile or role for this user already exists. This might happen after a failed registration. Please contact support.";
                }
            }

            return { success: false, message: userMessage };
        }
    });
}


export async function registerTeacherAction(prevState: any, formData: FormData) {
  const validatedFields = teacherSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    subjectsTaught: formData.get("subjectsTaught"),
    contactNumber: formData.get("contactNumber"),
    assignedClasses: formData.getAll("assignedClasses"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed. Please check the fields.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  return handleServiceRoleAction(async (supabaseAdmin) => {
    let createdUser;
    try {
        // Step 1: Create Auth User
        const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: validatedFields.data.email,
            password: validatedFields.data.password,
            email_confirm: true,
            user_metadata: { 
                full_name: validatedFields.data.fullName,
            }
        });

        if (userError) throw userError;
        if (!user) throw new Error("User creation did not return a user object.");
        createdUser = user;

        // Step 2: Assign Role
        const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .insert({ user_id: user.id, role: 'teacher' });

        if (roleError) throw new Error(`Failed to assign role: ${roleError.message}`);

        // Step 3: Create Teacher Profile
        const { error: profileError } = await supabaseAdmin
            .from('teachers')
            .insert({
                auth_user_id: user.id,
                full_name: validatedFields.data.fullName,
                email: validatedFields.data.email,
                contact_number: validatedFields.data.contactNumber,
                subjects_taught: validatedFields.data.subjectsTaught,
                assigned_classes: validatedFields.data.assignedClasses,
            });

        if (profileError) throw new Error(`Failed to create teacher profile: ${profileError.message}`);

        return { success: true, message: `Teacher ${validatedFields.data.fullName} registered. They can now log in.` };

    } catch (error: any) {
        if (createdUser) {
            await supabaseAdmin.auth.admin.deleteUser(createdUser.id);
            console.log(`Cleaned up partially created auth user: ${createdUser.email}`);
        }
        console.error("registerTeacherAction Error:", error);
        let userMessage = `Registration failed: ${error.message}`;
        if (error.message && error.message.toLowerCase().includes("user already registered")) {
            userMessage = "This email is already registered. Please try logging in.";
        }
        return { success: false, message: userMessage };
    }
  });
}


export async function registerStudentAction(prevState: any, formData: FormData) {
    const validatedFields = studentSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { success: false, message: "Validation failed.", studentId: null, errors: validatedFields.error.flatten().fieldErrors };
    }

    const studentId_10_digit = `${"2" + (new Date().getFullYear() % 100).toString().padStart(2, '0')}SJM${Math.floor(1000 + Math.random() * 9000).toString()}`;
    
    return handleServiceRoleAction(async (supabaseAdmin) => {
        let createdUser;
        try {
            // Step 1: Create Auth User
            const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.createUser({
                email: validatedFields.data.email,
                password: validatedFields.data.password,
                email_confirm: true,
                user_metadata: { 
                    full_name: validatedFields.data.fullName,
                }
            });

            if (userError) throw userError;
            if (!user) throw new Error("User creation did not return a user object.");
            createdUser = user;

            // Step 2: Assign Role
            const { error: roleError } = await supabaseAdmin
                .from('user_roles')
                .insert({ user_id: user.id, role: 'student' });
            if (roleError) throw new Error(`Failed to assign role: ${roleError.message}`);

            // Step 3: Create Student Profile
            const { error: profileError } = await supabaseAdmin
                .from('students')
                .insert({
                    auth_user_id: user.id,
                    student_id_display: studentId_10_digit,
                    full_name: validatedFields.data.fullName,
                    date_of_birth: validatedFields.data.dateOfBirth,
                    grade_level: validatedFields.data.gradeLevel,
                    guardian_name: validatedFields.data.guardianName,
                    guardian_contact: validatedFields.data.guardianContact,
                    contact_email: validatedFields.data.email
                });
            if (profileError) throw new Error(`Failed to create student profile: ${profileError.message}`);
            
            return { 
                success: true,
                message: `Student ${validatedFields.data.fullName} registered with ID: ${studentId_10_digit}. They can now log in.`, 
                studentId: studentId_10_digit,
            };
        } catch (error: any) {
            if (createdUser) {
                await supabaseAdmin.auth.admin.deleteUser(createdUser.id);
                console.log(`Cleaned up partially created auth user: ${createdUser.email}`);
            }
            console.error("registerStudentAction Error:", error);
            let userMessage = `Registration failed: ${error.message}`;
            if (error.message && error.message.toLowerCase().includes("user already registered")) {
                userMessage = "This email is already registered. Please try logging in.";
            }
            return { success: false, message: userMessage, studentId: null };
        }
    });
}

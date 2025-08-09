
'use server';

/**
 * @fileOverview Defines Genkit tools for interacting with the Supabase database.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Helper function to create a Supabase client.
// This ensures we don't expose secrets to the client-side.
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase credentials are not configured on the server.');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

// ==================================================================
// Tool 1: Get Student Information by ID
// ==================================================================
const StudentInfoSchema = z.object({
  fullName: z.string().describe("The student's full name."),
  gradeLevel: z.string().describe("The student's current grade level or class."),
  guardianContact: z.string().describe("The contact phone number for the student's guardian."),
});
export const getStudentInfoById = ai.defineTool(
  {
    name: 'getStudentInfoById',
    description: 'Returns profile information for a student given their unique student ID.',
    inputSchema: z.object({
      studentId: z.string().describe('The unique display ID of the student (e.g., SJS1234).'),
    }),
    outputSchema: StudentInfoSchema,
  },
  async (input) => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('students')
      .select('full_name, grade_level, guardian_contact')
      .eq('student_id_display', input.studentId)
      .single();
    if (error) {
      throw new Error(`Database error: Could not find student with ID ${input.studentId}.`);
    }
    return {
      fullName: data.full_name,
      gradeLevel: data.grade_level,
      guardianContact: data.guardian_contact,
    };
  }
);


// ==================================================================
// Tool 2: Get Teacher Information by Email
// ==================================================================
const TeacherInfoSchema = z.object({
  fullName: z.string().describe("The teacher's full name."),
  contactNumber: z.string().describe("The teacher's contact phone number."),
  subjectsTaught: z.array(z.string()).describe("A list of subjects the teacher is assigned to teach."),
  assignedClasses: z.array(z.string()).describe("A list of classes or grade levels the teacher is assigned to."),
});
export const getTeacherInfoByEmail = ai.defineTool(
  {
    name: 'getTeacherInfoByEmail',
    description: 'Returns profile information for a teacher given their email address.',
    inputSchema: z.object({
      email: z.string().email().describe('The email address of the teacher.'),
    }),
    outputSchema: TeacherInfoSchema,
  },
  async (input) => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('teachers')
      .select('full_name, contact_number, subjects_taught, assigned_classes')
      .eq('email', input.email)
      .single();
    if (error) {
      throw new Error(`Database error: Could not find teacher with email ${input.email}.`);
    }
    return {
      fullName: data.full_name,
      contactNumber: data.contact_number,
      subjectsTaught: data.subjects_taught || [],
      assignedClasses: data.assigned_classes || [],
    };
  }
);

// ==================================================================
// Tool 3: Get Student Count by Class
// ==================================================================
export const getStudentCountByClass = ai.defineTool(
  {
    name: 'getStudentCountByClass',
    description: 'Returns the total number of students in a specific grade level or class.',
    inputSchema: z.object({
      gradeLevel: z.string().describe('The grade level or class name to count students for (e.g., "Basic 1", "JHS 2").'),
    }),
    outputSchema: z.number(),
  },
  async (input) => {
    const supabase = createSupabaseClient();
    const { count, error } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('grade_level', input.gradeLevel);
    if (error) {
      throw new Error(`Database error: Could not count students for class ${input.gradeLevel}.`);
    }
    return count || 0;
  }
);


// ==================================================================
// Tool 4: Get Financial Summary for the Current Year
// ==================================================================
const FinancialSummarySchema = z.object({
    totalFeesCollected: z.number().describe("The total amount of fees collected for the current academic year."),
    academicYear: z.string().describe("The academic year for which the summary is provided."),
});
export const getFinancialSummary = ai.defineTool(
  {
    name: 'getFinancialSummary',
    description: 'Returns the total amount of fees collected for the current academic year.',
    inputSchema: z.object({}), // No input needed
    outputSchema: FinancialSummarySchema,
  },
  async () => {
    const supabase = createSupabaseClient();
    const { data: appSettings, error: settingsError } = await supabase
      .from('app_settings')
      .select('current_academic_year')
      .single();
      
    if (settingsError) throw new Error(`Database error: Could not retrieve current academic year.`);
    const academicYear = appSettings?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    
    const startYear = parseInt(academicYear.split('-')[0], 10);
    const endYear = parseInt(academicYear.split('-')[1], 10);
    const academicYearStartDate = `${startYear}-08-01`; 
    const academicYearEndDate = `${endYear}-07-31`;

    const { data, error } = await supabase
        .from('fee_payments')
        .select('amount_paid')
        .gte('payment_date', academicYearStartDate)
        .lte('payment_date', academicYearEndDate);

    if (error) {
      throw new Error(`Database error: Could not fetch fee payments. ${error.message}`);
    }

    const totalFeesCollected = (data || []).reduce((sum, payment) => sum + (payment.amount_paid || 0), 0);
    
    return {
        totalFeesCollected,
        academicYear,
    };
  }
);


'use server';

/**
 * @fileOverview Defines Genkit tools for interacting with the PostgreSQL database.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';


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
    description: 'Returns basic profile information for a student given their unique student ID.',
    inputSchema: z.object({
      studentId: z.string().describe('The unique display ID of the student (e.g., SJS1234).'),
    }),
    outputSchema: StudentInfoSchema,
  },
  async (input) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if(!user) throw new Error("Unauthorized");
    const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).single();
    if(!roleData?.school_id) throw new Error("User not associated with a school");
    
    const { data, error } = await supabase
      .from('students')
      .select('full_name, grade_level, guardian_contact')
      .eq('student_id_display', input.studentId)
      .eq('school_id', roleData.school_id)
      .single();

    if (error) {
      console.error('getStudentInfoById Error:', error);
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
    description: 'Returns basic profile information for a teacher given their email address.',
    inputSchema: z.object({
      email: z.string().email().describe('The email address of the teacher.'),
    }),
    outputSchema: TeacherInfoSchema,
  },
  async (input) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if(!user) throw new Error("Unauthorized");
    const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).single();
    if(!roleData?.school_id) throw new Error("User not associated with a school");

    const { data, error } = await supabase
      .from('teachers')
      .select('full_name, contact_number, subjects_taught, assigned_classes')
      .eq('email', input.email)
      .eq('school_id', roleData.school_id)
      .single();

    if (error) {
      console.error('getTeacherInfoByEmail Error:', error);
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
    outputSchema: z.object({
      count: z.number().describe('The total number of students found.'),
    }),
  },
  async (input) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if(!user) throw new Error("Unauthorized");
    const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).single();
    if(!roleData?.school_id) throw new Error("User not associated with a school");
    
    const { count, error } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('grade_level', input.gradeLevel)
      .eq('school_id', roleData.school_id);

    if (error) {
      console.error('getStudentCountByClass Error:', error);
      throw new Error("Database error occurred while counting students.");
    }
    
    return { count: count || 0 };
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
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if(!user) throw new Error("Unauthorized");
      const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).single();
      if(!roleData?.school_id) throw new Error("User not associated with a school");
      
      const { data: schoolSettings, error: settingsError } = await supabase
        .from('schools')
        .select('current_academic_year')
        .eq('id', roleData.school_id)
        .single();
        
      if(settingsError) throw new Error("Could not retrieve school settings.");

      const academicYear = schoolSettings?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
      
      const startYear = parseInt(academicYear.split('-')[0], 10);
      const endYear = parseInt(academicYear.split('-')[1], 10);
      const academicYearStartDate = `${startYear}-08-01`; 
      const academicYearEndDate = `${endYear}-07-31`;

      const { data, error } = await supabase
          .from('fee_payments')
          .select('amount_paid')
          .eq('school_id', roleData.school_id)
          .gte('payment_date', academicYearStartDate)
          .lte('payment_date', academicYearEndDate);

      if (error) {
          console.error("getFinancialSummary error:", error);
          throw new Error("Could not calculate financial summary.");
      }

      const totalFeesCollected = (data || []).reduce((sum, p) => sum + p.amount_paid, 0);

      return {
          totalFeesCollected,
          academicYear,
      };
  }
);

// ==================================================================
// Tool 5: Get Total Teacher Count
// ==================================================================
export const getTeacherCount = ai.defineTool(
  {
    name: 'getTeacherCount',
    description: 'Returns the total number of teachers registered in the school.',
    inputSchema: z.object({}),
    outputSchema: z.object({ count: z.number() }),
  },
  async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if(!user) throw new Error("Unauthorized");
    const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).single();
    if(!roleData?.school_id) throw new Error("User not associated with a school");

    const { count, error } = await supabase
      .from('teachers')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', roleData.school_id);

    if (error) throw new Error("Could not count teachers.");

    return { count: count || 0 };
  }
);

// ==================================================================
// Tool 6: Get Total Student Count
// ==================================================================
export const getTotalStudentCount = ai.defineTool(
  {
    name: 'getTotalStudentCount',
    description: 'Returns the total number of students registered in the school.',
    inputSchema: z.object({}),
    outputSchema: z.object({ count: z.number() }),
  },
  async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if(!user) throw new Error("Unauthorized");
    const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).single();
    if(!roleData?.school_id) throw new Error("User not associated with a school");

    const { count, error } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', roleData.school_id);

    if (error) throw new Error("Could not count students.");

    return { count: count || 0 };
  }
);


// ==================================================================
// Deprecated / Placeholder Tools
// ==================================================================
export const deleteUser = ai.defineTool({ name: 'deleteUser', description: 'This tool is disabled after database migration.', inputSchema: z.any(), outputSchema: z.string() }, async () => "This tool is disabled after the recent database migration.");
export const getStudentReport = ai.defineTool({ name: 'getStudentReport', description: 'This tool is disabled after database migration.', inputSchema: z.any(), outputSchema: z.string() }, async () => "This tool is disabled after the recent database migration.");
export const getTeacherReport = ai.defineTool({ name: 'getTeacherReport', description: 'This tool is disabled after database migration.', inputSchema: z.any(), outputSchema: z.string() }, async () => "This tool is disabled after the recent database migration.");
export const findTeacherByName = ai.defineTool({ name: 'findTeacherByName', description: 'This tool is disabled after database migration.', inputSchema: z.any(), outputSchema: z.string() }, async () => "This tool is disabled after the recent database migration.");
export const findStudentByName = ai.defineTool({ name: 'findStudentByName', description: 'This tool is disabled after database migration.', inputSchema: z.any(), outputSchema: z.string() }, async () => "This tool is disabled after the recent database migration.");
export const listAllTeachers = ai.defineTool({ name: 'listAllTeachers', description: 'This tool is disabled after database migration.', inputSchema: z.any(), outputSchema: z.string() }, async () => "This tool is disabled after the recent database migration.");
export const listAllStudents = ai.defineTool({ name: 'listAllStudents', description: 'This tool is disabled after database migration.', inputSchema: z.any(), outputSchema: z.string() }, async () => "This tool is disabled after the recent database migration.");
export const listStudentsInClass = ai.defineTool({ name: 'listStudentsInClass', description: 'This tool is disabled after database migration.', inputSchema: z.any(), outputSchema: z.string() }, async () => "This tool is disabled after the recent database migration.");
export const getStudentFinancials = ai.defineTool({ name: 'getStudentFinancials', description: 'This tool is disabled after database migration.', inputSchema: z.any(), outputSchema: z.string() }, async () => "This tool is disabled after the recent database migration.");
export const getClassTermAverage = ai.defineTool({ name: 'getClassTermAverage', description: 'This tool is disabled after database migration.', inputSchema: z.any(), outputSchema: z.string() }, async () => "This tool is disabled after the recent database migration.");
export const sendAnnouncement = ai.defineTool({ name: 'sendAnnouncement', description: 'This tool is disabled after database migration.', inputSchema: z.any(), outputSchema: z.string() }, async () => "This tool is disabled after the recent database migration.");

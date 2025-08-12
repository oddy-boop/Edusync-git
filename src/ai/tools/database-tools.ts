
'use server';

/**
 * @fileOverview Defines Genkit tools for interacting with the PostgreSQL database.
 */

import { ai } from '@/ai/genkit';
import pool from '@/lib/db';
import { z } from 'zod';

// Note: A robust implementation would pass the current user's school_id to these functions.
// For now, we are assuming a single-school context (school_id = 1) for simplicity.

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
    const client = await pool.connect();
    try {
        const { rows } = await client.query(
            'SELECT full_name, grade_level, guardian_contact FROM students WHERE student_id_display = $1 AND school_id = 1', 
            [input.studentId]
        );
        if (rows.length === 0) {
            throw new Error(`Database error: Could not find student with ID ${input.studentId}.`);
        }
        const data = rows[0];
        return {
          fullName: data.full_name,
          gradeLevel: data.grade_level,
          guardianContact: data.guardian_contact,
        };
    } finally {
        client.release();
    }
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
    const client = await pool.connect();
    try {
        const { rows } = await client.query(
            'SELECT full_name, contact_number, subjects_taught, assigned_classes FROM teachers WHERE email = $1 AND school_id = 1', 
            [input.email]
        );
        if (rows.length === 0) {
            throw new Error(`Database error: Could not find teacher with email ${input.email}.`);
        }
        const data = rows[0];
        return {
          fullName: data.full_name,
          contactNumber: data.contact_number,
          subjectsTaught: data.subjects_taught || [],
          assignedClasses: data.assigned_classes || [],
        };
    } finally {
        client.release();
    }
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
    const client = await pool.connect();
    try {
        const { rows } = await client.query(
            'SELECT COUNT(*) as count FROM students WHERE grade_level = $1 AND school_id = 1', 
            [input.gradeLevel]
        );
        return { count: parseInt(rows[0].count, 10) || 0 };
    } finally {
        client.release();
    }
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
    const client = await pool.connect();
    try {
        const { rows: schoolSettingsRows } = await client.query('SELECT current_academic_year FROM schools WHERE id = 1');
        const academicYear = schoolSettingsRows[0]?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
        
        const startYear = parseInt(academicYear.split('-')[0], 10);
        const endYear = parseInt(academicYear.split('-')[1], 10);
        const academicYearStartDate = `${startYear}-08-01`; 
        const academicYearEndDate = `${endYear}-07-31`;

        const { rows } = await client.query(
            'SELECT SUM(amount_paid) as total FROM fee_payments WHERE school_id = 1 AND payment_date >= $1 AND payment_date <= $2',
            [academicYearStartDate, academicYearEndDate]
        );

        return {
            totalFeesCollected: parseFloat(rows[0].total) || 0,
            academicYear,
        };
    } finally {
        client.release();
    }
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
    const client = await pool.connect();
    try {
      const { rows } = await client.query('SELECT COUNT(*) as count FROM teachers WHERE school_id = 1');
      return { count: parseInt(rows[0].count, 10) };
    } finally {
      client.release();
    }
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
    const client = await pool.connect();
    try {
      const { rows } = await client.query('SELECT COUNT(*) as count FROM students WHERE school_id = 1');
      return { count: parseInt(rows[0].count, 10) };
    } finally {
      client.release();
    }
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

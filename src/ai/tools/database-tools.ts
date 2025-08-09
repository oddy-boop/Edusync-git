
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

// Define the schema for the student information our tool will return.
const StudentInfoSchema = z.object({
  fullName: z.string().describe("The student's full name."),
  gradeLevel: z.string().describe("The student's current grade level or class."),
  guardianContact: z.string().describe("The contact phone number for the student's guardian."),
});

// Define the tool itself using ai.defineTool.
export const getStudentInfoById = ai.defineTool(
  {
    name: 'getStudentInfoById',
    description: 'Returns profile information for a student given their unique student ID.',
    // Define the input schema (what the AI needs to provide to use the tool).
    inputSchema: z.object({
      studentId: z.string().describe('The unique display ID of the student (e.g., SJS1234).'),
    }),
    // Define the output schema (what our function will return to the AI).
    outputSchema: StudentInfoSchema,
  },
  // This is the actual function that runs when the tool is called.
  async (input) => {
    const supabase = createSupabaseClient();
    
    const { data, error } = await supabase
      .from('students')
      .select('full_name, grade_level, guardian_contact')
      .eq('student_id_display', input.studentId)
      .single();

    if (error) {
      // It's important to handle errors and inform the AI.
      throw new Error(`Database error: Could not find student with ID ${input.studentId}.`);
    }

    return {
      fullName: data.full_name,
      gradeLevel: data.grade_level,
      guardianContact: data.guardian_contact,
    };
  }
);

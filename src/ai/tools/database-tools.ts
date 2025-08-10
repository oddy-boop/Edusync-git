
'use server';

/**
 * @fileOverview Defines Genkit tools for interacting with the Supabase database.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { deleteUserAction } from '@/lib/actions/user.actions';
import { sendAnnouncementEmail } from '@/lib/email';
import { sendSms } from '@/lib/sms';

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
    description: 'Returns basic profile information for a student given their unique student ID.',
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
    description: 'Returns basic profile information for a teacher given their email address.',
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
    outputSchema: z.object({
      count: z.number().describe('The total number of students found.'),
    }),
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

// ==================================================================
// Tool 5: Delete a User (Student or Teacher)
// ==================================================================
export const deleteUser = ai.defineTool(
  {
    name: 'deleteUser',
    description: 'Permanently deletes a user from the system, including their profile and authentication account. This is irreversible.',
    inputSchema: z.object({
      authUserId: z.string().uuid().describe('The authentication UUID of the user to delete.'),
      profileType: z.enum(['students', 'teachers']).describe("The type of profile to delete: 'students' or 'teachers'."),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    const { authUserId, profileType } = input;
    
    // We re-use the existing, secure server action for this.
    const result = await deleteUserAction({
      authUserId: authUserId,
      profileTable: profileType,
    });

    if (result.success) {
      return `Success: ${result.message}`;
    } else {
      // Throwing an error here will make the AI report the failure to the user.
      throw new Error(`Deletion failed: ${result.message}`);
    }
  }
);

// ==================================================================
// Tool 6: Get Total Teacher Count
// ==================================================================
export const getTeacherCount = ai.defineTool(
  {
    name: 'getTeacherCount',
    description: 'Returns the total number of registered teachers in the school.',
    inputSchema: z.object({}), // No input needed
    outputSchema: z.number(),
  },
  async () => {
    const supabase = createSupabaseClient();
    const { count, error } = await supabase
      .from('teachers')
      .select('*', { count: 'exact', head: true });
    if (error) {
      throw new Error(`Database error: Could not count teachers.`);
    }
    return count || 0;
  }
);

// ==================================================================
// Tool 7: Get Total Student Count
// ==================================================================
export const getTotalStudentCount = ai.defineTool(
  {
    name: 'getTotalStudentCount',
    description: 'Returns the total number of all registered students in the school.',
    inputSchema: z.object({}), // No input needed
    outputSchema: z.number(),
  },
  async () => {
    const supabase = createSupabaseClient();
    const { count, error } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });
    if (error) {
      throw new Error(`Database error: Could not count students.`);
    }
    return count || 0;
  }
);

// ==================================================================
// Tool 8: Get Student Report (including attendance)
// ==================================================================
const StudentReportSchema = z.object({
    profile: StudentInfoSchema,
    attendance: z.object({
        present: z.number(),
        absent: z.number(),
        late: z.number(),
    }).describe("The student's attendance summary for the current academic year."),
});
export const getStudentReport = ai.defineTool(
  {
    name: 'getStudentReport',
    description: "Retrieves a comprehensive report for a student, including their profile and attendance summary, by searching for their name. If multiple students have the same name, it will return an error asking for a more specific ID.",
    inputSchema: z.object({
      studentName: z.string().describe('The full or partial name of the student.'),
    }),
    outputSchema: z.union([StudentReportSchema, z.string()]),
  },
  async (input) => {
    const supabase = createSupabaseClient();

    // 1. Find the student by name to get their ID.
    const { data: students, error: findError } = await supabase
        .from('students')
        .select('student_id_display, full_name, grade_level, guardian_contact')
        .ilike('full_name', `%${input.studentName}%`);

    if (findError) throw new Error(`Database error searching for student: ${findError.message}`);
    if (!students || students.length === 0) return `No student found with the name '${input.studentName}'. Please check the name.`;
    if (students.length > 1) {
        const studentList = students.map(s => `${s.full_name} (ID: ${s.student_id_display})`).join(', ');
        return `Multiple students found with that name: ${studentList}. Please ask for the report again using the unique Student ID.`;
    }

    const student = students[0];
    const studentId = student.student_id_display;

    // 2. Get profile (we already have it from the search)
    const profile = {
        fullName: student.full_name,
        gradeLevel: student.grade_level,
        guardianContact: student.guardian_contact,
    };

    // 3. Get attendance
    const { data, error } = await supabase
      .from('attendance_records')
      .select('status')
      .eq('student_id_display', studentId);

    if (error) {
        throw new Error(`Database error fetching attendance for ${studentId}: ${error.message}`);
    }
    
    const attendanceSummary = (data || []).reduce((summary, record) => {
        if (record.status === 'present') summary.present++;
        if (record.status === 'absent') summary.absent++;
        if (record.status === 'late') summary.late++;
        return summary;
    }, { present: 0, absent: 0, late: 0 });

    return {
        profile,
        attendance: attendanceSummary
    };
  }
);


// ==================================================================
// Tool 9: Get Teacher Report (including attendance)
// ==================================================================
const TeacherReportSchema = z.object({
    profile: TeacherInfoSchema,
    attendance: z.object({
        present: z.number(),
        absent: z.number(),
        onLeave: z.number(),
        outOfRange: z.number(),
    }).describe("The teacher's attendance summary for the current academic year."),
});
export const getTeacherReport = ai.defineTool(
  {
    name: 'getTeacherReport',
    description: "Retrieves a comprehensive report for a teacher, including their profile and attendance summary.",
    inputSchema: z.object({
      email: z.string().email().describe('The email address of the teacher.'),
    }),
    outputSchema: TeacherReportSchema,
  },
  async (input) => {
    const supabase = createSupabaseClient();
    
    // 1. Get profile (which also fetches their main UUID)
    const profile = await getTeacherInfoByEmail({email: input.email});

    // To get attendance, we need the teacher's primary ID from the teachers table
    const { data: teacherMeta } = await supabase
        .from('teachers')
        .select('id')
        .eq('email', input.email)
        .single();
    
    if (!teacherMeta) {
        throw new Error(`Could not find teacher metadata for email ${input.email}.`);
    }

    // 2. Get attendance
    const { data, error } = await supabase
      .from('staff_attendance')
      .select('status')
      .eq('teacher_id', teacherMeta.id);

    if (error) {
        throw new Error(`Database error fetching staff attendance for ${input.email}: ${error.message}`);
    }
    
    const attendanceSummary = (data || []).reduce((summary, record) => {
        if (record.status === 'Present') summary.present++;
        if (record.status === 'Absent') summary.absent++;
        if (record.status === 'On Leave') summary.onLeave++;
        if (record.status === 'Out of Range') summary.outOfRange++;
        return summary;
    }, { present: 0, absent: 0, onLeave: 0, outOfRange: 0 });

    return {
        profile,
        attendance: attendanceSummary
    };
  }
);
    
// ==================================================================
// Tool 10: Find Teacher by Name
// ==================================================================
export const findTeacherByName = ai.defineTool(
  {
    name: 'findTeacherByName',
    description: "Searches for a teacher by their full name (or a partial name) and returns their details.",
    inputSchema: z.object({
      name: z.string().describe("The full or partial name of the teacher to search for."),
    }),
    outputSchema: z.array(TeacherInfoSchema),
  },
  async (input) => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('teachers')
      .select('full_name, contact_number, subjects_taught, assigned_classes')
      .ilike('full_name', `%${input.name}%`);
    if (error) throw new Error(`Database error searching for teacher '${input.name}': ${error.message}`);
    return (data || []).map(t => ({
      fullName: t.full_name,
      contactNumber: t.contact_number,
      subjectsTaught: t.subjects_taught || [],
      assignedClasses: t.assigned_classes || [],
    }));
  }
);

// ==================================================================
// Tool 11: Find Student by Name
// ==================================================================
export const findStudentByName = ai.defineTool(
  {
    name: 'findStudentByName',
    description: "Searches for a student by their full name (or a partial name) and returns their details.",
    inputSchema: z.object({
      name: z.string().describe("The full or partial name of the student to search for."),
    }),
    outputSchema: z.array(StudentInfoSchema.extend({ studentId: z.string() })),
  },
  async (input) => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('students')
      .select('student_id_display, full_name, grade_level, guardian_contact')
      .ilike('full_name', `%${input.name}%`);
    if (error) throw new Error(`Database error searching for student '${input.name}': ${error.message}`);
    return (data || []).map(s => ({
      studentId: s.student_id_display,
      fullName: s.full_name,
      gradeLevel: s.grade_level,
      guardianContact: s.guardian_contact,
    }));
  }
);

// ==================================================================
// Tool 12: List All Teachers
// ==================================================================
export const listAllTeachers = ai.defineTool(
  {
    name: 'listAllTeachers',
    description: "Provides a list of all registered teachers in the school.",
    inputSchema: z.object({}),
    outputSchema: z.array(z.object({
        fullName: z.string(),
        email: z.string().email(),
    })),
  },
  async () => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from('teachers').select('full_name, email');
    if (error) throw new Error(`Database error listing teachers: ${error.message}`);
    return (data || []).map(t => ({
      fullName: t.full_name,
      email: t.email,
    }));
  }
);

// ==================================================================
// Tool 12a: List All Students
// ==================================================================
export const listAllStudents = ai.defineTool(
  {
    name: 'listAllStudents',
    description: "Provides a list of all registered students in the school, regardless of class.",
    inputSchema: z.object({}),
    outputSchema: z.array(z.object({
        fullName: z.string(),
        studentId: z.string(),
    })),
  },
  async () => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from('students').select('full_name, student_id_display');
    if (error) throw new Error(`Database error listing students: ${error.message}`);
    return (data || []).map(s => ({ fullName: s.full_name, studentId: s.student_id_display }));
  }
);

// ==================================================================
// Tool 13: List Students in a Class
// ==================================================================
export const listStudentsInClass = ai.defineTool(
  {
    name: 'listStudentsInClass',
    description: "Provides a list of all students registered in a specific class or grade level.",
    inputSchema: z.object({
      gradeLevel: z.string().describe('The class to list students from (e.g., "Basic 1").'),
    }),
    outputSchema: z.array(z.object({
        fullName: z.string(),
        studentId: z.string(),
    })),
  },
  async (input) => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('students')
      .select('full_name, student_id_display')
      .eq('grade_level', input.gradeLevel);
    if (error) throw new Error(`Database error listing students for ${input.gradeLevel}: ${error.message}`);
    return (data || []).map(s => ({ fullName: s.full_name, studentId: s.student_id_display }));
  }
);

// ==================================================================
// Tool 14: Get Student Financials
// ==================================================================
const StudentFinancialsSchema = z.object({
    totalFeesDue: z.number(),
    totalPaid: z.number(),
    outstandingBalance: z.number(),
    academicYear: z.string(),
});
export const getStudentFinancials = ai.defineTool(
  {
    name: 'getStudentFinancials',
    description: "Retrieves the financial summary (fees due, paid, balance) for a specific student for the current academic year.",
    inputSchema: z.object({
      studentId: z.string().describe('The unique display ID of the student (e.g., SJS1234).'),
    }),
    outputSchema: StudentFinancialsSchema,
  },
  async (input) => {
    const supabase = createSupabaseClient();
    const { data: appSettings } = await supabase.from('app_settings').select('current_academic_year').single();
    const academicYear = appSettings?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    
    const { data: student } = await supabase.from('students').select('grade_level, total_paid_override').eq('student_id_display', input.studentId).single();
    if (!student) throw new Error(`Student with ID ${input.studentId} not found.`);

    const { data: feeItems } = await supabase.from('school_fee_items').select('amount').eq('grade_level', student.grade_level).eq('academic_year', academicYear);
    const totalFeesDue = (feeItems || []).reduce((sum, item) => sum + item.amount, 0);

    let totalPaid = 0;
    if (student.total_paid_override !== null) {
      totalPaid = student.total_paid_override;
    } else {
        const startYear = parseInt(academicYear.split('-')[0], 10);
        const endYear = parseInt(academicYear.split('-')[1], 10);
        const academicYearStartDate = `${startYear}-08-01`; 
        const academicYearEndDate = `${endYear}-07-31`;

        const { data: payments } = await supabase.from('fee_payments').select('amount_paid').eq('student_id_display', input.studentId).gte('payment_date', academicYearStartDate).lte('payment_date', academicYearEndDate);
        totalPaid = (payments || []).reduce((sum, item) => sum + item.amount_paid, 0);
    }
    
    return {
      totalFeesDue,
      totalPaid,
      outstandingBalance: totalFeesDue - totalPaid,
      academicYear,
    };
  }
);

// ==================================================================
// Tool 15: Get Class Average for a Term
// ==================================================================
export const getClassTermAverage = ai.defineTool(
  {
    name: 'getClassTermAverage',
    description: "Calculates the average academic performance for all students in a given class for a specific term.",
    inputSchema: z.object({
      gradeLevel: z.string().describe("The class/grade level."),
      term: z.string().describe("The academic term (e.g., 'Term 1')."),
      year: z.string().describe("The academic year (e.g., '2023-2024')."),
    }),
    outputSchema: z.number(),
  },
  async (input) => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('academic_results')
      .select('overall_average')
      .eq('class_id', input.gradeLevel)
      .eq('term', input.term)
      .eq('year', input.year)
      .not('overall_average', 'is', null);
      
    if (error) throw new Error(`Database error fetching results for ${input.gradeLevel}: ${error.message}`);
    if (!data || data.length === 0) return 0;
    
    const totalAverage = data.reduce((sum, result) => sum + parseFloat(result.overall_average || '0'), 0);
    return totalAverage / data.length;
  }
);

// ==================================================================
// Tool 16: Send Announcement
// ==================================================================
export const sendAnnouncement = ai.defineTool(
  {
    name: 'sendAnnouncement',
    description: "Sends an announcement to a target audience (All, Students, or Teachers).",
    inputSchema: z.object({
      targetAudience: z.enum(['All', 'Students', 'Teachers']),
      title: z.string().describe("The title of the announcement."),
      message: z.string().describe("The content of the announcement message."),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    const supabase = createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('school_announcements').insert({
      title: input.title,
      message: input.message,
      target_audience: input.targetAudience,
      author_id: user?.id,
      author_name: user?.user_metadata?.full_name || 'Admin Assistant',
    });

    if (error) throw new Error(`Failed to save announcement to database: ${error.message}`);

    // Offload email and SMS sending. The functions themselves handle checks for API keys.
    sendAnnouncementEmail({ title: input.title, message: input.message }, input.targetAudience);

    const smsRecipients: { phoneNumber: string }[] = [];
    if (input.targetAudience === 'All' || input.targetAudience === 'Students') {
        const { data: students } = await supabase.from('students').select('guardian_contact');
        if (students) smsRecipients.push(...students.map(s => ({ phoneNumber: s.guardian_contact })).filter(r => r.phoneNumber));
    }
    if (input.targetAudience === 'All' || input.targetAudience === 'Teachers') {
        const { data: teachers } = await supabase.from('teachers').select('contact_number');
        if (teachers) smsRecipients.push(...teachers.map(t => ({ phoneNumber: t.contact_number })).filter(r => r.phoneNumber));
    }
    
    if (smsRecipients.length > 0) {
      sendSms({ message: `${input.title}: ${input.message}`, recipients: smsRecipients });
    }
    
    return `Announcement titled "${input.title}" has been successfully sent to ${input.targetAudience}.`;
  }
);

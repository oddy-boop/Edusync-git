
/**
 * @fileOverview Defines Genkit tools for interacting with the PostgreSQL database.
 */

import ai from '@/ai/genkit';
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
  async (input: { studentId: any; }) => {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('students')
      .select('full_name, grade_level, guardian_contact')
      .eq('student_id_display', input.studentId)
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
  async (input: { email: any; }) => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('teachers')
      .select('full_name, contact_number, subjects_taught, assigned_classes')
      .eq('email', input.email)
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
  async (input: { gradeLevel: any; }) => {
    const supabase = createClient();
    
    const { count, error } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('grade_level', input.gradeLevel);

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
      
      // Get first school's academic year (since we removed auth checks)
      const { data: schoolSettings, error: settingsError } = await supabase
        .from('schools')
        .select('current_academic_year')
        .limit(1)
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

    const { count, error } = await supabase
      .from('teachers')
      .select('*', { count: 'exact', head: true });

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

    const { count, error } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });

    if (error) throw new Error("Could not count students.");

    return { count: count || 0 };
  }
);


// ==================================================================
// Tool 7: Find Students by Name
// ==================================================================
export const findStudentByName = ai.defineTool(
  {
    name: 'findStudentByName',
    description: 'Search for students by name or partial name match.',
    inputSchema: z.object({
      name: z.string().describe('Full or partial name of the student to search for.'),
    }),
    outputSchema: z.array(z.object({
      studentId: z.string(),
      fullName: z.string(),
      gradeLevel: z.string(),
      guardianContact: z.string(),
    })),
  },
  async (input: { name: any; }) => {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('students')
      .select('student_id_display, full_name, grade_level, guardian_contact')
      .ilike('full_name', `%${input.name}%`)
      .limit(10);

    if (error) {
      console.error('findStudentByName Error:', error);
      throw new Error(`Database error while searching for students.`);
    }
    
    return (data || []).map(student => ({
      studentId: student.student_id_display,
      fullName: student.full_name,
      gradeLevel: student.grade_level,
      guardianContact: student.guardian_contact,
    }));
  }
);

// ==================================================================
// Tool 8: Find Teachers by Name
// ==================================================================
export const findTeacherByName = ai.defineTool(
  {
    name: 'findTeacherByName',
    description: 'Search for teachers by name or partial name match.',
    inputSchema: z.object({
      name: z.string().describe('Full or partial name of the teacher to search for.'),
    }),
    outputSchema: z.array(z.object({
      fullName: z.string(),
      email: z.string(),
      contactNumber: z.string(),
      assignedClasses: z.array(z.string()),
      subjectsTaught: z.array(z.string()),
    })),
  },
  async (input: { name: any; }) => {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('teachers')
      .select('full_name, email, contact_number, assigned_classes, subjects_taught')
      .ilike('full_name', `%${input.name}%`)
      .limit(10);

    if (error) {
      console.error('findTeacherByName Error:', error);
      throw new Error(`Database error while searching for teachers.`);
    }
    
    return (data || []).map(teacher => ({
      fullName: teacher.full_name,
      email: teacher.email || '',
      contactNumber: teacher.contact_number || '',
      assignedClasses: teacher.assigned_classes || [],
      subjectsTaught: teacher.subjects_taught || [],
    }));
  }
);

// ==================================================================
// Tool 9: List All Teachers
// ==================================================================
export const listAllTeachers = ai.defineTool(
  {
    name: 'listAllTeachers',
    description: 'Get a list of all registered teachers in the school.',
    inputSchema: z.object({}),
    outputSchema: z.array(z.object({
      fullName: z.string(),
      email: z.string(),
      contactNumber: z.string(),
      assignedClasses: z.array(z.string()),
      subjectsTaught: z.array(z.string()),
    })),
  },
  async () => {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('teachers')
      .select('full_name, email, contact_number, assigned_classes, subjects_taught')
      .order('full_name');

    if (error) {
      console.error('listAllTeachers Error:', error);
      throw new Error(`Database error while fetching teachers.`);
    }
    
    return (data || []).map(teacher => ({
      fullName: teacher.full_name,
      email: teacher.email || '',
      contactNumber: teacher.contact_number || '',
      assignedClasses: teacher.assigned_classes || [],
      subjectsTaught: teacher.subjects_taught || [],
    }));
  }
);

// ==================================================================
// Tool 10: List Students in Class
// ==================================================================
export const listStudentsInClass = ai.defineTool(
  {
    name: 'listStudentsInClass',
    description: 'Get a list of all students in a specific grade level or class.',
    inputSchema: z.object({
      gradeLevel: z.string().describe('The grade level or class name (e.g., "Basic 1", "JHS 2").'),
    }),
    outputSchema: z.array(z.object({
      studentId: z.string(),
      fullName: z.string(),
      guardianContact: z.string(),
    })),
  },
  async (input: { gradeLevel: any; }) => {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('students')
      .select('student_id_display, full_name, guardian_contact')
      .eq('grade_level', input.gradeLevel)
      .order('full_name');

    if (error) {
      console.error('listStudentsInClass Error:', error);
      throw new Error(`Database error while fetching students for class ${input.gradeLevel}.`);
    }
    
    return (data || []).map(student => ({
      studentId: student.student_id_display,
      fullName: student.full_name,
      guardianContact: student.guardian_contact,
    }));
  }
);

// ==================================================================
// Tool 11: Get Student Financial Summary
// ==================================================================
export const getStudentFinancials = ai.defineTool(
  {
    name: 'getStudentFinancials',
    description: 'Get financial information for a specific student including payments, arrears, and outstanding balance.',
    inputSchema: z.object({
      studentId: z.string().describe('The unique display ID of the student (e.g., SJS1234).'),
    }),
    outputSchema: z.object({
      studentName: z.string(),
      totalPaid: z.number(),
      outstandingArrears: z.number(),
      recentPayments: z.array(z.object({
        amount: z.number(),
        paymentDate: z.string(),
        termPaidFor: z.string(),
      })),
    }),
  },
  async (input: { studentId: any; }) => {
    const supabase = createClient();
    
    // Get student info
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('full_name')
      .eq('student_id_display', input.studentId)
      .single();

    if (studentError) {
      throw new Error(`Student with ID ${input.studentId} not found.`);
    }

    // Get payment history
    const { data: payments, error: paymentError } = await supabase
      .from('fee_payments')
      .select('amount_paid, payment_date, term_paid_for')
      .eq('student_id_display', input.studentId)
      .order('payment_date', { ascending: false })
      .limit(10);

    if (paymentError) {
      console.error('getStudentFinancials Payment Error:', paymentError);
      throw new Error('Error fetching payment data.');
    }

    // Get arrears
    const { data: arrears, error: arrearsError } = await supabase
      .from('student_arrears')
      .select('amount')
      .eq('student_id_display', input.studentId)
      .eq('status', 'outstanding');

    if (arrearsError) {
      console.error('getStudentFinancials Arrears Error:', arrearsError);
      throw new Error('Error fetching arrears data.');
    }

    const totalPaid = (payments || []).reduce((sum, p) => sum + p.amount_paid, 0);
    const outstandingArrears = (arrears || []).reduce((sum, a) => sum + a.amount, 0);

    return {
      studentName: student.full_name,
      totalPaid,
      outstandingArrears,
      recentPayments: (payments || []).map(p => ({
        amount: p.amount_paid,
        paymentDate: p.payment_date,
        termPaidFor: p.term_paid_for || 'Not specified',
      })),
    };
  }
);

// ==================================================================
// Tool 12: Get Academic Performance Summary for Class
// ==================================================================
export const getClassTermAverage = ai.defineTool(
  {
    name: 'getClassTermAverage',
    description: 'Get academic performance statistics for a specific class and term.',
    inputSchema: z.object({
      gradeLevel: z.string().describe('The grade level or class name (e.g., "Basic 1", "JHS 2").'),
      term: z.string().describe('The term or semester (e.g., "Term 1", "Semester 2").'),
    }),
    outputSchema: z.object({
      className: z.string(),
      term: z.string(),
      totalStudents: z.number(),
      studentsWithResults: z.number(),
      averageScore: z.number(),
      subjectAverages: z.array(z.object({
        subject: z.string(),
        averageScore: z.number(),
        studentCount: z.number(),
      })),
    }),
  },
  async (input: { gradeLevel: any; term: any; }) => {
    const supabase = createClient();
    
    // Get total students in class
    const { count: totalStudents, error: studentCountError } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('grade_level', input.gradeLevel);

    if (studentCountError) {
      throw new Error(`Error counting students in class ${input.gradeLevel}.`);
    }

    // Get academic results for the class and term
    const { data: results, error: resultsError } = await supabase
      .from('student_results')
      .select('student_id_display, subjects_data')
      .eq('class_id', input.gradeLevel)
      .eq('term', input.term)
      .eq('approval_status', 'approved');

    if (resultsError) {
      console.error('getClassTermAverage Error:', resultsError);
      throw new Error('Error fetching academic results.');
    }

    if (!results || results.length === 0) {
      return {
        className: input.gradeLevel,
        term: input.term,
        totalStudents: totalStudents || 0,
        studentsWithResults: 0,
        averageScore: 0,
        subjectAverages: [],
      };
    }

    // Process the JSONB subjects_data to extract individual subject scores
    const allSubjectScores: { [subject: string]: number[] } = {};
    let totalScoreSum = 0;
    let totalScoreCount = 0;

    results.forEach(result => {
      if (Array.isArray(result.subjects_data)) {
        result.subjects_data.forEach((subject: any) => {
          const subjectName = subject.subject;
          const score = subject.total_score;
          
          if (subjectName && typeof score === 'number') {
            if (!allSubjectScores[subjectName]) {
              allSubjectScores[subjectName] = [];
            }
            allSubjectScores[subjectName].push(score);
            totalScoreSum += score;
            totalScoreCount++;
          }
        });
      }
    });

    // Calculate subject averages
    const subjectAverages = Object.entries(allSubjectScores).map(([subject, scores]) => ({
      subject,
      averageScore: scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
      studentCount: scores.length,
    }));

    const overallAverage = totalScoreCount > 0 ? totalScoreSum / totalScoreCount : 0;

    // Calculate overall statistics
    const uniqueStudents = new Set(results.map(r => r.student_id_display));

    return {
      className: input.gradeLevel,
      term: input.term,
      totalStudents: totalStudents || 0,
      studentsWithResults: uniqueStudents.size,
      averageScore: overallAverage,
      subjectAverages,
    };
  }
);

// ==================================================================
// Tool 13: Get Recent Assignments
// ==================================================================
export const getRecentAssignments = ai.defineTool(
  {
    name: 'getRecentAssignments',
    description: 'Get a list of recent assignments across all classes or for a specific class.',
    inputSchema: z.object({
      gradeLevel: z.string().optional().describe('Optional: filter by specific grade level or class.'),
      limit: z.number().optional().default(10).describe('Maximum number of assignments to return.'),
    }),
    outputSchema: z.array(z.object({
      title: z.string(),
      class: z.string(),
      teacherName: z.string(),
      dueDate: z.string(),
      description: z.string(),
    })),
  },
  async (input: { limit?: any; gradeLevel?: any; }) => {
    const supabase = createClient();
    
    let query = supabase
      .from('assignments')
      .select(`
        title,
        class_id,
        description,
        due_date,
        teachers!inner(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(input.limit || 10);

    if (input.gradeLevel) {
      query = query.eq('class_id', input.gradeLevel);
    }

    const { data, error } = await query;

    if (error) {
      console.error('getRecentAssignments Error:', error);
      throw new Error('Error fetching assignments.');
    }

    return (data || []).map(assignment => ({
      title: assignment.title,
      class: assignment.class_id,
      teacherName: (assignment.teachers as any)?.full_name || 'Unknown',
      dueDate: assignment.due_date,
      description: assignment.description || '',
    }));
  }
);

// ==================================================================
// Tool 14: Get Attendance Statistics
// ==================================================================
export const getAttendanceStats = ai.defineTool(
  {
    name: 'getAttendanceStats',
    description: 'Get attendance statistics for a specific class or all classes for a date range.',
    inputSchema: z.object({
      gradeLevel: z.string().optional().describe('Optional: specific grade level or class.'),
      startDate: z.string().optional().describe('Start date in YYYY-MM-DD format (defaults to current month).'),
      endDate: z.string().optional().describe('End date in YYYY-MM-DD format (defaults to today).'),
    }),
    outputSchema: z.object({
      totalRecords: z.number(),
      presentCount: z.number(),
      absentCount: z.number(),
      lateCount: z.number(),
      attendanceRate: z.number(),
      dateRange: z.string(),
    }),
  },
  async (input: { startDate?: string; endDate?: string; gradeLevel?: any; }) => {
    const supabase = createClient();
    
    // Default date range to current month if not provided
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDate = input.startDate || startOfMonth.toISOString().split('T')[0];
    const endDate = input.endDate || today.toISOString().split('T')[0];

    let query = supabase
      .from('attendance_records')
      .select('status')
      .gte('date', startDate)
      .lte('date', endDate);

    if (input.gradeLevel) {
      query = query.eq('class_id', input.gradeLevel);
    }

    const { data, error } = await query;

    if (error) {
      console.error('getAttendanceStats Error:', error);
      throw new Error('Error fetching attendance data.');
    }

    const records = data || [];
    const totalRecords = records.length;
    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    const attendanceRate = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;

    return {
      totalRecords,
      presentCount,
      absentCount,
      lateCount,
      attendanceRate,
      dateRange: `${startDate} to ${endDate}`,
    };
  }
);

// ==================================================================
// Tool 15: Get Behavior Incidents Summary
// ==================================================================
export const getBehaviorIncidents = ai.defineTool(
  {
    name: 'getBehaviorIncidents',
    description: 'Get recent behavior incidents and statistics.',
    inputSchema: z.object({
      limit: z.number().optional().default(10).describe('Maximum number of incidents to return.'),
      incidentType: z.string().optional().describe('Filter by incident type (e.g., "positive", "negative").'),
    }),
    outputSchema: z.object({
      totalIncidents: z.number(),
      recentIncidents: z.array(z.object({
        studentName: z.string(),
        incidentType: z.string(),
        description: z.string(),
        date: z.string(),
        teacherName: z.string(),
      })),
      incidentTypeBreakdown: z.array(z.object({
        type: z.string(),
        count: z.number(),
      })),
    }),
  },
  async (input: { limit?: any; incidentType?: any; }) => {
    const supabase = createClient();
    
    // Get recent incidents
    let recentQuery = supabase
      .from('behavior_incidents')
      .select(`
        student_id_display,
        incident_type,
        description,
        date,
        teachers!inner(full_name)
      `)
      .order('date', { ascending: false })
      .limit(input.limit || 10);

    if (input.incidentType) {
      recentQuery = recentQuery.ilike('incident_type', `%${input.incidentType}%`);
    }

    const { data: recentIncidents, error: recentError } = await recentQuery;

    if (recentError) {
      console.error('getBehaviorIncidents Recent Error:', recentError);
      throw new Error('Error fetching recent behavior incidents.');
    }

    // Get incident type breakdown
    const { data: allIncidents, error: allError } = await supabase
      .from('behavior_incidents')
      .select('incident_type');

    if (allError) {
      console.error('getBehaviorIncidents All Error:', allError);
      throw new Error('Error fetching behavior incident statistics.');
    }

    // Calculate breakdown
    const typeBreakdown = (allIncidents || []).reduce((acc, incident) => {
      const type = incident.incident_type || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const incidentTypeBreakdown = Object.entries(typeBreakdown).map(([type, count]) => ({
      type,
      count,
    }));

    return {
      totalIncidents: (allIncidents || []).length,
      recentIncidents: (recentIncidents || []).map(incident => ({
        studentName: incident.student_id_display,
        incidentType: incident.incident_type,
        description: incident.description || '',
        date: incident.date,
        teacherName: (incident.teachers as any)?.full_name || 'Unknown',
      })),
      incidentTypeBreakdown,
    };
  }
);

// ==================================================================
// Tool 16: Get Admission Applications Summary
// ==================================================================
export const getAdmissionApplications = ai.defineTool(
  {
    name: 'getAdmissionApplications',
    description: 'Get summary of admission applications and their status.',
    inputSchema: z.object({
      status: z.string().optional().describe('Filter by status (e.g., "pending", "approved", "rejected").'),
    }),
    outputSchema: z.object({
      totalApplications: z.number(),
      pendingApplications: z.number(),
      approvedApplications: z.number(),
      rejectedApplications: z.number(),
      recentApplications: z.array(z.object({
        studentName: z.string(),
        gradeApplyingFor: z.string(),
        guardianContact: z.string(),
        status: z.string(),
        applicationDate: z.string(),
      })),
    }),
  },
  async (input: { status?: any; }) => {
    const supabase = createClient();
    
    let query = supabase
      .from('admission_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (input.status) {
      query = query.eq('status', input.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('getAdmissionApplications Error:', error);
      throw new Error('Error fetching admission applications.');
    }

    const applications = data || [];
    const totalApplications = applications.length;
    const pendingApplications = applications.filter(app => app.status === 'pending').length;
    const approvedApplications = applications.filter(app => app.status === 'approved').length;
    const rejectedApplications = applications.filter(app => app.status === 'rejected').length;

    return {
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      recentApplications: applications.slice(0, 10).map(app => ({
        studentName: app.student_name,
        gradeApplyingFor: app.grade_level_applying_for,
        guardianContact: app.guardian_contact,
        status: app.status,
        applicationDate: app.created_at.split('T')[0],
      })),
    };
  }
);

// ==================================================================
// Tool 17: Get School Announcements
// ==================================================================
export const getSchoolAnnouncements = ai.defineTool(
  {
    name: 'getSchoolAnnouncements',
    description: 'Get recent school announcements.',
    inputSchema: z.object({
      limit: z.number().optional().default(10).describe('Maximum number of announcements to return.'),
      targetAudience: z.string().optional().describe('Filter by target audience (e.g., "All", "Students Only", "Teachers Only").'),
    }),
    outputSchema: z.array(z.object({
      title: z.string(),
      message: z.string(),
      targetAudience: z.string(),
      authorName: z.string(),
      createdAt: z.string(),
    })),
  },
  async (input: { limit?: any; targetAudience?: any; }) => {
    const supabase = createClient();
    
    let query = supabase
      .from('school_announcements')
      .select('title, message, target_audience, author_name, created_at')
      .order('created_at', { ascending: false })
      .limit(input.limit || 10);

    if (input.targetAudience) {
      query = query.eq('target_audience', input.targetAudience);
    }

    const { data, error } = await query;

    if (error) {
      console.error('getSchoolAnnouncements Error:', error);
      throw new Error('Error fetching school announcements.');
    }

    return (data || []).map(announcement => ({
      title: announcement.title,
      message: announcement.message,
      targetAudience: announcement.target_audience,
      authorName: announcement.author_name || 'Admin',
      createdAt: announcement.created_at,
    }));
  }
);

// ==================================================================
// Tool 18: Get Expenditure Summary
// ==================================================================
export const getExpenditureSummary = ai.defineTool(
  {
    name: 'getExpenditureSummary',
    description: 'Get summary of school expenditures by category and time period.',
    inputSchema: z.object({
      startDate: z.string().optional().describe('Start date in YYYY-MM-DD format (defaults to current month).'),
      endDate: z.string().optional().describe('End date in YYYY-MM-DD format (defaults to today).'),
    }),
    outputSchema: z.object({
      totalExpenditure: z.number(),
      expendituresByCategory: z.array(z.object({
        category: z.string(),
        totalAmount: z.number(),
        count: z.number(),
      })),
      recentExpenses: z.array(z.object({
        amount: z.number(),
        category: z.string(),
        description: z.string(),
        date: z.string(),
      })),
      dateRange: z.string(),
    }),
  },
  async (input: { startDate?: string; endDate?: string; }) => {
    const supabase = createClient();
    
    // Default date range to current month if not provided
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDate = input.startDate || startOfMonth.toISOString().split('T')[0];
    const endDate = input.endDate || today.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('expenditures')
      .select('amount, category, description, date')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('getExpenditureSummary Error:', error);
      throw new Error('Error fetching expenditure data.');
    }

    const expenditures = data || [];
    const totalExpenditure = expenditures.reduce((sum, exp) => sum + exp.amount, 0);

    // Group by category
    const categoryGroups = expenditures.reduce((acc, exp) => {
      const category = exp.category || 'Other';
      if (!acc[category]) {
        acc[category] = { totalAmount: 0, count: 0 };
      }
      acc[category].totalAmount += exp.amount;
      acc[category].count += 1;
      return acc;
    }, {} as Record<string, { totalAmount: number; count: number }>);

    const expendituresByCategory = Object.entries(categoryGroups).map(([category, data]) => ({
      category,
      totalAmount: data.totalAmount,
      count: data.count,
    }));

    return {
      totalExpenditure,
      expendituresByCategory,
      recentExpenses: expenditures.slice(0, 10).map(exp => ({
        amount: exp.amount,
        category: exp.category || 'Other',
        description: exp.description || '',
        date: exp.date,
      })),
      dateRange: `${startDate} to ${endDate}`,
    };
  }
);

// ==================================================================
// Tool 19: Get Staff Attendance Summary
// ==================================================================
export const getStaffAttendance = ai.defineTool(
  {
    name: 'getStaffAttendance',
    description: 'Get staff/teacher attendance statistics.',
    inputSchema: z.object({
      startDate: z.string().optional().describe('Start date in YYYY-MM-DD format (defaults to current month).'),
      endDate: z.string().optional().describe('End date in YYYY-MM-DD format (defaults to today).'),
    }),
    outputSchema: z.object({
      totalStaff: z.number(),
      attendanceRecords: z.number(),
      presentCount: z.number(),
      absentCount: z.number(),
      attendanceRate: z.number(),
      recentAttendance: z.array(z.object({
        teacherName: z.string(),
        date: z.string(),
        status: z.string(),
      })),
    }),
  },
  async (input: { startDate?: string; endDate?: string; }) => {
    const supabase = createClient();
    
    // Get total staff count
    const { count: totalStaff, error: staffError } = await supabase
      .from('teachers')
      .select('*', { count: 'exact', head: true });

    if (staffError) {
      throw new Error('Error counting staff members.');
    }

    // Default date range to current month if not provided
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDate = input.startDate || startOfMonth.toISOString().split('T')[0];
    const endDate = input.endDate || today.toISOString().split('T')[0];

    const { data: attendance, error: attendanceError } = await supabase
      .from('staff_attendance')
      .select(`
        status,
        date,
        teachers!inner(full_name)
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .limit(50);

    if (attendanceError) {
      console.error('getStaffAttendance Error:', attendanceError);
      throw new Error('Error fetching staff attendance data.');
    }

    const records = attendance || [];
    const attendanceRecords = records.length;
    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const attendanceRate = attendanceRecords > 0 ? (presentCount / attendanceRecords) * 100 : 0;

    return {
      totalStaff: totalStaff || 0,
      attendanceRecords,
      presentCount,
      absentCount,
      attendanceRate,
      recentAttendance: records.slice(0, 10).map(record => ({
        teacherName: (record.teachers as any)?.full_name || 'Unknown',
        date: record.date,
        status: record.status,
      })),
    };
  }
);

// ==================================================================
// Tool 20: Create School Announcement
// ==================================================================
export const sendAnnouncement = ai.defineTool(
  {
    name: 'sendAnnouncement',
    description: 'Create a new school announcement for specified target audience.',
    inputSchema: z.object({
      title: z.string().describe('Title of the announcement.'),
      message: z.string().describe('Content/message of the announcement.'),
      targetAudience: z.string().describe('Target audience: "All", "Students Only", or "Teachers Only".'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
      announcementId: z.string().optional(),
    }),
  },
  async (input: { title: any; message: any; targetAudience: any; }) => {
    const supabase = createClient();
    
    // Get first school's ID for the announcement
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id')
      .limit(1)
      .single();

    if (schoolError || !school) {
      throw new Error('Could not identify school for announcement.');
    }

    const { data, error } = await supabase
      .from('school_announcements')
      .insert({
        school_id: school.id,
        title: input.title,
        message: input.message,
        target_audience: input.targetAudience,
        author_name: 'AI Assistant',
      })
      .select()
      .single();

    if (error) {
      console.error('sendAnnouncement Error:', error);
      return {
        success: false,
        message: 'Failed to create announcement due to database error.',
      };
    }

    return {
      success: true,
      message: `Announcement "${input.title}" successfully created for ${input.targetAudience}.`,
      announcementId: data.id,
    };
  }
);

// ==================================================================
// Deprecated Tools (for backward compatibility)
// ==================================================================
export const deleteUser = ai.defineTool({ 
  name: 'deleteUser', 
  description: 'This tool is disabled for security reasons.', 
  inputSchema: z.any(), 
  outputSchema: z.string() 
}, async () => "User deletion is not available through the AI assistant for security reasons. Please use the admin interface.");

export const getStudentReport = ai.defineTool({ 
  name: 'getStudentReport', 
  description: 'Use getStudentFinancials instead for comprehensive student information.', 
  inputSchema: z.any(), 
  outputSchema: z.string() 
}, async () => "Please use the 'getStudentFinancials' tool for detailed student information including payments and academic data.");

export const getTeacherReport = ai.defineTool({ 
  name: 'getTeacherReport', 
  description: 'Use findTeacherByName or listAllTeachers instead.', 
  inputSchema: z.any(), 
  outputSchema: z.string() 
}, async () => "Please use 'findTeacherByName' or 'listAllTeachers' for teacher information.");

export const listAllStudents = ai.defineTool({ 
  name: 'listAllStudents', 
  description: 'Use listStudentsInClass for better performance, or findStudentByName for search.', 
  inputSchema: z.any(), 
  outputSchema: z.string() 
}, async () => "For better performance, please use 'listStudentsInClass' to get students by grade level, or 'findStudentByName' to search for specific students.");

'use server';

import { createClient, createAuthClient } from "@/lib/supabase/server";

type ActionResponse = {
  success: boolean;
  message: string;
  data?: any;
};

interface ClassPerformance {
  grade_level: string;
  total_students: number;
  average_score: number;
  excellent_count: number; // 80-100%
  good_count: number; // 60-79%
  average_count: number; // 40-59%
  below_average_count: number; // 0-39%
  subjects: SubjectPerformance[];
}

interface SubjectPerformance {
  subject: string;
  average_score: number;
  student_count: number;
}

export async function getStudentPerformanceByGradeAction(): Promise<ActionResponse> {
  const supabase = createAuthClient();

  try {
    // Get current user's school information
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "User not authenticated." };
    }

    // Get admin's school information from user_roles table
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role, school_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleError) throw roleError;
    
    if (!roleData || !['admin', 'accountant', 'super_admin'].includes(roleData.role)) {
      return { success: false, message: "Admin or accountant profile not found." };
    }
    
    const schoolId = roleData.school_id;

    // Get school's current academic year
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .select('current_academic_year')
      .eq('id', schoolId)
      .maybeSingle();

    if (schoolError) throw schoolError;

    const currentAcademicYear = schoolData?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

    // Get all students in the school with their grade levels
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, grade_level, full_name, student_id_display')
      .eq('school_id', schoolId);

    if (studentsError) throw studentsError;

    if (!students || students.length === 0) {
      return { success: true, message: "No students found.", data: [] };
    }

    // Get student results for all students in the current academic year
    const { data: results, error: resultsError } = await supabase
      .from('student_results')
      .select(`
        student_id_display,
        subjects_data,
        average_score
      `)
      .eq('school_id', schoolId)
      .eq('year', currentAcademicYear)
      .not('subjects_data', 'is', null);

    if (resultsError) throw resultsError;

    // Create a map of student_id_display to grade_level for joining
    const studentGradeMap: { [studentId: string]: string } = {};
    students.forEach(student => {
      studentGradeMap[student.student_id_display] = student.grade_level;
    });

    // Group results by grade level
    const performanceByGrade: { [key: string]: ClassPerformance } = {};
    
    // Initialize grade level data
    const gradeLevels = [...new Set(students.map(s => s.grade_level))].filter(Boolean);
    
    gradeLevels.forEach(grade => {
      performanceByGrade[grade] = {
        grade_level: grade,
        total_students: students.filter(s => s.grade_level === grade).length,
        average_score: 0,
        excellent_count: 0,
        good_count: 0,
        average_count: 0,
        below_average_count: 0,
        subjects: []
      };
    });

    if (!results || results.length === 0) {
      return { success: true, message: "No academic results found for current year.", data: Object.values(performanceByGrade) };
    }

    // Group results by student and grade to calculate averages
    const studentAverages: { [studentId: string]: { grade: string, averageScore: number } } = {};
    const subjectData: { [grade: string]: { [subject: string]: number[] } } = {};

    results.forEach((result: any) => {
      const studentId = result.student_id_display;
      const grade = studentGradeMap[studentId];
      const averageScore = result.average_score || 0;
      const subjectsData = result.subjects_data || {};

      // Skip if we can't find the grade for this student
      if (!grade) return;

      // Store student average
      studentAverages[studentId] = { grade, averageScore };

      // Initialize subject data tracking for this grade
      if (!subjectData[grade]) {
        subjectData[grade] = {};
      }

      // Extract individual subject scores from subjects_data JSONB
      if (typeof subjectsData === 'object' && subjectsData !== null) {
        Object.keys(subjectsData).forEach(subject => {
          const subjectInfo = subjectsData[subject];
          if (subjectInfo && typeof subjectInfo.total !== 'undefined') {
            if (!subjectData[grade][subject]) {
              subjectData[grade][subject] = [];
            }
            subjectData[grade][subject].push(subjectInfo.total);
          }
        });
      }
    });

    // Calculate performance statistics for each grade
    Object.keys(studentAverages).forEach(studentId => {
      const student = studentAverages[studentId];
      const grade = student.grade;
      const averageScore = student.averageScore;

      if (performanceByGrade[grade]) {
        // Categorize student performance
        if (averageScore >= 80) {
          performanceByGrade[grade].excellent_count++;
        } else if (averageScore >= 60) {
          performanceByGrade[grade].good_count++;
        } else if (averageScore >= 40) {
          performanceByGrade[grade].average_count++;
        } else {
          performanceByGrade[grade].below_average_count++;
        }
      }
    });

    // Calculate grade averages and subject performance
    Object.keys(performanceByGrade).forEach(grade => {
      const gradeData = performanceByGrade[grade];
      
      // Calculate overall grade average from student averages
      const gradeStudents = Object.values(studentAverages).filter(s => s.grade === grade);
      if (gradeStudents.length > 0) {
        gradeData.average_score = gradeStudents.reduce((sum, student) => sum + student.averageScore, 0) / gradeStudents.length;
      }

      // Calculate subject averages for this grade
      if (subjectData[grade]) {
        gradeData.subjects = Object.keys(subjectData[grade]).map(subject => ({
          subject,
          average_score: subjectData[grade][subject].reduce((sum, score) => sum + score, 0) / subjectData[grade][subject].length,
          student_count: subjectData[grade][subject].length
        })).sort((a, b) => b.average_score - a.average_score);
      }
    });

    const performanceArray = Object.values(performanceByGrade).sort((a, b) => a.grade_level.localeCompare(b.grade_level));

    return { 
      success: true, 
      message: "Student performance data fetched successfully", 
      data: performanceArray 
    };

  } catch (e: any) {
    console.error("Error fetching student performance:", e.message);
    return { success: false, message: e.message };
  }
}

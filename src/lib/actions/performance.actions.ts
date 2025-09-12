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
      .select('id, grade_level, full_name')
      .eq('school_id', schoolId);

    if (studentsError) throw studentsError;

    if (!students || students.length === 0) {
      return { success: true, message: "No students found.", data: [] };
    }

    // Get academic results for all students in the current academic year
    const { data: results, error: resultsError } = await supabase
      .from('academic_results')
      .select(`
        student_id,
        subject,
        total_score,
        students!inner(grade_level)
      `)
      .eq('school_id', schoolId)
      .eq('academic_year', currentAcademicYear)
      .not('total_score', 'is', null);

    if (resultsError) throw resultsError;

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
    const studentAverages: { [studentId: string]: { grade: string, scores: number[] } } = {};
    const subjectData: { [grade: string]: { [subject: string]: number[] } } = {};

    results.forEach((result: any) => {
      const grade = result.students.grade_level;
      const studentId = result.student_id;
      const score = result.total_score;
      const subject = result.subject;

      // Initialize student average tracking
      if (!studentAverages[studentId]) {
        studentAverages[studentId] = { grade, scores: [] };
      }
      studentAverages[studentId].scores.push(score);

      // Initialize subject data tracking
      if (!subjectData[grade]) {
        subjectData[grade] = {};
      }
      if (!subjectData[grade][subject]) {
        subjectData[grade][subject] = [];
      }
      subjectData[grade][subject].push(score);
    });

    // Calculate performance statistics for each grade
    Object.keys(studentAverages).forEach(studentId => {
      const student = studentAverages[studentId];
      const grade = student.grade;
      const averageScore = student.scores.reduce((sum, score) => sum + score, 0) / student.scores.length;

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
      
      // Calculate overall grade average
      const gradeResults = results.filter((r: any) => r.students.grade_level === grade);
      if (gradeResults.length > 0) {
        gradeData.average_score = gradeResults.reduce((sum: number, r: any) => sum + r.total_score, 0) / gradeResults.length;
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

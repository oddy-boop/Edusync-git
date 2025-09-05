'use server';

import { createClient } from "@/lib/supabase/server";

type ActionResponse = {
  success: boolean;
  message: string;
  data?: any;
};

interface UpcomingBirthday {
  id: string;
  full_name: string;
  date_of_birth: string;
  role: 'student' | 'teacher';
  days_until_birthday: number;
  grade_level?: string;
  contact_number?: string;
}

export async function getUpcomingBirthdaysAction(): Promise<ActionResponse> {
  const supabase = createClient();

  try {
    // Get current date
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Get students with birthdays in the next 3 days
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, full_name, date_of_birth, grade_level')
      .not('date_of_birth', 'is', null);

    if (studentsError) throw studentsError;

    // Get teachers with birthdays in the next 3 days
    const { data: teachers, error: teachersError } = await supabase
      .from('teachers')
      .select('id, full_name, date_of_birth, contact_number')
      .not('date_of_birth', 'is', null);

    if (teachersError) throw teachersError;

    const upcomingBirthdays: UpcomingBirthday[] = [];

    // Process students
    if (students) {
      students.forEach(student => {
        if (student.date_of_birth) {
          const birthDate = new Date(student.date_of_birth);
          const thisYearBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
          
          // If birthday has passed this year, check next year
          if (thisYearBirthday < now) {
            thisYearBirthday.setFullYear(currentYear + 1);
          }
          
          const daysDiff = Math.ceil((thisYearBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff >= 0 && daysDiff <= 3) {
            upcomingBirthdays.push({
              id: student.id,
              full_name: student.full_name,
              date_of_birth: student.date_of_birth,
              role: 'student',
              days_until_birthday: daysDiff,
              grade_level: student.grade_level
            });
          }
        }
      });
    }

    // Process teachers
    if (teachers) {
      teachers.forEach(teacher => {
        if (teacher.date_of_birth) {
          const birthDate = new Date(teacher.date_of_birth);
          const thisYearBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
          
          // If birthday has passed this year, check next year
          if (thisYearBirthday < now) {
            thisYearBirthday.setFullYear(currentYear + 1);
          }
          
          const daysDiff = Math.ceil((thisYearBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff >= 0 && daysDiff <= 3) {
            upcomingBirthdays.push({
              id: teacher.id,
              full_name: teacher.full_name,
              date_of_birth: teacher.date_of_birth,
              role: 'teacher',
              days_until_birthday: daysDiff,
              contact_number: teacher.contact_number
            });
          }
        }
      });
    }

    // Sort by days until birthday
    upcomingBirthdays.sort((a, b) => a.days_until_birthday - b.days_until_birthday);

    return { 
      success: true, 
      message: "Upcoming birthdays fetched successfully", 
      data: upcomingBirthdays 
    };

  } catch (e: any) {
    return { success: false, message: e.message };
  }
}


export const GRADE_LEVELS = [
  "Creche",
  "Nursery 1",
  "Nursery 2",
  "KG 1",
  "KG 2",
  "Basic 1",
  "Basic 2",
  "Basic 3",
  "Basic 4",
  "Basic 5",
  "Basic 6",
  "JHS 1",
  "JHS 2",
  "JHS 3",
];

export const SUBJECTS = [
  "Mathematics",
  "English Language",
  "Integrated Science",
  "Social Studies",
  "Religious and Moral Education (R.M.E)",
  "Ghanaian Language (Asante Twi)",
  "French",
  "Computing (ICT)",
  "Creative Arts",
  "Physical Education",
  "Career Technology",
  "Our World, Our People",
  "History",
];

export const BEHAVIOR_INCIDENT_TYPES = [
  "Positive Recognition",
  "Minor Infraction",
  "Moderate Infraction",
  "Serious Infraction",
  "Bullying",
  "Property Damage",
  "Academic Misconduct",
  "Other",
];

export const PAYMENT_METHODS = [
  "Cash",
  "Mobile Money",
  "Bank Transfer",
  "Cheque",
  "Online Payment Gateway",
];

export const DEFAULT_ADMIN_EMAIL = "odoomrichard089@gmail.com";

// Keys for localStorage
export const REGISTERED_STUDENTS_KEY = "registered_students_sjm";
export const REGISTERED_TEACHERS_KEY = "registered_teachers_sjm";
export const APP_SETTINGS_KEY = "app_settings_sjm";
export const CURRENTLY_LOGGED_IN_STUDENT_ID = "currently_logged_in_student_id_sjm";
export const SCHOOL_FEE_STRUCTURE_KEY = "school_fee_structure_sjm";
export const FEE_PAYMENTS_KEY = "fee_payments_sjm";
export const ANNOUNCEMENTS_KEY = "school_announcements_sjm";
export const ACADEMIC_YEAR_SETTING_KEY = "academic_year_setting_sjm"; 

export const ATTENDANCE_ENTRIES_KEY = "attendance_entries_sjm";
export const ASSIGNMENTS_KEY = "assignments_sjm";
export const BEHAVIOR_INCIDENTS_KEY = "behavior_incidents_sjm";
export const ACADEMIC_RESULTS_KEY = "academic_results_sjm";
export const TIMETABLE_ENTRIES_KEY = "timetable_entries_sjm";

export const STUDENT_PREFERENCES_KEY_PREFIX = "student_prefs_sjm_"; // Append studentId
export const TEACHER_SETTINGS_KEY_PREFIX = "teacher_settings_sjm_"; // Append teacherUID

export const ADMIN_LOGGED_IN_KEY = "admin_is_logged_in_sjm";
export const TEACHER_LOGGED_IN_UID_KEY = "teacher_logged_in_uid_sjm";
export const ADMIN_PROFILE_DETAILS_KEY = "admin_profile_details_sjm";


export const ANNOUNCEMENT_TARGETS = [
  { value: "All", label: "All (Students and Teachers)" },
  { value: "Students", label: "Students Only" },
  { value: "Teachers", label: "Teachers Only" },
];

export const DAYS_OF_WEEK = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    // "Saturday", // Uncomment if weekend classes are possible
    // "Sunday",   // Uncomment if weekend classes are possible
];


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
  "Graduated", // Added for students who have completed JHS 3
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

// Keys for localStorage/sessionStorage - primarily for auth status or short-lived session IDs
export const CURRENTLY_LOGGED_IN_STUDENT_ID = "currently_logged_in_student_id_sjm";
export const ADMIN_LOGGED_IN_KEY = "admin_is_logged_in_sjm";
export const TEACHER_LOGGED_IN_UID_KEY = "teacher_logged_in_auth_uid_sjm";


// Keys for UI elements or non-data related preferences if needed
export const STUDENT_PREFERENCES_KEY_PREFIX = "student_prefs_sjm_"; // Append studentId
export const TEACHER_SETTINGS_KEY_PREFIX = "teacher_settings_sjm_"; // Append teacher auth_user_id


// General App Constants
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
];

export const TERMS_ORDER = ["Term 1", "Term 2", "Term 3"];

// The following keys are deprecated for data storage and are being migrated/have been migrated to Supabase.
// They are kept here temporarily for reference during transition or if any minor UI prefs still use them.
// However, core data like results, timetable, student lists, fees, etc., should NOT use these anymore.

export const REGISTERED_STUDENTS_KEY = "registered_students_key_sjm"; // Migrated to Supabase `students` table
export const SCHOOL_FEE_STRUCTURE_KEY = "school_fee_structure_sjm"; // Migrated to Supabase `school_fee_items` table
export const FEE_PAYMENTS_KEY = "fee_payments_sjm"; // Migrated to Supabase `fee_payments` table
export const REGISTERED_TEACHERS_KEY = "registered_teachers_key_sjm"; // Migrated to Supabase `teachers` table & Supabase Auth
    

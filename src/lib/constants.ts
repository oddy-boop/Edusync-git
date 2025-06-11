
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
export const REGISTERED_STUDENTS_KEY = "registered_students_sjm"; // May still be used if login checks a local list first, but primary student data is in Firestore.
export const CURRENTLY_LOGGED_IN_STUDENT_ID = "currently_logged_in_student_id_sjm"; // Key for student ID for non-Firebase Auth session
export const SCHOOL_FEE_STRUCTURE_KEY = "school_fee_structure_sjm"; // To be migrated
export const FEE_PAYMENTS_KEY = "fee_payments_sjm"; // Partially migrated (dashboard reads Firestore), full migration pending
export const ANNOUNCEMENTS_KEY = "school_announcements_sjm"; // To be migrated
export const ACADEMIC_YEAR_SETTING_KEY = "academic_year_setting_sjm"; // For dynamic copyright year

export const ANNOUNCEMENT_TARGETS = [
  { value: "All", label: "All (Students and Teachers)" },
  { value: "Students", label: "Students Only" },
  { value: "Teachers", label: "Teachers Only" },
];

    

export const GRADE_LEVELS = [
  "Creche",
  "Nursery 1",
  "Nursery 2",
  "KG 1",
  "KG 2",
  "Primary 1",
  "Primary 2",
  "Primary 3",
  "Primary 4",
  "Primary 5",
  "Primary 6",
  "JHS 1",
  "JHS 2",
  "JHS 3",
  "Graduated", 
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
  "Paystack"
];

export const PAYMENT_GATEWAYS = {
  PAYSTACK: {
    name: "Paystack",
    code: "paystack",
    supportedCurrencies: ["NGN", "USD", "GHS", "ZAR", "KES"],
    regions: ["Nigeria", "Ghana", "South Africa", "Kenya", "International"],
    description: "Secure payment processing for local African currencies and international USD payments",
    availability: "Available globally - supports both local African markets and international payments",
    internationalSupport: true,
    localSupport: true
  }
};

export const CURRENCIES = [
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
];

export const EXPENDITURE_CATEGORIES = [
  "Office Supplies",
  "Utilities",
  "Maintenance",
  "Salaries",
  "Transportation",
  "Equipment",
  "Marketing",
  "Food & Catering",
  "Security",
  "Internet & Communication",
  "Professional Services",
  "Insurance",
  "Other",
];

// Default monthly budgets for each category (in GHS)
export const DEFAULT_CATEGORY_BUDGETS: Record<string, number> = {
  "Office Supplies": 1000,
  "Utilities": 3000,
  "Maintenance": 2000,
  "Salaries": 15000,
  "Transportation": 1500,
  "Equipment": 5000,
  "Marketing": 2000,
  "Food & Catering": 1000,
  "Security": 2500,
  "Internet & Communication": 800,
  "Professional Services": 3000,
  "Insurance": 1200,
  "Other": 1000,
};

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

export const ACADEMIC_RESULT_APPROVAL_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const PROGRAMS_LIST = [
  {
    title: "Creche & Nursery",
    description: "A nurturing and stimulating environment for our youngest learners. We focus on play-based learning, social development, and foundational literacy and numeracy skills to build a strong base for future learning.",
    aiHint: "children playing",
  },
  {
    title: "Kindergarten",
    description: "Our Kindergarten program builds on early learning with a more structured approach to phonics, reading, writing, and mathematics, while still encouraging creativity and exploration through hands-on activities.",
    aiHint: "teacher reading children"
  },
  {
    title: "Primary School (Basic 1-6)",
    description: "A comprehensive curriculum covering core subjects like English, Mathematics, Science, and Social Studies. We emphasize critical thinking, problem-solving, and collaborative skills.",
    aiHint: "students classroom"
  },
  {
    title: "Junior High School (JHS 1-3)",
    description: "Preparing students for secondary education and beyond. Our JHS program offers a challenging academic environment with a focus on specialized subjects and readiness for standardized examinations.",
    aiHint: "teenagers studying"
  },
];


// DEPRECATED KEYS
export const ADMIN_LOGGED_IN_KEY = "admin_is_logged_in_edusync"; // DEPRECATED
export const TEACHER_LOGGED_IN_UID_KEY = "teacher_logged_in_auth_uid_edusync"; // DEPRECATED
export const REGISTERED_STUDENTS_KEY = "registered_students_key_edusync"; // DEPRECATED
export const SCHOOL_FEE_STRUCTURE_KEY = "school_fee_structure_edusync"; // DEPRECATED
export const FEE_PAYMENTS_KEY = "fee_payments_edusync"; // DEPRECATED
export const REGISTERED_TEACHERS_KEY = "registered_teachers_key_edusync"; // DEPRECATED
export const CURRENTLY_LOGGED_IN_STUDENT_ID = "currently_logged_in_student_id_edusync"; // DEPRECATED


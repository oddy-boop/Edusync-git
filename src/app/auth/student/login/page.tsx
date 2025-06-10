import AuthLayout from "@/components/layout/AuthLayout";
import { StudentLoginForm } from "@/components/forms/StudentLoginForm";

export default function StudentLoginPage() {
  return (
    <AuthLayout
      title="Student Portal Login"
      description="Enter your 10-digit Student ID to continue."
    >
      <StudentLoginForm />
    </AuthLayout>
  );
}

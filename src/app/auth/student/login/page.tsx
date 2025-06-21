
import AuthLayout from "@/components/layout/AuthLayout";
import { StudentLoginForm } from "@/components/forms/StudentLoginForm";

export default function StudentLoginPage() {
  return (
    <AuthLayout
      title="Student Portal Login"
      description="Enter your email and password to continue."
    >
      <StudentLoginForm />
    </AuthLayout>
  );
}

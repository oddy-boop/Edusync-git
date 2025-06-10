import AuthLayout from "@/components/layout/AuthLayout";
import { TeacherLoginForm } from "@/components/forms/TeacherLoginForm";

export default function TeacherLoginPage() {
  return (
    <AuthLayout
      title="Teacher Portal Login"
      description="Access your teaching tools and resources."
    >
      <TeacherLoginForm />
    </AuthLayout>
  );
}

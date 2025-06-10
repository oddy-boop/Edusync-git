import AuthLayout from "@/components/layout/AuthLayout";
import { AdminLoginForm } from "@/components/forms/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <AuthLayout
      title="Admin Portal Login"
      description="Access the administrative dashboard."
    >
      <AdminLoginForm />
    </AuthLayout>
  );
}

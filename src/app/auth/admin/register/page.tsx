import AuthLayout from "@/components/layout/AuthLayout";
import { AdminRegisterForm } from "@/components/forms/AdminRegisterForm";

export default function AdminRegisterPage() {
  return (
    <AuthLayout
      title="Admin Registration"
      description="Create a new administrative account."
    >
      <AdminRegisterForm />
    </AuthLayout>
  );
}

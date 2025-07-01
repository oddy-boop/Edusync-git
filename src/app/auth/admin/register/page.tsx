import AuthLayout from "@/components/layout/AuthLayout";
import { AlertTriangle } from "lucide-react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminRegisterPage() {
  return (
    <AuthLayout
      title="Admin Registration"
      description="For security, new administrators must be invited by an existing admin."
    >
        <div className="text-center p-4 border rounded-lg bg-secondary/50">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-500 mb-2"/>
            <p className="text-sm text-muted-foreground">
              If you are an administrator, please log in and use the "Register Admin" feature from the dashboard.
            </p>
            <Button asChild className="mt-4">
              <Link href="/auth/admin/login">
                Go to Admin Login
              </Link>
            </Button>
        </div>
    </AuthLayout>
  );
}

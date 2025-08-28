



import { AdminLoginForm } from "@/components/forms/AdminLoginForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";


export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-8">
      <div className="w-full px-4 sm:px-0 max-w-md sm:max-w-lg md:max-w-xl mx-auto flex flex-col justify-center space-y-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl font-headline">
              <Shield className="mr-2 h-6 w-6" /> Admin Login
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdminLoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

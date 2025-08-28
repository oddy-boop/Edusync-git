

import { TeacherLoginForm } from "@/components/forms/TeacherLoginForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";


export default function TeacherLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-8">
  <div className="w-full px-4 sm:px-0 max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto flex flex-col justify-center space-y-6">
        <Card className="shadow-lg bg-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl font-headline">
              <Shield className="mr-2 h-6 w-6" /> Teacher Login
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TeacherLoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

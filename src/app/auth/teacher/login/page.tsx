

import { TeacherLoginForm } from "@/components/forms/TeacherLoginForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";


export default function TeacherLoginPage() {
  return (
    <div className="container relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-1 lg:px-0">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[420px]">
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

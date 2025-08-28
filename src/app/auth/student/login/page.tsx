
import { StudentLoginForm } from "@/components/forms/StudentLoginForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";


export default function StudentLoginPage() {
    return (
    <div className="container relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-1 lg:px-0">
      <div className="w-full px-4 sm:px-0 max-w-md sm:max-w-lg md:max-w-xl mx-auto flex flex-col justify-center space-y-6">
        <Card className="shadow-lg bg-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl font-headline">
              <Shield className="mr-2 h-6 w-6" /> Student Login
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StudentLoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


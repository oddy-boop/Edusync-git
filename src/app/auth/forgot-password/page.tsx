
'use server';

import { ForgotPasswordForm } from "@/components/forms/ForgotPasswordForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";
import React from 'react';
import { getSchoolBrandingAction } from "@/lib/actions/payment.actions";

export default async function ForgotPasswordPage() {
  // keep a lightweight fetch so future branding logic can be added if needed
  const settingsResult = await getSchoolBrandingAction();

  return (
    <div className="min-h-screen flex items-center justify-center py-8">
      <div className="w-full px-4 sm:px-0 max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto flex flex-col justify-center space-y-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl font-headline">
              <Mail className="mr-2 h-6 w-6" /> Reset Your Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ForgotPasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

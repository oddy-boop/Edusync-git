
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UserCircle, Mail, ShieldCheck } from "lucide-react";
import { ADMIN_PROFILE_DETAILS_KEY } from "@/lib/constants";

// This is the hardcoded admin email, also used in login/registration logic
const DEFAULT_ADMIN_EMAIL = "odoomrichard089@gmail.com";

interface AdminProfile {
  fullName: string;
  email: string;
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedProfileRaw = localStorage.getItem(ADMIN_PROFILE_DETAILS_KEY);
      if (storedProfileRaw) {
        try {
          const storedProfile = JSON.parse(storedProfileRaw);
          // Ensure the email matches the allowed admin email for security/consistency
          if (storedProfile.email && storedProfile.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
            setProfile(storedProfile);
          } else {
            // Stored email doesn't match, fall back to default
            setProfile({ fullName: "Admin User (Default)", email: DEFAULT_ADMIN_EMAIL });
          }
        } catch (error) {
          console.error("Failed to parse admin profile from localStorage", error);
          setProfile({ fullName: "Admin User (Error)", email: DEFAULT_ADMIN_EMAIL });
        }
      } else {
        // No profile stored, use default
        setProfile({ fullName: "Admin User (Not Registered)", email: DEFAULT_ADMIN_EMAIL });
      }
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-headline font-semibold text-primary">Admin Profile</h2>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCircle className="mr-3 h-7 w-7 text-primary" /> Loading Profile...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Fetching your profile details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">Admin Profile</h2>
      
      <Card className="shadow-lg max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCircle className="mr-3 h-7 w-7 text-primary" /> 
            {profile?.fullName || "Administrator"}
          </CardTitle>
          <CardDescription>
            Your administrator account details. This information is for display purposes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="flex items-center">
              <UserCircle className="mr-2 h-4 w-4 text-muted-foreground" /> Full Name
            </Label>
            <Input id="fullName" value={profile?.fullName || "N/A"} readOnly className="bg-muted/50" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center">
              <Mail className="mr-2 h-4 w-4 text-muted-foreground" /> Email Address
            </Label>
            <Input id="email" type="email" value={profile?.email || DEFAULT_ADMIN_EMAIL} readOnly className="bg-muted/50" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role" className="flex items-center">
              <ShieldCheck className="mr-2 h-4 w-4 text-muted-foreground" /> Role
            </Label>
            <Input id="role" value="Administrator" readOnly className="bg-muted/50" />
          </div>

          <p className="text-sm text-muted-foreground pt-2">
            To update your full name, please use the admin registration form with the email <code className="font-mono bg-muted px-1 py-0.5 rounded">{DEFAULT_ADMIN_EMAIL}</code>. Password changes are not supported in this mock version.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

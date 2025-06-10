
"use client";

import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UserCircle, Mail, ShieldCheck, Save, KeyRound } from "lucide-react";
import { ADMIN_PROFILE_DETAILS_KEY, DEFAULT_ADMIN_EMAIL } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';

const profileSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  email: z.string().email("Invalid email address."),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "New password must be at least 6 characters.").optional().or(z.literal('')),
  confirmNewPassword: z.string().optional(),
}).refine(data => {
  if (data.newPassword && data.newPassword !== data.confirmNewPassword) {
    return false;
  }
  return true;
}, {
  message: "New passwords don't match.",
  path: ["confirmNewPassword"],
}).refine(data => {
  // If newPassword is provided, currentPassword should ideally also be provided (though we don't validate it here for mock)
  if (data.newPassword && !data.currentPassword) {
    // This validation can be enabled if strictness is desired even in mock
    // return false; 
  }
  return true;
}, {
  message: "Current password is required to set a new password.",
  path: ["currentPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function AdminProfilePage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [currentLoginEmail, setCurrentLoginEmail] = useState(DEFAULT_ADMIN_EMAIL);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      email: DEFAULT_ADMIN_EMAIL,
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedProfileRaw = localStorage.getItem(ADMIN_PROFILE_DETAILS_KEY);
      let initialFullName = "Admin User";
      let initialEmail = DEFAULT_ADMIN_EMAIL;

      if (storedProfileRaw) {
        try {
          const storedProfile = JSON.parse(storedProfileRaw);
          initialFullName = storedProfile.fullName || initialFullName;
          initialEmail = storedProfile.email || initialEmail;
        } catch (error) {
          console.error("Failed to parse admin profile from localStorage", error);
          initialFullName = "Admin User (Error)";
        }
      } else {
         initialFullName = "Admin User (Not Set)";
      }
      form.reset({
        fullName: initialFullName,
        email: initialEmail,
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      setCurrentLoginEmail(initialEmail); // Store current login email for display
      setIsLoading(false);
    }
  }, [form]);

  const onSubmit = (data: ProfileFormData) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_PROFILE_DETAILS_KEY, JSON.stringify({ fullName: data.fullName, email: data.email }));
      setCurrentLoginEmail(data.email); // Update displayed login email
      toast({
        title: "Profile Updated",
        description: "Your full name and login email have been saved.",
      });

      if (data.newPassword && data.newPassword === data.confirmNewPassword) {
        // MOCK: In a real app, you'd call a backend service to securely change the password.
        // Here, we just acknowledge it. The password is NOT saved.
        toast({
          title: "Password Update Noted (Mock)",
          description: "Your new password has been noted for demonstration. It is not securely stored in this version.",
        });
        form.reset({ ...form.getValues(), currentPassword: "", newPassword: "", confirmNewPassword: "" }); // Reset password fields
      } else if (data.newPassword && data.newPassword !== data.confirmNewPassword) {
        // This case should be caught by Zod, but good to have a fallback.
         form.setError("confirmNewPassword", { message: "New passwords do not match." });
      }
    }
  };
  
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
      <h2 className="text-3xl font-headline font-semibold text-primary">Admin Profile Management</h2>
      
      <Card className="shadow-lg max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCircle className="mr-3 h-7 w-7 text-primary" /> 
                Edit Your Profile
              </CardTitle>
              <CardDescription>
                Update your administrator account details. The email saved here will become your new login email.
                Password changes are for demonstration purposes and are not securely handled in this mock version.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" />Login Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your-email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground pt-1">
                      This email will be used for logging into the admin portal.
                    </p>
                  </FormItem>
                )}
              />
              
              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center">
                  <ShieldCheck className="mr-2 h-4 w-4 text-muted-foreground" /> Role
                </Label>
                <Input id="role" value="Administrator" readOnly className="bg-muted/50" />
              </div>

              <Separator />
              <h3 className="text-lg font-medium flex items-center"><KeyRound className="mr-2 h-5 w-5 text-primary/80"/>Change Password (Mock)</h3>
               <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter current password" {...field} />
                    </FormControl>
                    <FormMessage />
                     <p className="text-xs text-muted-foreground pt-1">For demonstration. Not validated in this version.</p>
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter new password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="confirmNewPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm new password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex-col items-start gap-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
               <p className="text-sm text-muted-foreground pt-2 border-t mt-4 w-full">
                Your current login email is <code className="font-mono bg-muted px-1 py-0.5 rounded">{currentLoginEmail}</code>.
                Initial admin registration must use <code className="font-mono bg-muted px-1 py-0.5 rounded">{DEFAULT_ADMIN_EMAIL}</code>.
                <br />
                <strong>Note:</strong> Password functionality is for demonstration purposes only. Passwords are not securely stored or validated in this mock application.
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}


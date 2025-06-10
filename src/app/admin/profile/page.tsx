
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
import { UserCircle, Mail, ShieldCheck, Save } from "lucide-react";
import { ADMIN_PROFILE_DETAILS_KEY, DEFAULT_ADMIN_EMAIL } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

interface AdminProfileData {
  fullName: string;
  email: string;
}

const profileSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  email: z.string().email("Invalid email address."),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function AdminProfilePage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      email: DEFAULT_ADMIN_EMAIL, // Default to the system's base admin email
    },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedProfileRaw = localStorage.getItem(ADMIN_PROFILE_DETAILS_KEY);
      if (storedProfileRaw) {
        try {
          const storedProfile = JSON.parse(storedProfileRaw);
          form.reset({
            fullName: storedProfile.fullName || "Admin User",
            email: storedProfile.email || DEFAULT_ADMIN_EMAIL,
          });
        } catch (error) {
          console.error("Failed to parse admin profile from localStorage", error);
          form.reset({ fullName: "Admin User (Error)", email: DEFAULT_ADMIN_EMAIL });
        }
      } else {
        // No profile stored, form uses defaultValues which includes DEFAULT_ADMIN_EMAIL
         form.reset({ fullName: "Admin User (Not Set)", email: DEFAULT_ADMIN_EMAIL });
      }
      setIsLoading(false);
    }
  }, [form]);

  const onSubmit = (data: ProfileFormData) => {
    if (typeof window !== 'undefined') {
      // Ensure that if the email being saved is different from DEFAULT_ADMIN_EMAIL,
      // it's an intentional update by an already authenticated admin.
      // The login form will handle which email to use for auth.
      localStorage.setItem(ADMIN_PROFILE_DETAILS_KEY, JSON.stringify(data));
      toast({
        title: "Profile Updated",
        description: "Your profile details have been saved.",
      });
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
      <h2 className="text-3xl font-headline font-semibold text-primary">Admin Profile</h2>
      
      <Card className="shadow-lg max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCircle className="mr-3 h-7 w-7 text-primary" /> 
                Edit Your Profile
              </CardTitle>
              <CardDescription>
                Update your administrator account details. The email saved here will be used for login.
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
                    <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" />Email Address</FormLabel>
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
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </form>
        </Form>
        <CardContent>
           <p className="text-sm text-muted-foreground pt-2 border-t mt-4">
            Initial admin registration must use the email <code className="font-mono bg-muted px-1 py-0.5 rounded">{DEFAULT_ADMIN_EMAIL}</code>.
            Once registered, you can update the login email here. Password changes are not supported in this mock version.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

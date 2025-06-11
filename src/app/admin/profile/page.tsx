
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
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, type User } from 'firebase/auth';
import { DEFAULT_ADMIN_EMAIL } from '@/lib/constants';

const profileSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  email: z.string().email("Invalid email address."),
  currentPassword: z.string().optional(), // Required only if changing email or password
  newPassword: z.string().optional().refine(val => val ? val.length >= 6 : true, "New password must be at least 6 characters."),
  confirmNewPassword: z.string().optional(),
}).refine(data => {
  // If newPassword is set, confirmNewPassword must match
  if (data.newPassword && data.newPassword !== data.confirmNewPassword) {
    return false;
  }
  return true;
}, {
  message: "New passwords don't match.",
  path: ["confirmNewPassword"],
}).refine(data => {
  // If newPassword is set, currentPassword must be provided
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: "Current password is required to set a new password.",
  path: ["currentPassword"],
}).refine(data => {
    // If email is being changed from the initial one and currentPassword is not provided
    const currentUser = auth.currentUser;
    if (currentUser && data.email !== currentUser.email && !data.currentPassword) {
        return false;
    }
    return true;
}, {
    message: "Current password is required to change your email address.",
    path: ["currentPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function AdminProfilePage() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      email: "",
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        form.reset({
          fullName: user.displayName || "",
          email: user.email || "",
          currentPassword: "",
          newPassword: "",
          confirmNewPassword: "",
        });
      } else {
        setCurrentUser(null);
        // Optionally redirect to login if no user
        // router.push('/auth/admin/login');
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [form]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!currentUser) {
      toast({ title: "Error", description: "Not authenticated.", variant: "destructive" });
      return;
    }

    form.clearErrors(); // Clear previous errors

    try {
      // Update Full Name
      if (data.fullName !== currentUser.displayName) {
        await updateProfile(currentUser, { displayName: data.fullName });
        toast({ title: "Success", description: "Full name updated." });
      }

      // Re-authentication guard for email/password changes
      const needsReauth = (data.email !== currentUser.email && data.email !== "") || (!!data.newPassword);
      let reauthenticated = !needsReauth;

      if (needsReauth) {
        if (!data.currentPassword) {
          form.setError("currentPassword", { message: "Current password is required to change email or password." });
          toast({ title: "Error", description: "Current password is required.", variant: "destructive" });
          return;
        }
        try {
          const credential = EmailAuthProvider.credential(currentUser.email!, data.currentPassword);
          await reauthenticateWithCredential(currentUser, credential);
          reauthenticated = true;
          toast({ title: "Re-authentication Successful", description: "You can now update your email/password." });
        } catch (error: any) {
          form.setError("currentPassword", { message: "Incorrect current password." });
          toast({ title: "Re-authentication Failed", description: "Incorrect current password.", variant: "destructive" });
          return; // Stop if re-authentication fails
        }
      }
      
      if (reauthenticated) {
        // Update Email
        if (data.email !== currentUser.email && data.email !== "") {
            if (data.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase() && currentUser.email?.toLowerCase() !== DEFAULT_ADMIN_EMAIL.toLowerCase()) {
                 toast({
                    title: "Email Change Blocked",
                    description: `Cannot change email back to the default initial admin email '${DEFAULT_ADMIN_EMAIL}'.`,
                    variant: "destructive",
                });
            } else {
                await updateEmail(currentUser, data.email);
                toast({ title: "Success", description: "Login email updated." });
                 // Update form with new email, as currentUser might not update immediately
                form.setValue('email', data.email);
            }
        }

        // Update Password
        if (data.newPassword) {
          if (data.newPassword !== data.confirmNewPassword) {
            form.setError("confirmNewPassword", { message: "New passwords do not match."});
            return;
          }
          await updatePassword(currentUser, data.newPassword);
          toast({ title: "Success", description: "Password updated successfully." });
          form.reset({ ...form.getValues(), currentPassword: "", newPassword: "", confirmNewPassword: "" });
        }
      }
      // Refresh current user data if needed or rely on onAuthStateChanged
      setCurrentUser(auth.currentUser); 


    } catch (error: any) {
      console.error("Profile update error:", error);
      let description = "Failed to update profile.";
      if (error.code === 'auth/requires-recent-login') {
        description = "This operation is sensitive and requires recent authentication. Please enter your current password to re-authenticate.";
        form.setError("currentPassword", { message: "Re-authentication required." });
      } else if (error.code === 'auth/email-already-in-use') {
        description = "This email is already in use by another account.";
        form.setError("email", { message: "Email already in use." });
      } else if (error.code === 'auth/weak-password') {
        description = "The new password is too weak.";
        form.setError("newPassword", { message: "Password is too weak." });
      }
      toast({ title: "Update Failed", description: description, variant: "destructive" });
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-headline font-semibold text-primary">Admin Profile</h2>
        <Card className="shadow-lg">
          <CardHeader><CardTitle className="flex items-center"><UserCircle className="mr-3 h-7 w-7 text-primary" /> Loading Profile...</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">Fetching your profile details...</p></CardContent>
        </Card>
      </div>
    );
  }

  if (!currentUser) {
     return (
      <div className="space-y-6">
        <h2 className="text-3xl font-headline font-semibold text-primary">Admin Profile</h2>
        <Card className="shadow-lg">
          <CardHeader><CardTitle className="flex items-center"><UserCircle className="mr-3 h-7 w-7 text-primary" /> Not Authenticated</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">Please log in to view your profile.</p></CardContent>
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
                Password changes require your current password for security.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />Full Name</FormLabel>
                    <FormControl><Input placeholder="Enter your full name" {...field} /></FormControl>
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
                    <FormControl><Input type="email" placeholder="your-email@example.com" {...field} /></FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground pt-1">
                      This email will be used for logging into the admin portal. 
                      You cannot change this back to '{DEFAULT_ADMIN_EMAIL}' if it's currently different.
                    </p>
                  </FormItem>
                )}
              />
              
              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center"><ShieldCheck className="mr-2 h-4 w-4 text-muted-foreground" /> Role</Label>
                <Input id="role" value="Administrator" readOnly className="bg-muted/50" />
              </div>

              <Separator />
              <h3 className="text-lg font-medium flex items-center"><KeyRound className="mr-2 h-5 w-5 text-primary/80"/>Change Email / Password</h3>
               <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl><Input type="password" placeholder="Required to change email/password" {...field} /></FormControl>
                    <FormMessage />
                     <p className="text-xs text-muted-foreground pt-1">Required if you are changing your email or password.</p>
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password (Optional)</FormLabel>
                    <FormControl><Input type="password" placeholder="Enter new password" {...field} /></FormControl>
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
                    <FormControl><Input type="password" placeholder="Confirm new password" {...field} /></FormControl>
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
                Your current login email is <code className="font-mono bg-muted px-1 py-0.5 rounded">{currentUser?.email}</code>.
                Initial admin registration must use the email <code className="font-mono bg-muted px-1 py-0.5 rounded">{DEFAULT_ADMIN_EMAIL}</code>.
                <br />
                <strong>Note:</strong> For security, changing your email or password requires you to enter your current password.
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}

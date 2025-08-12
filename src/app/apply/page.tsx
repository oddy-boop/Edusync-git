
'use client';

import { useActionState, useRef, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import PublicLayout from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, User, Baby, Shield, GraduationCap, Phone, Mail, MapPin, Church } from 'lucide-react';
import { GRADE_LEVELS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { applyForAdmissionAction } from '@/lib/actions/admission.actions';
import { getSupabase } from '@/lib/supabaseClient';

const initialState = {
  success: false,
  message: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full text-lg py-6" disabled={pending}>
      {pending ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting Application...</> : "Submit Application"}
    </Button>
  );
}

export default function ApplyPage() {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(applyForAdmissionAction, initialState);
  const [pageSettings, setPageSettings] = useState({ schoolName: null, logoUrl: null, socials: {}, schoolAddress: null, schoolEmail: null, academicYear: null, updated_at: undefined });
  
  // We need a local pending state because useFormStatus is only available inside the form
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
        const supabase = getSupabase();
        const { data } = await supabase.from('app_settings').select('school_name, school_logo_url, school_address, school_email, facebook_url, twitter_url, instagram_url, linkedin_url, updated_at, current_academic_year').single();
        if (data) {
            setPageSettings({
                schoolName: data.school_name,
                logoUrl: data.school_logo_url,
                socials: { facebook: data.facebook_url, twitter: data.twitter_url, instagram: data.instagram_url, linkedin: data.linkedin_url },
                schoolAddress: data.school_address,
                schoolEmail: data.school_email,
                academicYear: data.current_academic_year,
                updated_at: data.updated_at,
            });
        }
    }
    fetchSettings();
  }, []);

  useEffect(() => {
    // When the server action completes, reset the local submitting state.
    setIsSubmitting(false);

    if (state.message) {
      if (state.success) {
        toast({ title: 'Application Submitted!', description: state.message });
        formRef.current?.reset();
      } else {
        toast({ title: 'Submission Failed', description: state.message, variant: 'destructive' });
      }
    }
  }, [state, toast]);

  if (state.success) {
    return (
      <PublicLayout {...pageSettings}>
        <div className="container mx-auto py-16 px-4 text-center min-h-[60vh] flex items-center justify-center">
            <Card className="max-w-xl shadow-lg">
                <CardHeader>
                    <div className="mx-auto bg-green-100 dark:bg-green-900/30 rounded-full h-16 w-16 flex items-center justify-center mb-4">
                        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <CardTitle className="text-2xl">Application Received!</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{state.message}</p>
                    <p className="text-muted-foreground mt-2">We will review your application and be in touch soon.</p>
                </CardContent>
            </Card>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout {...pageSettings}>
      <div className="container mx-auto py-16 px-4">
        <Card className="max-w-3xl mx-auto shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-headline font-bold text-primary">Online Application Form</CardTitle>
            <CardDescription>Please fill out all fields accurately to apply for admission.</CardDescription>
          </CardHeader>
          <CardContent>
            <form 
                ref={formRef} 
                action={formAction} 
                onSubmit={(e) => {
                    // Prevent default synchronous submission
                    e.preventDefault();
                    // If already submitting, do nothing.
                    if (isSubmitting) return;
                    setIsSubmitting(true);
                    // Create FormData from the form and trigger the server action
                    const formData = new FormData(e.currentTarget);
                    formAction(formData);
                }}
                className="space-y-8"
            >
              <section className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2 border-b pb-2"><User className="text-primary"/> Student Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" name="fullName" placeholder="Enter student's full name" required />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="studentReligion" className="flex items-center gap-1"><Church size={14}/> Student's Religion</Label>
                      <Input id="studentReligion" name="studentReligion" placeholder="e.g., Christianity" />
                    </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentLocation" className="flex items-center gap-1"><MapPin size={14}/> Student's Location/Address</Label>
                  <Input id="studentLocation" name="studentLocation" placeholder="e.g., Adenta, Accra" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="gradeLevelApplyingFor">Grade/Class Applying For</Label>
                        <Select name="gradeLevelApplyingFor" required>
                            <SelectTrigger id="gradeLevelApplyingFor"><SelectValue placeholder="Select a class" /></SelectTrigger>
                            <SelectContent>{GRADE_LEVELS.filter(g => g !== 'Graduated').map(grade => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="previousSchoolName">Previous School Name (if any)</Label>
                        <Input id="previousSchoolName" name="previousSchoolName" placeholder="Name of previous school" />
                    </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2 border-b pb-2"><Shield className="text-primary"/> Guardian Information</h3>
                 <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fatherName">Father's Name</Label>
                      <Input id="fatherName" name="fatherName" placeholder="Enter father's full name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="motherName">Mother's Name</Label>
                      <Input id="motherName" name="motherName" placeholder="Enter mother's full name" />
                    </div>
                </div>
                 <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="guardianReligion" className="flex items-center gap-1"><Church size={14}/> Guardian's Religion</Label>
                      <Input id="guardianReligion" name="guardianReligion" placeholder="e.g., Christianity" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guardianLocation" className="flex items-center gap-1"><MapPin size={14}/> Guardian's Location/Address</Label>
                      <Input id="guardianLocation" name="guardianLocation" placeholder="e.g., Madina, Accra" />
                    </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="guardianContact" className="flex items-center gap-1"><Phone size={14}/> Guardian's Contact Number</Label>
                      <Input id="guardianContact" name="guardianContact" placeholder="e.g., 024XXXXXXX" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guardianEmail" className="flex items-center gap-1"><Mail size={14}/> Guardian's Email Address</Label>
                      <Input id="guardianEmail" name="guardianEmail" type="email" placeholder="guardian@example.com" required />
                    </div>
                </div>
              </section>

              {state.message && !state.success && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Submission Error</AlertTitle>
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
              )}
              
               <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting Application...</> : "Submit Application"}
               </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}

'use client';

import { useActionState, useRef, useEffect, useState, Suspense } from 'react';
import { useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
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
import { getAllSchoolsAction } from '@/lib/actions/school.actions';
import { getSchoolSettings } from '@/lib/actions/settings.actions';

type PageSettings = {
  schoolName?: string | null;
  logoUrl?: string | null;
  socials?: {
    facebook?: string | null;
    twitter?: string | null;
    instagram?: string | null;
    linkedin?: string | null;
  } | null;
  schoolAddress?: string | null;
  schoolEmail?: string | null;
  academicYear?: string | null;
  updated_at?: string | undefined;
};

const initialState = {
  success: false,
  message: '',
};

function SubmitButton({ isLoading }: { isLoading: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full text-lg py-6" disabled={pending || isLoading}>
      {pending ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting Application...</> : "Submit Application"}
    </Button>
  );
}

interface School {
    id: number;
    name: string;
}

function ApplyPageContent() {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const searchParams = useSearchParams();
  let preSelectedSchoolId = searchParams ? searchParams.get('schoolId') : null;
  if (!preSelectedSchoolId) {
    try {
      const raw = localStorage.getItem('selectedSchool');
      if (raw) {
        const sel = JSON.parse(raw);
        preSelectedSchoolId = sel?.id?.toString();
      }
    } catch (e) {
      // ignore
    }
  }
  const [state, formAction] = useActionState(applyForAdmissionAction, initialState);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [schoolsError, setSchoolsError] = useState<string | null>(null);
  const [pageSettings, setPageSettings] = useState<PageSettings>({
    schoolName: "",
    logoUrl: null,
    socials: { facebook: null, twitter: null, instagram: null, linkedin: null },
    schoolAddress: null,
    schoolEmail: null,
    academicYear: null,
    updated_at: undefined,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        setSchoolsLoading(true);
        setSchoolsError(null);
        
        // Fetch both schools and settings
        const [schoolsResult, settingsResult] = await Promise.all([
          getAllSchoolsAction(),
          getSchoolSettings(),
        ]);
        
        console.log('Schools result:', schoolsResult); // Debug log
        
        if (schoolsResult.success && schoolsResult.data) {
          setSchools(schoolsResult.data);
          console.log('Schools set:', schoolsResult.data); // Debug log
          
          // Auto-select school if schoolId is provided in URL
          if (preSelectedSchoolId) {
            const preSelected = schoolsResult.data.find(
              (school: School) => school.id.toString() === preSelectedSchoolId
            );
            if (preSelected) {
              setSelectedSchool(preSelected);
              console.log('Pre-selected school:', preSelected);
            }
          }
        } else {
          setSchoolsError('Failed to load school branches');
          console.error('Schools fetch failed:', schoolsResult);
        }
        
        // Handle settings for layout
        if (settingsResult.data && !settingsResult.error) {
          const settingsData = settingsResult.data;
          setPageSettings({
            schoolName: settingsData.name,
            logoUrl: settingsData.logo_url,
            socials: { 
              facebook: settingsData.facebook_url,
              twitter: settingsData.twitter_url,
              instagram: settingsData.instagram_url,
              linkedin: settingsData.linkedin_url,
            },
            schoolAddress: settingsData.address,
            schoolEmail: settingsData.email,
            academicYear: settingsData.current_academic_year,
            updated_at: settingsData.updated_at,
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        setSchoolsError('Failed to load school data');
      } finally {
        setSchoolsLoading(false);
      }
    }
    
    fetchSettings();
  }, []);

  useEffect(() => {
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
      <PublicLayout {...(pageSettings as any)} schoolName={pageSettings.schoolName ?? ""}>
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
    <PublicLayout {...(pageSettings as any)}>
      <div className="container mx-auto py-16 px-4">
        <Card className="max-w-3xl mx-auto shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-headline font-bold text-primary">Online Application Form</CardTitle>
            <CardDescription>
              {selectedSchool 
                ? `Complete your application for ${selectedSchool.name}` 
                : "Please fill out all fields accurately to apply for admission."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form 
                ref={formRef} 
                action={formAction}
                className="space-y-8"
            >
              <section className="space-y-4">
                {/* Show selected school info if pre-selected, otherwise show dropdown */}
                {selectedSchool ? (
                  <div className="space-y-2">
                    <Label>Applying to</Label>
                    <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/50">
                      <User className="h-4 w-4 text-primary" />
                      <span className="font-medium">{selectedSchool.name}</span>
                    </div>
                    {/* Hidden input to pass the school ID */}
                    <input type="hidden" name="schoolId" value={selectedSchool.id} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="schoolId">Select Branch to Apply To</Label>
                    {schoolsLoading ? (
                      <div className="flex items-center space-x-2 p-3 border rounded-md">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Loading school branches...</span>
                      </div>
                    ) : schoolsError ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{schoolsError}</AlertDescription>
                      </Alert>
                    ) : schools.length === 0 ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>No school branches available at this time.</AlertDescription>
                      </Alert>
                    ) : (
                      <Select name="schoolId" required>
                        <SelectTrigger id="schoolId">
                          <SelectValue placeholder="Select a school branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {schools.map(school => (
                            <SelectItem key={school.id} value={school.id.toString()}>
                              {school.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
                
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
              
               <SubmitButton isLoading={schoolsLoading} />
            </form>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}

function LoadingFallback() {
  return (
    <div className="container mx-auto py-16 px-4">
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ApplyPageContent />
    </Suspense>
  );
}
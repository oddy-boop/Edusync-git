
'use client';

import { useActionState, useRef, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useToast } from '@/hooks/use-toast';
import { sendContactMessageAction } from '@/lib/actions/contact.actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Mail } from 'lucide-react';
import { getSchoolsAction, getSchoolByIdAction } from '@/lib/actions/school.actions';

const initialState = {
  success: false,
  message: '',
  errors: undefined,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Send Message
    </Button>
  );
}

interface School {
    id: number;
    name: string;
}

interface SelectedSchool {
    id: number | string;
    name: string;
    logo_url?: string | null;
    domain?: string | null;
}

export function ContactForm() {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(sendContactMessageAction, initialState);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [isLoadingSchool, setIsLoadingSchool] = useState(true);

  useEffect(() => {
    async function detectSchool() {
      try {
        // First, try to get school from localStorage
        const raw = localStorage.getItem('selectedSchool');
        if (raw) {
          const selectedSchool: SelectedSchool = JSON.parse(raw);
          setCurrentSchool({
            id: Number(selectedSchool.id),
            name: selectedSchool.name
          });
          setIsLoadingSchool(false);
          return;
        }
      } catch (e) {
        console.log('No school found in localStorage or parsing failed');
      }

      // If no school in localStorage, get the first available school
      try {
        const result = await getSchoolsAction();
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          const firstSchool = result.data[0];
          setCurrentSchool({
            id: Number(firstSchool.id),
            name: firstSchool.name
          });
        }
      } catch (e) {
        console.error('Failed to fetch schools:', e);
      }
      
      setIsLoadingSchool(false);
    }
    
    detectSchool();
  }, []);

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast({ title: "Message Sent!", description: state.message });
        formRef.current?.reset();
      } else {
        toast({ title: "Error", description: state.message, variant: "destructive" });
      }
    }
  }, [state, toast]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className='flex items-center'><Mail className='mr-2 h-5 w-5'/> Send us a Message</CardTitle>
        <CardDescription>We'd love to hear from you.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingSchool ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : currentSchool ? (
          <form ref={formRef} action={formAction} className="space-y-4">
            {/* Hidden school ID field */}
            <input type="hidden" name="schoolId" value={currentSchool.id} />
            
            {/* Show which school is being contacted */}
            <div className="bg-muted/50 p-3 rounded-lg border">
              <p className="text-sm text-muted-foreground">
                <strong>Contacting:</strong> {currentSchool.name}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="Your Name" required/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="your.email@example.com" required/>
              </div>
            </div>
            <div className="space-y-1">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" placeholder="e.g., Admission Inquiry" required/>
            </div>
            <div className="space-y-1">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" name="message" placeholder="Your message here..." required rows={5}/>
            </div>
            <SubmitButton />
          </form>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Unable to load school information. Please try again later.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

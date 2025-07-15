
"use client";

import { useActionState, useRef, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mail } from 'lucide-react';
import { sendContactMessageAction } from '@/lib/actions/contact.actions';
import { useToast } from '@/hooks/use-toast';

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

export default function ContactPage() {
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(sendContactMessageAction, initialState);

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
    <PublicLayout>
      <div className="container mx-auto py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-4 font-headline">Get In Touch</h1>
            <p className="text-muted-foreground mb-6">
              Have questions about admissions, programs, or anything else? We're here to help.
              Fill out the form, and our team will get back to you as soon as possible.
            </p>
            <div className="space-y-4 text-sm">
              <p><strong>Address:</strong> Accra, Ghana</p>
              <p><strong>Email:</strong> info@edusync.com</p>
              <p><strong>Phone:</strong> +233 12 345 6789</p>
            </div>
          </div>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className='flex items-center'><Mail className='mr-2 h-5 w-5'/> Send us a Message</CardTitle>
              <CardDescription>We'd love to hear from you.</CardDescription>
            </CardHeader>
            <CardContent>
              <form ref={formRef} action={formAction} className="space-y-4">
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
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}

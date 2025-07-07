
"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { sendContactMessageAction } from "@/lib/actions/contact.actions";
import { AlertCircle, Loader2, Send } from "lucide-react";

type ContactFormState = {
  success: boolean;
  message: string;
  errors?: Array<{ path: (string | number)[]; message: string }>;
};

const initialState: ContactFormState = {
  success: false,
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
      {pending ? "Sending..." : "Send Message"}
    </Button>
  );
}

export function ContactForm() {
  const [state, formAction] = useActionState(sendContactMessageAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast({
          title: "Message Sent!",
          description: state.message,
        });
        formRef.current?.reset();
      } else if (!state.success && !state.errors) {
        // Handle server-side errors that aren't validation-related
        toast({
          title: "Error",
          description: state.message,
          variant: "destructive",
        });
      }
    }
  }, [state, toast]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Send us a Message</CardTitle>
        <CardDescription>
          Fill out the form below and our team will get back to you as soon as possible.
        </CardDescription>
      </CardHeader>
      <form ref={formRef} action={formAction}>
        <CardContent className="space-y-4">
          {state.message && !state.success && state.errors && (
             <Alert variant="destructive">
               <AlertCircle className="h-4 w-4" />
               <AlertTitle>Error</AlertTitle>
               <AlertDescription>
                 Please correct the errors below.
               </AlertDescription>
             </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" placeholder="John Doe" required />
              {state.errors?.find(e => e.path[0] === 'name') && 
                <p className="text-sm font-medium text-destructive">{state.errors.find(e => e.path[0] === 'name')?.message}</p>
              }
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" required />
               {state.errors?.find(e => e.path[0] === 'email') && 
                <p className="text-sm font-medium text-destructive">{state.errors.find(e => e.path[0] === 'email')?.message}</p>
              }
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" placeholder="e.g., Admissions Inquiry" required />
             {state.errors?.find(e => e.path[0] === 'subject') && 
                <p className="text-sm font-medium text-destructive">{state.errors.find(e => e.path[0] === 'subject')?.message}</p>
              }
          </div>
          <div className="space-y-1">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" name="message" placeholder="Your message here..." rows={5} required />
             {state.errors?.find(e => e.path[0] === 'message') && 
                <p className="text-sm font-medium text-destructive">{state.errors.find(e => e.path[0] === 'message')?.message}</p>
              }
          </div>
        </CardContent>
        <CardFooter>
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
}

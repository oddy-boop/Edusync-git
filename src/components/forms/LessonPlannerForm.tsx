
"use client";

import { useActionState } from "react"; // Changed from react-dom
import { useFormStatus } from "react-dom"; // useFormStatus remains in react-dom
import { generateLessonPlanIdeasAction } from "@/lib/actions/teacher.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Loader2 } from "lucide-react";
import { SUBJECTS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useRef, useState } from "react";

const initialState = {
  message: "",
  data: null,
  errors: undefined,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
      {pending ? "Generating Ideas..." : "Generate Lesson Plan Ideas"}
    </Button>
  );
}

export function LessonPlannerForm() {
  const [state, formAction] = useActionState(generateLessonPlanIdeasAction, initialState); // Changed from useFormState
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedSubject, setSelectedSubject] = useState("");

  useEffect(() => {
    if (state.message && state.data === null && !state.errors) { // Error from server, not validation
      // Optionally show a toast for server errors
    }
    if (state.message && state.data !== null) {
      // Optionally show a success toast
      // formRef.current?.reset(); // Uncomment to reset form on success
      // setSelectedSubject("");
    }
  }, [state]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="mr-2 h-6 w-6 text-primary" />
            AI Lesson Planner Assistant
          </CardTitle>
          <CardDescription>
            Enter a subject and topic to get AI-powered lesson plan ideas.
          </CardDescription>
        </CardHeader>
        <form action={formAction} ref={formRef}>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Select name="subject" value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger id="subject">
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.errors?.subject && (
                <p className="text-sm font-medium text-destructive mt-1">{state.errors.subject[0]}</p>
              )}
            </div>
            <div>
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                name="topic"
                placeholder="e.g., Photosynthesis, Fractions, World War II"
              />
              {state.errors?.topic && (
                <p className="text-sm font-medium text-destructive mt-1">{state.errors.topic[0]}</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <SubmitButton />
          </CardFooter>
        </form>
        {state.message && !state.data && !state.errors && (
            <CardFooter>
                <p className="text-sm text-destructive">{state.message}</p>
            </CardFooter>
        )}
      </Card>

      <Card className="shadow-lg min-h-[300px]">
        <CardHeader>
          <CardTitle>Generated Lesson Plan Ideas</CardTitle>
          <CardDescription>Ideas will appear here once generated.</CardDescription>
        </CardHeader>
        <CardContent>
          {state.data?.lessonPlanIdeas ? (
            <div className="min-h-[200px] text-sm bg-muted/50 p-3 rounded-md whitespace-pre-wrap overflow-auto">
              {state.data.lessonPlanIdeas}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[150px] text-muted-foreground">
              <p>No ideas generated yet. Fill the form and click generate.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { generateLessonPlanIdeasAction } from "@/lib/actions/teacher.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Loader2, BookOpen, Clock, Users, Paperclip } from "lucide-react";
import { SUBJECTS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useRef, useState } from "react";
import type { LessonPlanIdeasOutput, LessonPlanIdeaItem } from "@/ai/flows/lesson-plan-ideas"; // Import the structured types

const initialState: {
  message: string;
  data: LessonPlanIdeasOutput | null;
  errors?: { subject?: string[]; topic?: string[] };
} = {
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
  const [state, formAction] = useActionState(generateLessonPlanIdeasAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedSubject, setSelectedSubject] = useState("");

  useEffect(() => {
    if (state.message && state.data === null && !state.errors) {
      // Optionally show a toast for server errors
    }
    if (state.message && state.data !== null) {
      // Optionally show a success toast
      // formRef.current?.reset(); // Uncomment to reset form on success
      // setSelectedSubject("");
    }
  }, [state]);

  return (
    <div className="space-y-6">
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

      {state.data?.lessonPlanIdeas && state.data.lessonPlanIdeas.length > 0 && (
        <div className="space-y-4">
            <h3 className="text-2xl font-headline font-semibold text-primary">Generated Lesson Plan Ideas</h3>
          {state.data.lessonPlanIdeas.map((idea: LessonPlanIdeaItem, index: number) => (
            <Card key={index} className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <BookOpen className="mr-2 h-5 w-5 text-primary" />
                  {idea.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{idea.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" /> 
                    <strong>Grade Level:</strong>&nbsp;{idea.grade_level}
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="mr-2 h-4 w-4" />
                    <strong>Duration:</strong>&nbsp;{idea.duration}
                  </div>
                </div>
                {idea.materials && idea.materials.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm flex items-center text-muted-foreground">
                        <Paperclip className="mr-2 h-4 w-4" />
                        Materials:
                    </h4>
                    <ul className="list-disc list-inside pl-2 text-sm text-foreground/70">
                      {idea.materials.map((material, matIndex) => (
                        <li key={matIndex}>{material}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!state.data?.lessonPlanIdeas || state.data.lessonPlanIdeas.length === 0 && !state.errors && state.message !== "Failed to generate lesson plan ideas." && (
         <Card className="shadow-lg min-h-[200px]">
            <CardHeader>
                <CardTitle>Generated Lesson Plan Ideas</CardTitle>
                <CardDescription>Ideas will appear here once generated.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center h-full min-h-[100px] text-muted-foreground">
                    <p>No ideas generated yet. Fill the form and click generate.</p>
                </div>
            </CardContent>
         </Card>
      )}
    </div>
  );
}

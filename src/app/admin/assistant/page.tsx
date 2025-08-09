
"use client";

import { useState, useRef, useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Sparkles, Send, User, Bot, AlertTriangle, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateAssistantResponseAction } from '@/lib/actions/assistant.actions';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const initialState: {
  message: string | null;
  error?: string | null;
} = {
  message: null,
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="icon" disabled={pending}>
      {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
      <span className="sr-only">Send message</span>
    </Button>
  );
}

export default function AIAssistantPage() {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [state, formAction] = useActionState(generateAssistantResponseAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message) {
      setConversation(prev => [...prev, { role: 'assistant', content: state.message! }]);
    }
  }, [state]);

  const handleFormSubmit = async (formData: FormData) => {
    const userInput = formData.get('userInput') as string;
    if (!userInput.trim()) return;

    setConversation(prev => [...prev, { role: 'user', content: userInput }]);
    formRef.current?.reset();
    formAction(formData);
  };

  return (
    <div className="space-y-6">
      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline">
            <UserCog className="mr-2 h-6 w-6" /> AI Admin Assistant
          </CardTitle>
          <CardDescription>
            Ask questions about your school's data in plain language. Try asking: "What is the grade level for student ID [student_id]?"
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col h-[70vh]">
          <ScrollArea className="flex-grow p-4 border rounded-md bg-muted/20 mb-4">
            <div className="space-y-6">
              {conversation.map((msg, index) => (
                <div key={index} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                   {msg.role === 'assistant' && (
                     <Avatar className="h-8 w-8">
                       <AvatarFallback className="bg-primary text-primary-foreground"><Sparkles className="h-5 w-5"/></AvatarFallback>
                     </Avatar>
                   )}
                  <div className={cn(
                    "p-3 rounded-lg max-w-sm whitespace-pre-wrap", 
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background'
                  )}>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                   {msg.role === 'user' && (
                     <Avatar className="h-8 w-8">
                       <AvatarFallback><User className="h-5 w-5"/></AvatarFallback>
                     </Avatar>
                   )}
                </div>
              ))}
              {state.error && (
                <div className="flex items-start gap-3 justify-start">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-destructive text-destructive-foreground"><AlertTriangle className="h-5 w-5"/></AvatarFallback>
                    </Avatar>
                    <div className="p-3 rounded-lg max-w-sm bg-destructive/10 text-destructive">
                        <p className="text-sm font-semibold">Error</p>
                        <p className="text-sm">{state.error}</p>
                    </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <form ref={formRef} action={handleFormSubmit} className="flex items-center gap-2">
            <Input name="userInput" placeholder="Ask about a student, teacher, or fees..." className="flex-grow" />
            <SubmitButton />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

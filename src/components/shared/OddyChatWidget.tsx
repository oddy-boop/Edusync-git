
'use client';

import { useState, useRef, useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Sparkles, Send, User, AlertTriangle, UserCog, MessageSquare } from 'lucide-react';
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

const welcomeMessage: Message = {
    role: 'assistant',
    content: "Hello! I'm ODDY, your admin assistant. How can I help you today? \n\nYou can ask me things like:\n- \"What are the total fees collected this year?\"\n- \"How many students are in Basic 1?\"\n- \"What subjects does teacher@example.com teach?\""
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

export function OddyChatWidget() {
  const [conversation, setConversation] = useState<Message[]>([welcomeMessage]);
  const [state, formAction] = useActionState(generateAssistantResponseAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.message) {
      setConversation((prev) => [...prev, { role: 'assistant', content: state.message! }]);
    }
  }, [state]);

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({
            top: scrollAreaRef.current.scrollHeight,
            behavior: 'smooth',
        });
    }
  }, [conversation]);

  const handleFormSubmit = async (formData: FormData) => {
    const userInput = formData.get('userInput') as string;
    if (!userInput.trim()) return;

    setConversation((prev) => [...prev, { role: 'user', content: userInput }]);
    formRef.current?.reset();
    formAction(formData);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg" size="icon">
          <Sparkles className="h-8 w-8" />
          <span className="sr-only">Open ODDY AI Assistant</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center text-xl font-headline">
            <UserCog className="mr-2 h-6 w-6" /> ODDY - Admin Assistant
          </DialogTitle>
          <DialogDescription>
            Ask questions about your school's data in plain language.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-hidden">
          <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
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
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background border'
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
        </div>
        <div className="p-4 border-t">
          <form ref={formRef} action={handleFormSubmit} className="flex items-center gap-2">
            <Input name="userInput" placeholder="Ask ODDY..." className="flex-grow" autoComplete="off" />
            <SubmitButton />
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

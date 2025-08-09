
'use client';

import { useState, useRef, useEffect, useActionState, useTransition } from 'react';
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
  suggestions?: string[];
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
    content: "Hello! I'm ODDY, your admin assistant. I can help you with tasks like checking data or performing actions. What would you like to do?",
    suggestions: [
        "What are the total fees collected this year?",
        "How many teachers have I registered?",
        "How many students are in Basic 1?",
    ]
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
  const [isPending, startTransition] = useTransition();
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
  
  const handleSuggestionClick = (suggestion: string) => {
    const formData = new FormData();
    formData.append('userInput', suggestion);
    setConversation((prev) => [...prev, { role: 'user', content: suggestion }]);
    startTransition(() => {
      formAction(formData);
    });
  };

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
                    {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="mt-3 flex flex-col gap-2">
                            {msg.suggestions.map((suggestion, i) => (
                                <Button
                                    key={i}
                                    variant="outline"
                                    size="sm"
                                    className="justify-start text-left h-auto"
                                    onClick={() => handleSuggestionClick(suggestion)}
                                >
                                    {suggestion}
                                </Button>
                            ))}
                        </div>
                    )}
                  </div>
                   {msg.role === 'user' && (
                     <Avatar className="h-8 w-8">
                       <AvatarFallback><User className="h-5 w-5"/></AvatarFallback>
                     </Avatar>
                   )}
                </div>
              ))}
              {(state.error || isPending) && (
                <div className="flex items-start gap-3 justify-start">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className={cn(
                            state.error ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'
                        )}>
                           {state.error ? <AlertTriangle className="h-5 w-5"/> : <Loader2 className="h-5 w-5 animate-spin"/>}
                        </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                        "p-3 rounded-lg max-w-sm",
                        state.error ? 'bg-destructive/10 text-destructive' : 'bg-muted'
                    )}>
                        {state.error ? (
                            <>
                                <p className="text-sm font-semibold">Error</p>
                                <p className="text-sm">{state.error}</p>
                            </>
                        ) : (
                           <p className="text-sm text-muted-foreground">ODDY is thinking...</p>
                        )}
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


'use server';

import { generateAssistantResponse } from '@/ai/flows/assistant-flow';
import { z } from 'zod';

const formSchema = z.object({
  userInput: z.string().min(1, 'Message cannot be empty.'),
});

type ActionState = {
  message: string | null;
  error?: string | null;
};

export async function generateAssistantResponseAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const validatedFields = formSchema.safeParse({
    userInput: formData.get('userInput'),
  });

  if (!validatedFields.success) {
    return {
      message: null,
      error: 'Invalid input.',
    };
  }

  try {
    const response = await generateAssistantResponse(validatedFields.data.userInput);
    return { message: response };
  } catch (error: any) {
    console.error('AI Assistant Action Error:', error);
    return { message: null, error: error.message || 'An unexpected error occurred.' };
  }
}

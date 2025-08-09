
'use server';
/**
 * @fileOverview An AI assistant that can use tools to answer questions about school data.
 */

import { ai } from '@/ai/genkit';
import {
  getStudentInfoById,
  getFinancialSummary,
  getStudentCountByClass,
  getTeacherInfoByEmail,
  getTeacherCount,
  deleteUser,
  getStudentReport,
  getTeacherReport,
} from '@/ai/tools/database-tools';
import { z } from 'zod';

const AssistantInputSchema = z.string();
export type AssistantInput = z.infer<typeof AssistantInputSchema>;

const AssistantOutputSchema = z.string();
export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;

// This is the main exported function that the Server Action will call.
export async function generateAssistantResponse(input: AssistantInput): Promise<AssistantOutput> {
  return assistantFlow(input);
}

// Define the prompt for the AI assistant.
// It's instructed on its personality and what tools it has available.
const assistantPrompt = ai.definePrompt({
  name: 'assistantPrompt',
  // The model needs to be smart enough for tool use.
  model: 'googleai/gemini-1.5-flash-latest',
  // Provide the tools that the AI can decide to use.
  tools: [
    getStudentInfoById,
    getFinancialSummary,
    getStudentCountByClass,
    getTeacherInfoByEmail,
    getTeacherCount,
    deleteUser,
    getStudentReport,
    getTeacherReport,
  ],
  // System instructions are now part of the main prompt string.
  prompt: `You are an expert school administration assistant named ODDY.
Your role is to answer questions and perform actions based on the tools you have available.
If you don't have a tool to answer a question or perform an action, you must state that you cannot fulfill the request.
Do not ask for more information, just state what you can and cannot do.
Be concise and clear in your answers.
When performing a destructive action like deleting a user, you must confirm what you have done and the result.

User's request: {{{prompt}}}
`,
  config: {
    temperature: 0.1,
  },
});


// Define the main flow for the assistant.
const assistantFlow = ai.defineFlow(
  {
    name: 'assistantFlow',
    inputSchema: AssistantInputSchema,
    outputSchema: AssistantOutputSchema,
  },
  async (prompt) => {
    // Generate a response using the prompt and the user's input.
    const llmResponse = await assistantPrompt({prompt});
    
    // Return the generated text content.
    return llmResponse.text;
  }
);

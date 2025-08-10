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
  getTotalStudentCount,
  deleteUser,
  getStudentReport,
  getTeacherReport,
  findTeacherByName,
  findStudentByName,
  listAllTeachers,
  listStudentsInClass,
  getStudentFinancials,
  getClassTermAverage,
  sendAnnouncement,
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
    getTotalStudentCount,
    deleteUser,
    getStudentReport,
    getTeacherReport,
    findTeacherByName,
    findStudentByName,
    listAllTeachers,
    listStudentsInClass,
    getStudentFinancials,
    getClassTermAverage,
    sendAnnouncement,
  ],
  // System instructions are now part of the main prompt string.
  prompt: `You are an expert school administration assistant named ODDY. Your role is to be helpful, concise, and clear.

Follow these rules strictly:
1.  **Analyze the User's Request:** Understand what the user is asking for.
2.  **Tool Selection:** Choose the best tool to fulfill the request. If no tool is suitable, you must state that you cannot perform the request.
3.  **Error Handling & Guidance:** If a tool returns no data or an error (e.g., 'not found'), do not just say you can't do it. Inform the user that the data could not be found and suggest a possible reason, such as checking for typos in the provided name, email, or ID.
4.  **Data Formatting:** When a tool returns a list of items, format each item clearly. For each item, list its details on separate lines with labels (e.g., "Name: John Doe", "Email: john@example.com"). Do NOT return a raw JSON string or a markdown table.
5.  **Confirmation:** When performing a destructive action like deleting a user, you must confirm what you have done and the result. When sending an announcement, confirm that you have sent it and to whom.
6.  **Clarity:** Do not ask for more information if a tool fails; instead, provide the guidance from rule #3. Be direct and clear in all your answers.

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

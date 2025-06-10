
'use server';

/**
 * @fileOverview Provides lesson plan ideas based on the subject and topic provided.
 *
 * - getLessonPlanIdeas - A function that generates lesson plan ideas.
 * - LessonPlanIdeasInput - The input type for the getLessonPlanIdeas function.
 * - LessonPlanIdeasOutput - The return type for the getLessonPlanIdeas function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LessonPlanIdeasInputSchema = z.object({
  subject: z.string().describe('The subject for which the lesson plan is needed.'),
  topic: z.string().describe('The specific topic within the subject for the lesson plan.'),
});
export type LessonPlanIdeasInput = z.infer<typeof LessonPlanIdeasInputSchema>;

const LessonPlanIdeaItemSchema = z.object({
  title: z.string().describe('The catchy and descriptive title for the lesson plan idea.'),
  description: z.string().describe('A detailed explanation of the lesson plan, including activities, learning objectives, and reasoning for its effectiveness and engagement.'),
  grade_level: z.string().describe('The suggested grade level(s) for this idea (e.g., "KG 1 - KG 2", "Basic 1-3", "JHS 1-3").'),
  materials: z.array(z.string()).describe('A list of materials required for the lesson (e.g., ["Pen", "Paper", "Computer"]). Provide an empty array if no specific materials are needed.'),
  duration: z.string().describe('The estimated time commitment for the lesson (e.g., "45 minutes", "1 class period").'),
});
export type LessonPlanIdeaItem = z.infer<typeof LessonPlanIdeaItemSchema>;

const LessonPlanIdeasOutputSchema = z.object({
  lessonPlanIdeas: z.array(LessonPlanIdeaItemSchema).describe('A list of creative and effective lesson plan ideas, each as a structured object.'),
});
export type LessonPlanIdeasOutput = z.infer<typeof LessonPlanIdeasOutputSchema>;

export async function getLessonPlanIdeas(input: LessonPlanIdeasInput): Promise<LessonPlanIdeasOutput> {
  return lessonPlanIdeasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'lessonPlanIdeasPrompt',
  input: {schema: LessonPlanIdeasInputSchema},
  output: {schema: LessonPlanIdeasOutputSchema},
  prompt: `You are an AI-powered lesson plan assistant for teachers. Your task is to generate a list of creative and effective lesson plan ideas based on the subject and topic provided.

Subject: {{{subject}}}
Topic: {{{topic}}}

Please provide your output as a JSON array of objects. Each object in the array should represent a single lesson plan idea and must have the following fields:
- "title": A catchy and descriptive title for the lesson plan idea (string).
- "description": A detailed explanation of the lesson plan. Include activities, learning objectives, and explicitly state your reasoning for why this particular idea is effective and engaging for the specified topic and subject (string).
- "grade_level": The suggested grade level(s) for this idea (e.g., "KG 1 - KG 2", "Basic 1-3", "JHS 1-3") (string).
- "materials": A list of materials required for the lesson (array of strings, e.g., ["Pen", "Paper", "Computer"]). If no specific materials are needed, provide an empty array.
- "duration": The estimated time commitment for the lesson (e.g., "45 minutes", "1 class period", "2 hours") (string).

Ensure your entire response is a valid JSON array.`,
});

const lessonPlanIdeasFlow = ai.defineFlow(
  {
    name: 'lessonPlanIdeasFlow',
    inputSchema: LessonPlanIdeasInputSchema,
    outputSchema: LessonPlanIdeasOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // The output should already be in the correct JSON object format due to the schema.
    // If the AI returns a string that needs parsing, you might do:
    // const parsedOutput = JSON.parse(output as unknown as string); // Be careful with type assertions
    // return parsedOutput; 
    // However, with Zod schema in output, Genkit/Gemini should handle parsing.
    return output!;
  }
);


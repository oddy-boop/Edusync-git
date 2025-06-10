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

const LessonPlanIdeasOutputSchema = z.object({
  lessonPlanIdeas: z.string().describe('Creative and effective lesson plan ideas for the specified subject and topic, with reasoning.'),
});
export type LessonPlanIdeasOutput = z.infer<typeof LessonPlanIdeasOutputSchema>;

export async function getLessonPlanIdeas(input: LessonPlanIdeasInput): Promise<LessonPlanIdeasOutput> {
  return lessonPlanIdeasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'lessonPlanIdeasPrompt',
  input: {schema: LessonPlanIdeasInputSchema},
  output: {schema: LessonPlanIdeasOutputSchema},
  prompt: `You are an AI-powered lesson plan assistant for teachers. Your task is to generate creative and effective lesson plan ideas based on the subject and topic provided.  Include reasoning to justify specific information. Ensure that the lesson plan ideas are engaging and suitable for the given educational level.

Subject: {{{subject}}}
Topic: {{{topic}}}

Lesson Plan Ideas:`,
});

const lessonPlanIdeasFlow = ai.defineFlow(
  {
    name: 'lessonPlanIdeasFlow',
    inputSchema: LessonPlanIdeasInputSchema,
    outputSchema: LessonPlanIdeasOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);


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

// Check if Deepseek/OpenAI model is configured
const isOpenAIConfigured = process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_BASE_URL;

export async function getLessonPlanIdeas(input: LessonPlanIdeasInput): Promise<LessonPlanIdeasOutput> {
  if (!isOpenAIConfigured) {
    console.warn('[getLessonPlanIdeas] Deepseek/OpenAI integration is not configured or @genkit-ai/openai package is missing. AI Lesson Planner is disabled.');
    throw new Error('AI Lesson Planner (Deepseek) is currently unavailable due to configuration issues. The @genkit-ai/openai package might be missing.');
  }
  return lessonPlanIdeasFlow(input);
}

// Define prompt and flow only if configured, to avoid runtime errors if plugin isn't loaded
let prompt: any; // Define with 'any' to handle conditional initialization
let lessonPlanIdeasFlow: (input: LessonPlanIdeasInput) => Promise<LessonPlanIdeasOutput>;

if (isOpenAIConfigured) {
  prompt = ai.definePrompt({
    name: 'lessonPlanIdeasPrompt',
    model: 'openai/deepseek-chat', // This relies on the openAI plugin being configured for Deepseek
    input: {schema: LessonPlanIdeasInputSchema},
    output: {schema: LessonPlanIdeasOutputSchema},
    prompt: `You are an AI-powered lesson plan assistant for teachers. Your task is to generate a list of creative and effective lesson plan ideas based on the subject and topic provided.

Subject: {{{subject}}}
Topic: {{{topic}}}

Please provide your output as a JSON object with a single key "lessonPlanIdeas". The value of "lessonPlanIdeas" should be an array of objects. Each object in this array should represent a single lesson plan idea and must have the following fields:
- "title": A catchy and descriptive title for the lesson plan idea (string).
- "description": A detailed explanation of the lesson plan. Include activities, learning objectives, and explicitly state your reasoning for why this particular idea is effective and engaging for the specified topic and subject (string).
- "grade_level": The suggested grade level(s) for this idea (e.g., "KG 1 - KG 2", "Basic 1-3", "JHS 1-3") (string).
- "materials": A list of materials required for the lesson (array of strings, e.g., ["Pen", "Paper", "Computer"]). If no specific materials are needed, provide an empty array.
- "duration": The estimated time commitment for the lesson (e.g., "45 minutes", "1 class period", "2 hours") (string).

Ensure your entire response is a valid JSON object adhering to this structure.`,
  });

  lessonPlanIdeasFlow = ai.defineFlow(
    {
      name: 'lessonPlanIdeasFlow',
      inputSchema: LessonPlanIdeasInputSchema,
      outputSchema: LessonPlanIdeasOutputSchema,
    },
    async (input: LessonPlanIdeasInput): Promise<LessonPlanIdeasOutput> => {
      console.log('[lessonPlanIdeasFlow] Input received:', JSON.stringify(input));
      try {
        const result = await prompt(input);
        
        console.log('[lessonPlanIdeasFlow] Raw result from prompt:', JSON.stringify(result, null, 2));

        const structuredOutput = result.output;

        if (!structuredOutput) {
          console.error('[lessonPlanIdeasFlow] Failed to get structured output from the prompt. Result was:', JSON.stringify(result, null, 2));
          const errorDetails = (result as any).error || (result as any).errors || 'No specific error details in result object.';
          throw new Error(`AI model failed to produce valid lesson plan ideas. Details: ${JSON.stringify(errorDetails)}`);
        }
        
        if (!structuredOutput.lessonPlanIdeas) {
          console.warn('[lessonPlanIdeasFlow] Output received, but lessonPlanIdeas array is missing. Returning empty array.');
          return { lessonPlanIdeas: [] };
        }

        console.log('[lessonPlanIdeasFlow] Successfully generated and parsed output.');
        return structuredOutput;

      } catch (error: any) {
        console.error('[lessonPlanIdeasFlow] Error during prompt execution or processing:', error.message, error.stack);
        // Propagate the error message more directly
        let errorMessage = "An unexpected error occurred in the lesson planning flow.";
        if (error instanceof Error && error.message) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        throw new Error(errorMessage);
      }
    }
  );
} else {
  // Provide a dummy implementation if not configured
  lessonPlanIdeasFlow = async (input: LessonPlanIdeasInput): Promise<LessonPlanIdeasOutput> => {
    console.warn('[lessonPlanIdeasFlow] Attempted to call flow, but Deepseek/OpenAI is not configured or @genkit-ai/openai package is missing.');
    throw new Error('AI Lesson Planner (Deepseek) is currently unavailable due to configuration issues. The @genkit-ai/openai package might be missing.');
  };
}

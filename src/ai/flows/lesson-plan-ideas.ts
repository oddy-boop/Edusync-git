
'use server';

/**
 * @fileOverview Generates a comprehensive, structured lesson plan using Google Gemini.
 *
 * - getLessonPlanIdeas - A function that generates a detailed lesson plan.
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
  title: z.string().describe("A catchy and descriptive title for the generated lesson plan."),
  grade_level: z.string().describe('The suggested grade level(s) for this lesson (e.g., "KG 1 - KG 2", "Basic 1-3", "JHS 1-3").'),
  duration: z.string().describe('The estimated time commitment for the entire lesson (e.g., "45 minutes", "2 class periods").'),
  learning_objectives: z.array(z.string()).describe("A list of clear, measurable learning objectives for the lesson. What students should be able to do by the end."),
  materials: z.array(z.string()).describe('A list of required materials (e.g., ["Whiteboard", "Markers", "Textbook"]). Provide an empty array if none are needed.'),
  activities: z.array(z.object({
    step: z.number().describe("The step number in the lesson sequence (e.g., 1, 2, 3)."),
    title: z.string().describe("A short title for this activity (e.g., 'Introduction & Hook', 'Group Activity', 'Conclusion')."),
    description: z.string().describe("A detailed explanation of the activity, including teacher and student actions."),
    duration: z.string().describe("Estimated time for this specific activity (e.g., '5 minutes', '20 minutes')."),
  })).describe("A step-by-step breakdown of the lesson activities from start to finish."),
  assessment: z.object({
    title: z.string().describe("Title for the assessment section, e.g., 'Assessment of Understanding'."),
    methods: z.array(z.string()).describe("A list of methods to assess student learning (e.g., 'Class participation', 'Worksheet completion', 'Exit ticket questions')."),
  }).describe("How student understanding of the objectives will be evaluated."),
  differentiation: z.object({
      title: z.string().describe("Title for the differentiation section, e.g., 'Differentiation & Support'."),
      support_for_struggling_learners: z.string().describe("Strategies to support students who may find the topic challenging."),
      challenge_for_advanced_learners: z.string().describe("Extension activities or challenges for students who grasp the concept quickly."),
  }).describe("Strategies to support diverse learning needs."),
});
export type LessonPlanIdeasOutput = z.infer<typeof LessonPlanIdeasOutputSchema>;


export async function getLessonPlanIdeas(input: LessonPlanIdeasInput): Promise<LessonPlanIdeasOutput> {
  // With the new genkit.ts setup, Genkit is initialized on-demand.
  // We no longer need to call ensureGenkitInitialized() here.
  return lessonPlanIdeasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'lessonPlanIdeasPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: {schema: LessonPlanIdeasInputSchema},
  output: {schema: LessonPlanIdeasOutputSchema},
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  },
  prompt: `You are an AI-powered lesson plan assistant for teachers. Your task is to generate a single, comprehensive, and well-structured lesson plan based on the provided subject and topic.

Subject: {{{subject}}}
Topic: {{{topic}}}

Please provide your output as a single, complete JSON object adhering strictly to the provided output schema.`,
});

const lessonPlanIdeasFlow = ai.defineFlow(
  {
    name: 'lessonPlanIdeasFlow',
    inputSchema: LessonPlanIdeasInputSchema,
    outputSchema: LessonPlanIdeasOutputSchema,
  },
  async (input: LessonPlanIdeasInput): Promise<LessonPlanIdeasOutput> => {
    console.log('[lessonPlanIdeasFlow] Input received:', JSON.stringify(input));
    try {
      const result = await prompt(input);
      
      const structuredOutput = result.output;

      if (!structuredOutput) {
        console.error('[lessonPlanIdeasFlow] Failed to get structured output from the prompt. Result was:', JSON.stringify(result, null, 2));
        
        // Extract a more specific error message if available from the Genkit result object.
        const resultError = (result as any).error || (result as any).errors || (result as any).candidates?.[0]?.finishReasonMessage;
        const errorDetails = resultError ? `Details: ${resultError}` : 'No specific error details provided by the model.';

        throw new Error(`AI model failed to produce a valid lesson plan. ${errorDetails}`);
      }
      
      console.log('[lessonPlanIdeasFlow] Successfully generated and parsed output.');
      return structuredOutput;

    } catch (error: any) {
      console.error('[lessonPlanIdeasFlow] Error during prompt execution or processing:', error.message, error.stack);
      let errorMessage = "An unexpected error occurred in the lesson planning flow.";
      if (error instanceof Error && error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      // Check for common API key related errors from Google AI
      if (errorMessage.toLowerCase().includes("api key not valid") || errorMessage.toLowerCase().includes("permission denied")) {
          errorMessage = "AI Lesson Planner: Google API Key is invalid or has insufficient permissions. Please check your school's API settings.";
      }
      // Re-throw the error with a user-friendly message so the action can catch it.
      throw new Error(errorMessage);
    }
  }
);

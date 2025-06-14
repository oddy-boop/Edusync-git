
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
// import {openAI} from '@genkit-ai/openai';

const plugins: any[] = [googleAI()];

// Conditionally add OpenAI plugin if API key and Base URL are set
// This check is more for runtime, but the import itself is the issue for npm install
// if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_BASE_URL) {
//   plugins.push(openAI({
//     apiKey: process.env.DEEPSEEK_API_KEY,
//     baseURL: process.env.DEEPSEEK_BASE_URL,
//   }));
// } else {
//   console.warn("Deepseek API Key or Base URL not found in .env. OpenAI plugin for Deepseek not configured.");
// }

export const ai = genkit({
  plugins: plugins,
  // Default model for the `ai` object can remain Google AI,
  // the lesson planner will explicitly request the Deepseek model if configured.
  model: 'googleai/gemini-2.0-flash',
});

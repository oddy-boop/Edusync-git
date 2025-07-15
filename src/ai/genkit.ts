import { genkit, configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// This function dynamically configures Genkit with the global API key.
// In a single-tenant app, we don't need school-specific keys.
export async function ensureGenkitInitialized() {
  configureGenkit({
    plugins: [googleAI()], // Uses GOOGLE_API_KEY from process.env
  });
}

// The 'ai' object can now be configured statically.
export const ai = genkit({
  plugins: [googleAI()], // Use global config
  model: 'googleai/gemini-1.5-flash-latest', 
});

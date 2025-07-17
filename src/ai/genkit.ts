import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// In a single-tenant app, we don't need to re-configure Genkit on each call.
// Genkit is initialized once here and will use the GOOGLE_API_KEY from the .env file.
// The `configureGenkit` function is deprecated in Genkit v1.x.

export async function ensureGenkitInitialized() {
  // This function is now a no-op but is kept for compatibility
  // with existing calls. It can be removed later if desired.
  return;
}

// The 'ai' object is configured once and exported for use in all flows.
export const ai = genkit({
  plugins: [googleAI()],
});

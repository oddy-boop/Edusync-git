
import {genkit, type GenkitOptions} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {createClient} from '@supabase/supabase-js';

// This is a server-side-only file.

// Genkit will now exclusively use the environment variable for the Google API Key.
// This simplifies configuration and aligns with standard practices for managing secret keys.
// The database query for the key has been removed.
const googleApiKeyFromEnv = process.env.GOOGLE_API_KEY;

if (!googleApiKeyFromEnv) {
  throw new Error(
    'AI features are not configured. The GOOGLE_API_KEY was not found in your environment variables. Please add it to your .env file.'
  );
}

// Initialize Genkit with the API key from the environment.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: googleApiKeyFromEnv,
    }),
  ],
  // The `logLevel` option is deprecated in Genkit 1.x and should not be used.
});

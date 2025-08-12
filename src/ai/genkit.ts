
import {genkit, type GenkitOptions} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {createClient} from '@supabase/supabase-js';

// This is a server-side-only file.

async function getGoogleApiKey(): Promise<string | null> {
  // 1. Prioritize environment variable
  const keyFromEnv = process.env.GOOGLE_API_KEY;
  if (keyFromEnv) {
    return keyFromEnv;
  }

  // 2. Fallback to database
  console.log("GOOGLE_API_KEY not found in environment, falling back to database setting...");
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Supabase credentials not found in environment. Cannot fetch API key from database.");
      return null;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    // In a multi-tenant setup, we might need to know which school's key to get.
    // For a single-instance fallback, we just get the first one.
    const { data, error } = await supabase
      .from('schools')
      .select('google_api_key')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    if (data?.google_api_key) {
        console.log("Found Google API Key in database.");
        return data.google_api_key;
    }

  } catch (error) {
    console.error("Error fetching Google API key from database:", error);
  }

  return null;
}

const googleApiKey = await getGoogleApiKey();

if (!googleApiKey) {
  throw new Error(
    'AI features are not configured. The GOOGLE_API_KEY was not found in your environment variables or database settings. Please add it to your .env file or the Admin Settings page.'
  );
}

// Initialize Genkit with the resolved API key.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: googleApiKey,
    }),
  ],
  // The `logLevel` option is deprecated in Genkit 1.x and should not be used.
});

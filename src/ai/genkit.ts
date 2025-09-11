
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
    const { data, error } = await supabase
      .from('app_settings')
      .select('google_api_key')
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

// Initialize Genkit with a placeholder - actual configuration happens at runtime
const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY || 'placeholder', // Use env var if available, placeholder otherwise
    }),
  ],
});

// Function to get properly configured AI instance
export async function getAI() {
  const googleApiKey = await getGoogleApiKey();
  
  if (!googleApiKey) {
    throw new Error(
      'AI features are not configured. The GOOGLE_API_KEY was not found in your environment variables or database settings. Please add it to your .env file or the Admin Settings page.'
    );
  }

  // Return a properly configured instance
  return genkit({
    plugins: [
      googleAI({
        apiKey: googleApiKey,
      }),
    ],
  });
}

// Export the AI instance for tool definitions (tools will work if GOOGLE_API_KEY is in env)
export default ai;

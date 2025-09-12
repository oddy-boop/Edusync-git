
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// This is a server-side-only file.

async function getGoogleApiKeyFromDatabase(): Promise<string | null> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return null;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data, error } = await supabase
      .from('app_settings')
      .select('google_api_key')
      .single();

    if (error || !data?.google_api_key) {
      return null;
    }

    return data.google_api_key;
  } catch (error) {
    // Silently fail during build time
    return null;
  }
}

// Initialize Genkit with a safe default that works during build
const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY || 'dummy-key-for-build',
    }),
  ],
});

// Function to get properly configured AI instance at runtime
export async function getAI() {
  let googleApiKey = process.env.GOOGLE_API_KEY;
  
  // If no env var, try database
  if (!googleApiKey) {
    const dbKey = await getGoogleApiKeyFromDatabase();
    googleApiKey = dbKey === null ? undefined : dbKey;
  }
  
  if (!googleApiKey) {
    throw new Error(
      'AI features are not configured. The GOOGLE_API_KEY was not found in your environment variables or database settings. Please add it to your .env file or configure it in the Admin Settings.'
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

// Export the AI instance for tool definitions
export default ai;

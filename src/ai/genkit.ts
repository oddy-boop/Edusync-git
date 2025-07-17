
import {genkit, type GenkitOptions} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {createClient} from '@supabase/supabase-js';

// This is a server-side-only file.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Supabase URL or Service Role Key is not defined in environment variables.'
  );
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function getGoogleApiKey(): Promise<string> {
  // 1. Try to get from the database first
  try {
    const {data, error} = await supabaseAdmin
      .from('app_settings')
      .select('google_api_key')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is not an error here.
      console.warn(
        'Could not fetch google_api_key from database settings:',
        error
      );
    }
    if (data?.google_api_key) {
      return data.google_api_key;
    }
  } catch(dbError) {
    console.warn("Database error while fetching Google API key. Will check environment variables.", dbError);
  }


  // 2. Fallback to environment variable
  const apiKeyFromEnv = process.env.GOOGLE_API_KEY;
  if (apiKeyFromEnv) {
    return apiKeyFromEnv;
  }

  // 3. If no key is found, throw an error.
  throw new Error(
    'AI features are not configured. A Google API key was not found in the database settings or in the GOOGLE_API_KEY environment variable. Please add it in the Admin Settings page.'
  );
}

// Initialize Genkit with a dynamic API key provider.
// We invoke the function here so the promise is passed to the plugin.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: getGoogleApiKey(),
    }),
  ],
  // The `logLevel` option is deprecated in Genkit 1.x and should not be used.
});

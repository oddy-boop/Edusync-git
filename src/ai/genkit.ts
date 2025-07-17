
import {genkit, type GenkitOptions, type Plugin} from 'genkit';
import {googleAI, type GoogleAIOptions} from '@genkit-ai/googleai';
import {createClient} from '@supabase/supabase-js';

let isInitialized = false;
let aiInstance: any;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize a singleton Supabase client for server-side use
const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;

async function getGoogleApiKey(): Promise<string | undefined> {
  // 1. Try to get from the database first
  if (supabaseAdmin) {
    try {
      const {data, error} = await supabaseAdmin
        .from('app_settings')
        .select('google_api_key')
        .single();
      if (error && error.code !== 'PGRST116') {
        console.warn('Could not fetch google_api_key from database:', error);
      }
      if (data?.google_api_key) {
        return data.google_api_key;
      }
    } catch (dbError) {
      console.warn('Database error fetching google_api_key:', dbError);
    }
  }

  // 2. Fallback to environment variable
  return process.env.GOOGLE_API_KEY;
}

export async function ensureGenkitInitialized(): Promise<void> {
  const apiKey = await getGoogleApiKey();

  if (!apiKey) {
    // If no key is found anywhere, throw an error to prevent the app from proceeding.
    throw new Error(
      'AI features are not configured. A Google API key was not found in the database settings or in the GOOGLE_API_KEY environment variable. Please add it in the Admin Settings page.'
    );
  }

  // Define Genkit options with the fetched API key
  const genkitOptions: GenkitOptions = {
    plugins: [googleAI({apiKey})],
    // The `logLevel` option is deprecated in Genkit 1.x and should not be used.
  };

  // Re-initialize Genkit with the new options
  aiInstance = genkit(genkitOptions);
  isInitialized = true;
  console.log('Genkit has been initialized with the correct API key.');
}

// Export a proxy 'ai' object that ensures initialization before use.
// This is a robust pattern for dynamic configuration.
export const ai = new Proxy(
  {},
  {
    get(target, prop) {
      if (!isInitialized) {
        // This is a fallback and should ideally not be hit if ensureGenkitInitialized is called correctly.
        console.warn(
          'Genkit was accessed before being explicitly initialized. Attempting lazy initialization.'
        );
        // Attempt a lazy, non-awaited initialization. This is not ideal.
        ensureGenkitInitialized().catch(err => {
          console.error('Lazy Genkit initialization failed:', err);
        });
        // A better approach might be to throw here, but for now, we'll let it proceed.
      }
      if (aiInstance) {
        return Reflect.get(aiInstance, prop);
      }
      // If aiInstance is still not available, throw an error.
      throw new Error(
        'Genkit is not initialized. Please call ensureGenkitInitialized() before using AI features.'
      );
    },
  }
) as any;

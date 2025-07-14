
import { genkit, configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

let isConfigured = false;

// This function dynamically configures Genkit with the school-specific API key.
// It uses a simple flag to ensure it only runs once per server request.
export async function ensureGenkitInitialized() {
  if (isConfigured) {
    return;
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  let apiKey: string | undefined = process.env.GOOGLE_API_KEY; // Fallback to global key

  if (user) {
    // Determine the user's school
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('school_id')
      .eq('user_id', user.id)
      .single();

    if (roleData?.school_id) {
      // Fetch the school-specific key from app_settings
      const { data: settings } = await supabase
        .from('app_settings')
        .select('google_api_key')
        .eq('school_id', roleData.school_id)
        .single();
        
      if (settings?.google_api_key) {
        apiKey = settings.google_api_key;
      }
    }
  }

  // The googleAI() plugin will use GOOGLE_API_KEY from process.env by default.
  // If we have a school-specific key, we pass it directly to override the environment variable.
  const plugins = [googleAI(apiKey ? { apiKey } : undefined)];
  
  configureGenkit({
    plugins: plugins,
    // Default model for the `ai` object. Specific flows can override this.
  });

  isConfigured = true;
}

export const ai = genkit({
  // This initial configuration is minimal. The actual plugins are loaded
  // dynamically by ensureGenkitInitialized() before any flow is run.
  plugins: [],
  model: 'googleai/gemini-1.5-flash-latest', 
});

    
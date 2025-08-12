
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import pool from '@/lib/db';


async function getGoogleApiKey(): Promise<string | null> {
  const keyFromEnv = process.env.GOOGLE_API_KEY;
  if (keyFromEnv) {
    return keyFromEnv;
  }

  console.log("GOOGLE_API_KEY not found in environment, falling back to database setting...");
  const client = await pool.connect();
  try {
    // In a multi-tenant setup, we might need to know which school's key to get.
    // For a single-instance fallback, we just get the first one.
    const { rows } = await client.query('SELECT google_api_key FROM schools ORDER BY created_at ASC LIMIT 1');
    const apiKey = rows[0]?.google_api_key;
    
    if (apiKey) {
        console.log("Found Google API Key in database.");
        return apiKey;
    }

  } catch (error) {
    console.error("Error fetching Google API key from database:", error);
  } finally {
      client.release();
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
});

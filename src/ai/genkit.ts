
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// The googleAI plugin will automatically look for GOOGLE_API_KEY in the environment.
const plugins: any[] = [googleAI()];

export const ai = genkit({
  plugins: plugins,
  // Default model for the `ai` object. Specific flows can override this.
  model: 'googleai/gemini-1.5-flash-latest', 
});

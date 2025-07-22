import OpenAI from 'openai';

// Lazy initialization to prevent client-side instantiation
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (typeof window !== 'undefined') {
      throw new Error('OpenAI client cannot be initialized on the client side');
    }
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

export const MODELS = {
  fast: 'gpt-4.1-nano',
  smart: 'o4-mini',
} as const;

export async function generateText(prompt: string, model: string = MODELS.fast): Promise<string> {
  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1, // Low temperature for consistent text cleanup
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error(`Failed to generate text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 
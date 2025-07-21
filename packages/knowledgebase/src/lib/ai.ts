import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const MODELS = {
  fast: 'gpt-4.1-nano',
  smart: 'o4-mini',
} as const;

export async function generateText(prompt: string, model: string = MODELS.fast): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
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
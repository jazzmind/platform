
// Add OpenAI import
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
// Initialize OpenAI client if API key is available
let openai: OpenAI | null = null;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error);
}

/**
 * Execute a chat completion with OpenAI
 * @param {string} model - The OpenAI model to use
 * @param {string} messages - The messages to send to the model
 * @returns {Promise<Object>} - The response from the model
 */
export async function openAIChatCompletion(model: string, messages: string[]) {
    const response = await openai?.chat.completions.create({
        model,
        messages: messages as unknown as ChatCompletionMessageParam[]
    });
    return response?.choices[0].message.content;
}

/**
 * Use OpenAI to repair malformed JSON
 * @param {string} jsonString - The problematic JSON string
 * @returns {Promise<Object>} - Parsed JSON object
 */
export async function openAIJsonRepair(jsonString: string) {
    if (!openai || !process.env.OPENAI_API_KEY) {
      console.log('OpenAI API key not configured, skipping JSON repair');
      return {};
    }
  
    console.log('Sending to OpenAI for JSON repair');
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a JSON repair assistant. You will be given malformed or invalid JSON that needs to be fixed. Extract the key information and return a properly formatted, valid JSON object. Omit any explanation or non-JSON text from your response."
          },
          {
            role: "user",
            content: `Fix this malformed JSON and return a properly formatted, valid JSON object:\n\n${jsonString}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0
      });
  
      const repairedJson = response.choices[0].message.content;
      if (!repairedJson) {
        throw new Error('No response from OpenAI');
      }
      console.log('OpenAI repaired JSON (first 200 chars):', repairedJson.substring(0, 200) + '...');
      
      // Parse should always succeed because OpenAI returns valid JSON with response_format=json_object
      const parsedJson = JSON.parse(repairedJson);
      console.log('Successfully repaired JSON with OpenAI');
      return parsedJson;
    } catch (error) {
      console.error('Error using OpenAI for JSON repair:', error);
      throw error;
    }
  }
  
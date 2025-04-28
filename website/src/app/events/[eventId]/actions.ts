'use server';

import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { checkRateLimit, cleanupRateLimits } from '@/lib/rate-limit';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

/**
 * Loads an event-related markdown file
 */
async function loadEventFile(eventId: string, filename: string): Promise<string | null> {
  try {
    const filePath = path.join(process.cwd(), 'src/data/events', eventId, filename);
    
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    
    return null;
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    return null;
  }
}

/**
 * Asks a question about an event
 */
export async function askEventQuestion(
  contentType: string,
  contentId: string,
  secondaryId: string | undefined,
  question: string
): Promise<string> {
  try {
    // Clean up expired rate limits occasionally
    if (Math.random() < 0.05) { // 5% chance to run cleanup
      cleanupRateLimits().catch(err => 
        console.error("Error cleaning up rate limits:", err)
      );
    }
    
    // Check rate limit (using user's content ID as identifier)
    const { isRateLimited } = await checkRateLimit(contentId);
    
    if (isRateLimited) {
      return "You've reached the daily limit for AI-powered chat (20 messages per day). Please try again tomorrow.";
    }
    
    // Ensure we're handling an event
    if (contentType !== 'event') {
      return "I can only answer questions about events with this function.";
    }
    
    const eventId = contentId;
    
    // Load event data
    const summaryContent = await loadEventFile(eventId, "summary.md");
    // files are in the files directory
    const filesDirectory = path.join(process.cwd(), 'src/data/events', eventId, 'files');
    const files = fs.readdirSync(filesDirectory);

    // load the files
    const filesContent = await Promise.all(files.map(async (file) => {
      // only append .md files
      if (file.endsWith('.md')) {
        return await loadEventFile(eventId, `files/${file}`);
      }
    }));
    
    
    // Combine content for context
    let context = "";
    
    if (summaryContent) {
      context += `# Event Summary\n${summaryContent}\n\n`;
    }
    
    if (filesContent) {
      context += `# Event Documents\n${filesContent}\n\n`;
    }
        
    if (!context) {
      return "I don't have any information about this event to answer your question.";
    }
 
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant helping with questions about an event. 
          Use the following context to answer the user's question. 
          If you don't know the answer based on the context, say so.
          
          Context:
          ${context}`
        },
        {
          role: "user",
          content: question
        }
      ]
    });
    
    return response.choices[0].message.content || "I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Error asking question:", error);
    return "Sorry, I encountered an error while processing your question. Please try again later.";
  }
} 
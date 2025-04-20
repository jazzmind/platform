'use server';

import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

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
    // Ensure we're handling an event
    if (contentType !== 'event') {
      return "I can only answer questions about events with this function.";
    }
    
    const eventId = contentId;
    
    // Load event data
    const summaryContent = await loadEventFile(eventId, "summary.md");
    const notesContent = await loadEventFile(eventId, "notes.md");
    const outcomesContent = await loadEventFile(eventId, "outcomes.md");
    
    // Combine content for context
    let context = "";
    
    if (summaryContent) {
      context += `# Event Summary\n${summaryContent}\n\n`;
    }
    
    if (notesContent) {
      context += `# Event Notes\n${notesContent}\n\n`;
    }
    
    if (outcomesContent) {
      context += `# Event Outcomes\n${outcomesContent}\n\n`;
    }
    
    if (!context) {
      return "I don't have any information about this event to answer your question.";
    }
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "o3-mini",
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
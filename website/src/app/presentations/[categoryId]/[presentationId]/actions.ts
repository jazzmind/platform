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
 * Loads a markdown file for a specific presentation
 */
export async function loadMarkdownFile(categoryId: string, presentationId: string, filename: string): Promise<string | null> {
  try {
    const filePath = path.join(process.cwd(), 'public', categoryId, presentationId, filename);
    
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
 * Asks a question about the presentation
 */
export async function askQuestion(
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
    
    // Check rate limit (using presentation ID as identifier)
    const rateId = secondaryId ? `${contentId}-${secondaryId}` : contentId;
    const { isRateLimited } = await checkRateLimit(rateId);
    
    if (isRateLimited) {
      return "You've reached the daily limit for AI-powered chat (20 messages per day). Please try again tomorrow.";
    }
    
    // For presentation content type
    if (contentType === 'presentation' && secondaryId) {
      const categoryId = contentId;
      const presentationId = secondaryId;
      
      // Load presentation data
      const dataContent = await loadMarkdownFile(categoryId, presentationId, "presentation.md");
      const notesContent = await loadMarkdownFile(categoryId, presentationId, "notes.md");
      
      // Combine content for context
      let context = "";
      
      if (dataContent) {
        context += `# Presentation Data\n${dataContent}\n\n`;
      }
      
      if (notesContent) {
        context += `# Presentation Notes\n${notesContent}\n\n`;
      }
      
      if (!context) {
        return "I don't have any information about this presentation to answer your question.";
      }
      
      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant helping with questions about a presentation. 
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
    }
    
    // For event content type
    if (contentType === 'event') {
      return "Event content support will be implemented soon.";
    }
    
    return "I can only answer questions about supported content types.";
  } catch (error) {
    console.error("Error asking question:", error);
    return "Sorry, I encountered an error while processing your question. Please try again later.";
  }
} 
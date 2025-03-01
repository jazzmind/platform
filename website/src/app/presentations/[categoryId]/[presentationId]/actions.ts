'use server';

import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

/**
 * Loads the content of a markdown file
 */
export async function loadMarkdownFile(categoryId: string, presentationId: string, filename: string): Promise<string | null> {
  try {
    // First check in the public directory
    const publicDirPath = path.join(process.cwd(), "public", categoryId);
    let presentationPath = path.join(publicDirPath, presentationId);
    
    // If not found in public dir, try the legacy location
    if (!fs.existsSync(presentationPath)) {
      presentationPath = path.join(process.cwd(), "..", categoryId, presentationId);
      
      if (!fs.existsSync(presentationPath)) {
        console.error(`Presentation not found at path: ${presentationPath}`);
        return null;
      }
    }
    
    const filePath = path.join(presentationPath, filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return null;
    }
    
    const content = fs.readFileSync(filePath, "utf8");
    return content;
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    return null;
  }
}

/**
 * Asks a question about the presentation
 */
export async function askQuestion(categoryId: string, presentationId: string, question: string): Promise<string> {
  try {
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
      model: "o3-mini",
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
  } catch (error) {
    console.error("Error asking question:", error);
    return "Sorry, I encountered an error while processing your question. Please try again later.";
  }
} 
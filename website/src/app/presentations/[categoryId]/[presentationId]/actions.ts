'use server';

import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Check if a file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Function to fetch the notes.md content if it exists
export async function fetchNotes(categoryId: string, presentationId: string): Promise<string | null> {
  // Build the path to the notes.md file in the public directory
  const notesPath = path.join(
    process.cwd(),
    'public',
    categoryId,
    presentationId,
    'notes.md'
  );
  
  console.log('Looking for notes at:', notesPath);
  
  // Check if the file exists
  const exists = await fileExists(notesPath);
  if (!exists) {
    console.log('Notes file not found at:', notesPath);
    return null;
  }
  
  // Read and return the content
  try {
    const notesContent = await fs.readFile(notesPath, 'utf-8');
    console.log('Successfully loaded notes file with length:', notesContent.length);
    return notesContent;
  } catch (error) {
    console.error('Error reading notes file:', error);
    return null;
  }
}

// Function to fetch presentation data (data.md) if it exists
async function fetchPresentationData(categoryId: string, presentationId: string): Promise<string | null> {
  const dataPath = path.join(
    process.cwd(),
    'public',
    categoryId,
    presentationId,
    'data.md'
  );
  
  console.log('Looking for presentation data at:', dataPath);
  
  const exists = await fileExists(dataPath);
  if (!exists) {
    console.log('Data file not found at:', dataPath);
    return null;
  }
  
  try {
    const dataContent = await fs.readFile(dataPath, 'utf-8');
    console.log('Successfully loaded data file with length:', dataContent.length);
    return dataContent;
  } catch (error) {
    console.error('Error reading data file:', error);
    return null;
  }
}

// Function to chat with the presentation using OpenAI
export async function chatWithPresentation(
  categoryId: string,
  presentationId: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  try {
    // Get the notes and data content
    const notesContent = await fetchNotes(categoryId, presentationId);
    const dataContent = await fetchPresentationData(categoryId, presentationId);
    
    // Create system message with context
    let systemMessage = `You are an AI assistant that helps users understand the presentation titled "${presentationId}".`;
    
    if (dataContent || notesContent) {
      systemMessage += "\n\nHere is some additional context about the presentation:";
      
      if (dataContent) {
        systemMessage += "\n\nPresentation Data:\n" + dataContent;
      }
      
      if (notesContent) {
        systemMessage += "\n\nPresentation Notes:\n" + notesContent;
      }
    }
    
    console.log("System message length:", systemMessage.length);
    console.log("Context loaded - Notes:", notesContent ? "Yes" : "No", "Data:", dataContent ? "Yes" : "No");
    
    // Prepare the messages array with the system message
    const formattedMessages = [
      { role: 'system' as const, content: systemMessage },
      ...messages.map(msg => ({ 
        role: msg.role as 'user' | 'assistant' | 'system', 
        content: msg.content 
      }))
    ];
    
    // Call the OpenAI API
    const completion = await openai.chat.completions.create({
      messages: formattedMessages,
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    // Return the assistant's response
    return completion.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return "Sorry, I encountered an error while processing your request. Please try again later.";
  }
} 
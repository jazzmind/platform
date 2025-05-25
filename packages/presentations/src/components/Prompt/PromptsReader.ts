import { promises as fs } from 'fs';
import path from 'path';

// Define the Prompt interface
export interface Prompt {
  id: string;
  text: string;          // 1-5 word prompt
  duration: number;      // in seconds
  notes?: string;        // Optional guidance for the presenter
}

export interface DynamicPresentation {
  id: string;
  title: string;
  prompts: Prompt[];
  referenceFile: string; // Path to presentation.md
}

/**
 * Parses a prompts.md file to extract prompts for dynamic presentation
 */
export async function readPromptsFile(categoryId: string, presentationId: string): Promise<Prompt[]> {
  console.debug('[PromptsReader] readPromptsFile called', { categoryId, presentationId });
  try {
    // First check in the public directory
    const publicDirPath = path.join(process.cwd(), "public", categoryId, presentationId);
    const promptsPath = path.join(publicDirPath, "prompts.md");

    // Try to read the file
    let content: string;
    try {
      content = await fs.readFile(promptsPath, 'utf-8');
    } catch {
      console.error(`Prompts file not found: ${promptsPath}`);
      // If not found, try the legacy location or return empty prompts
      try {
        const legacyPath = path.join(process.cwd(), "..", categoryId, presentationId, "prompts.md");
        content = await fs.readFile(legacyPath, 'utf-8');
      } catch {
        console.error(`Prompts file not found in legacy location either`);
        // Return default prompts if no file exists
        return createDefaultPrompts();
      }
    }

    // Parse the markdown content to extract prompts
    console.debug('[PromptsReader] parsing prompts markdown', { promptsPath });
    const prompts = parsePromptsMarkdown(content);
    return prompts;
  } catch (error) {
    console.error('Error reading prompts file:', error);
    return createDefaultPrompts();
  }
}

/**
 * Parse the markdown content to extract prompts
 */
function parsePromptsMarkdown(content: string): Prompt[] {
  console.debug('[PromptsReader] parsePromptsMarkdown called', { content });
  const lines = content.split('\n');
  const prompts: Prompt[] = [];
  
  let currentPrompt: Partial<Prompt> | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for section headers (## Title)
    if (line.startsWith('## ')) {
      // If we were building a prompt, save it
      if (currentPrompt && currentPrompt.text) {
        prompts.push({
          id: generateId(currentPrompt.text),
          text: currentPrompt.text,
          duration: currentPrompt.duration || 60, // Default to 60 seconds
          notes: currentPrompt.notes
        });
      }
      
      // Start a new prompt with the section title
      currentPrompt = {
        text: line.substring(3).trim()
      };
      continue;
    }
    
    // Skip main title or empty lines
    if (line.startsWith('# ') || line === '') {
      continue;
    }
    
    // Parse prompt properties
    if (currentPrompt) {
      if (line.startsWith('- Prompt:')) {
        currentPrompt.text = line.substring('- Prompt:'.length).trim().replace(/"/g, '');
      } else if (line.startsWith('- Duration:')) {
        const durationStr = line.substring('- Duration:'.length).trim();
        currentPrompt.duration = parseInt(durationStr, 10) || 60;
      } else if (line.startsWith('- Notes:')) {
        currentPrompt.notes = line.substring('- Notes:'.length).trim();
      }
    }
  }
  
  // Add the last prompt if we have one
  if (currentPrompt && currentPrompt.text) {
    prompts.push({
      id: generateId(currentPrompt.text),
      text: currentPrompt.text,
      duration: currentPrompt.duration || 60,
      notes: currentPrompt.notes
    });
  }
  
  return prompts;
}

/**
 * Generate a simple ID from the prompt text
 */
function generateId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Create default prompts if no prompts.md file is found
 */
function createDefaultPrompts(): Prompt[] {
  console.debug('[PromptsReader] createDefaultPrompts called');
  return [
    {
      id: 'introduction',
      text: 'Welcome to my talk',
      duration: 30,
      notes: 'Begin with a general introduction to the topic and your background'
    },
    {
      id: 'key-concept-1',
      text: 'First key concept',
      duration: 60,
      notes: 'Explain the first main concept of your presentation'
    },
    {
      id: 'key-concept-2',
      text: 'Second key concept',
      duration: 60,
      notes: 'Explain the second main concept of your presentation'
    },
    {
      id: 'demonstration',
      text: 'Demonstration',
      duration: 90,
      notes: 'Show a practical example or demonstration'
    },
    {
      id: 'conclusion',
      text: 'Takeaways and questions',
      duration: 45,
      notes: 'Summarize key points and open for Q&A'
    }
  ];
} 
import path from "path";
import fs from "fs";

// Define types for our data structures
export type Presentation = {
  id: string;
  title: string;
  description: string;
  date: string;
  url: string;
  hasNotes: boolean;
  hasData: boolean;
};

// Function to get a specific presentation
export async function getPresentation(categoryId: string, presentationId: string): Promise<Presentation | null> {
  try {
    // First check in the public directory
    const publicDirPath = path.join(process.cwd(), "public", categoryId);
    let presentationPath = path.join(publicDirPath, presentationId);
    let resolvedPresentationId = presentationId;
    let baseUrl = `/${categoryId}/${presentationId}`;

    // Special handling for AI Tinkerers presentations
    if (presentationId.startsWith("ai-tinkerers/")) {
      // This is a nested presentation inside the ai-tinkerers folder
      resolvedPresentationId = presentationId;
      baseUrl = `/${categoryId}/${presentationId}`;
    } else if (presentationId.startsWith("ai-tinkerers-")) {
      // This is a top-level ai-tinkerers presentation
      resolvedPresentationId = presentationId;
      baseUrl = `/${categoryId}/${presentationId}`;
    }

    // If not found in public dir, try the legacy location
    if (!fs.existsSync(presentationPath)) {
      console.log(`Presentation not found in public dir: ${presentationPath}, trying legacy location`);
      presentationPath = path.join(process.cwd(), "..", categoryId, resolvedPresentationId);
      
      if (!fs.existsSync(presentationPath)) {
        console.error(`Presentation not found at path: ${presentationPath}`);
        return null;
      }
    }
    
    // Check if there's a metadata.json file
    let title = "";
    let description = "";
    let date = "";
    
    if (fs.existsSync(path.join(presentationPath, "metadata.json"))) {
      const metadata = JSON.parse(fs.readFileSync(path.join(presentationPath, "metadata.json"), "utf8"));
      title = metadata.title || formatTitle(resolvedPresentationId);
      description = metadata.description || `Presentation about ${resolvedPresentationId.replace(/-/g, " ")}`;
      date = metadata.date || new Date().toISOString().split("T")[0];
    } else {
      // For AI tinkerers presentations, parse the ID to get a better title
      title = formatTitle(resolvedPresentationId);
      date = extractDateFromId(resolvedPresentationId) || new Date().toISOString().split("T")[0];
      
      // Try to extract description from data.md if it exists
      description = `Presentation about ${resolvedPresentationId.replace(/-/g, " ")}`;
      
      if (fs.existsSync(path.join(presentationPath, "data.md"))) {
        const data = fs.readFileSync(path.join(presentationPath, "data.md"), "utf8");
        const descMatch = data.match(/## Presentation Metadata[\s\S]*?Description:(.*?)(?:\n|$)/i);
        if (descMatch && descMatch[1]) {
          description = descMatch[1].trim();
        }
      }
    }
    
    // Check if notes.md exists
    const hasNotes = fs.existsSync(path.join(presentationPath, "notes.md"));
    
    // Check if data.md exists
    const hasData = fs.existsSync(path.join(presentationPath, "data.md"));
    
    // URL for the presentation
    const url = `${baseUrl}/index.html`;
    
    return {
      id: resolvedPresentationId,
      title,
      description,
      date,
      url,
      hasNotes,
      hasData
    };
  } catch (error) {
    console.error("Error getting presentation:", error);
    return null;
  }
}

// Helper function to format a title from an ID
function formatTitle(id: string): string {
  // Special cases for AI Tinkerers presentations
  if (id.includes("ai-tinkerers")) {
    if (id.includes("cursor")) {
      return "Hands on with Cursor";
    } else if (id.includes("openai-assistants")) {
      return "OpenAI Assistants API";
    } else if (id.includes("the-future-of-ai")) {
      return "The Future of AI";
    }
  }
  
  // Default formatting
  return id.split("/").pop()?.split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || id;
}

// Helper function to extract a date from an ID
function extractDateFromId(id: string): string | null {
  // Try to parse dates in formats like YYYY-MM or YY-MM
  const dateMatch = id.match(/(\d{4}|\d{2})-(0[1-9]|1[0-2])/);
  if (dateMatch) {
    const year = dateMatch[1].length === 2 ? `20${dateMatch[1]}` : dateMatch[1];
    const month = dateMatch[2];
    
    // Convert month number to month name
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    return `${months[parseInt(month) - 1]} ${year}`;
  }
  
  return null;
} 
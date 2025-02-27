import fs from "fs";
import path from "path";

// Define types for our data structures
export type Presentation = {
  id: string;
  title: string;
  description: string;
  date: string;
  url: string;
};

// Function to get a specific presentation
export async function getPresentation(categoryId: string, presentationId: string): Promise<Presentation | null> {
  try {
    // Check if this is an AI Tinkerers presentation
    const isAiTinkerers = presentationId.includes("ai-tinkerers");
    
    // Get the presentation directory path
    let presentationDir: string | null = null;
    
    if (isAiTinkerers) {
      if (presentationId === "ai-tinkerers-2023-12-the-future-of-ai") {
        // Special case for this specific presentation
        // Try multiple path patterns
        const pathsToCheck = [
          path.join(process.cwd(), "public", "technical", "ai-tinkerers", "ai-tinkerers-2023-12-the-future-of-ai"),
          path.join(process.cwd(), "public", "technical", "ai-tinkerers-2023-12-the-future-of-ai"),
          path.join(process.cwd(), "..", "technical", "ai-tinkerers", "ai-tinkerers-2023-12-the-future-of-ai"),
          path.join(process.cwd(), "..", "technical", "ai-tinkerers-2023-12-the-future-of-ai")
        ];
        
        // Find the first path that exists
        for (const pathToCheck of pathsToCheck) {
          if (fs.existsSync(pathToCheck)) {
            presentationDir = pathToCheck;
            break;
          }
        }
      } else {
        // Parse the AI Tinkerers presentation ID to get subfolder structure
        const parts = presentationId.split("-");
        const datePart = parts.length > 3 ? `${parts[2]}-${parts[3]}` : ""; // e.g., feb-25
        const subfolderPart = parts.length > 4 ? parts.slice(4).join("-") : ""; // e.g., cursor or mcp-demo
        
        // Try multiple path patterns
        const pathsToCheck = [];
        
        if (datePart && subfolderPart) {
          pathsToCheck.push(
            path.join(process.cwd(), "public", "technical", "ai-tinkerers", datePart, subfolderPart),
            path.join(process.cwd(), "public", "technical", "ai-tinkerers-" + datePart + "-" + subfolderPart),
            path.join(process.cwd(), "..", "technical", "ai-tinkerers", datePart, subfolderPart),
            path.join(process.cwd(), "..", "technical", "ai-tinkerers-" + datePart + "-" + subfolderPart)
          );
        } else if (datePart) {
          pathsToCheck.push(
            path.join(process.cwd(), "public", "technical", "ai-tinkerers", datePart),
            path.join(process.cwd(), "public", "technical", "ai-tinkerers-" + datePart),
            path.join(process.cwd(), "..", "technical", "ai-tinkerers", datePart),
            path.join(process.cwd(), "..", "technical", "ai-tinkerers-" + datePart)
          );
        } else {
          pathsToCheck.push(
            path.join(process.cwd(), "public", "technical", "ai-tinkerers"),
            path.join(process.cwd(), "..", "technical", "ai-tinkerers")
          );
        }
        
        // Find the first path that exists
        for (const pathToCheck of pathsToCheck) {
          if (fs.existsSync(pathToCheck)) {
            presentationDir = pathToCheck;
            break;
          }
        }
      }
    } else {
      // For other presentations, use the standard path
      const pathsToCheck = [
        path.join(process.cwd(), "public", categoryId, presentationId),
        path.join(process.cwd(), "..", categoryId, presentationId)
      ];
      
      // Find the first path that exists
      for (const pathToCheck of pathsToCheck) {
        if (fs.existsSync(pathToCheck)) {
          presentationDir = pathToCheck;
          break;
        }
      }
    }
    
    // Check if we found a valid directory
    if (!presentationDir || !fs.existsSync(presentationDir)) {
      console.log(`Directory not found for presentation: ${presentationId}`);
      return null;
    }
    
    // Get presentation title
    let title: string;
    if (presentationId.includes("ai-tinkerers-feb-25-cursor")) {
      title = "Hands on with Cursor";
    } else if (presentationId.includes("ai-tinkerers-feb-25-mcp-demo")) {
      title = "Multi-Context Programming Demo";
    } else if (presentationId.includes("ai-tinkerers-sept-24")) {
      title = "Hands on with the OpenAI Assistant API";
    } else if (presentationId.includes("ai-tinkerers-2023-12-the-future-of-ai")) {
      title = "The Future of AI";
    } else {
      title = presentationId.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
    }
    
    // Create presentation description based on title
    const description = `Presentation about ${title.toLowerCase()}`;
    
    // Set date based on presentation ID
    let date = "";
    if (presentationId.includes("sept-24")) {
      date = "September 24, 2023";
    } else if (presentationId.includes("feb-25")) {
      date = "February 25, 2023";
    } else if (presentationId.includes("2023-12")) {
      date = "December 15, 2023";
    } else {
      date = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    
    // Build the URL for accessing the presentation
    // For AI Tinkerers presentations, use the correct path structure
    let presentationUrl: string;
    
    if (presentationId === "ai-tinkerers-2023-12-the-future-of-ai") {
      // Use the direct path to the file we know exists
      presentationUrl = `/technical/ai-tinkerers/ai-tinkerers-2023-12-the-future-of-ai/index.html`;
    } else if (isAiTinkerers) {
      // Parse the AI Tinkerers presentation ID to get subfolder structure
      const parts = presentationId.split("-");
      const datePart = parts.length > 3 ? `${parts[2]}-${parts[3]}` : ""; // e.g., feb-25
      const subfolderPart = parts.length > 4 ? parts.slice(4).join("-") : ""; // e.g., cursor or mcp-demo
      
      if (datePart && subfolderPart) {
        presentationUrl = `/technical/ai-tinkerers/${datePart}/${subfolderPart}/index.html`;
      } else if (datePart) {
        presentationUrl = `/technical/ai-tinkerers/${datePart}/index.html`;
      } else {
        presentationUrl = `/technical/ai-tinkerers/index.html`;
      }
    } else {
      // For standard presentations
      presentationUrl = `/${categoryId}/${presentationId}/index.html`;
    }
    
    // Create a presentation object
    const presentation: Presentation = {
      id: presentationId,
      title,
      description,
      date,
      url: presentationUrl,
    };
    
    return presentation;
  } catch (error) {
    console.error("Error fetching presentation:", error);
    return null;
  }
} 
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { OpenAI } from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Create a POST handler for the chat functionality
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string; presentationId: string }> }
) {
  try {
    const { categoryId, presentationId } = await params;
    const { messages } = await request.json();
    
    // Load context files for the presentation
    const contextFiles = await loadPresentationContext(categoryId, presentationId);
    
    // Format context for the prompt
    let context = "";
    if (contextFiles.notesContent) {
      context += `PRESENTATION NOTES:\n${contextFiles.notesContent}\n\n`;
    }
    if (contextFiles.dataContent) {
      context += `PRESENTATION DATA:\n${contextFiles.dataContent}\n\n`;
    }
    
    // If no context was found, add a minimal context
    if (!context) {
      context = `This is a presentation about "${presentationId.replace(/-/g, " ")}" in the category "${categoryId}".`;
    }
    
    // Create system message with context
    const systemMessage = {
      role: "system",
      content: `You are an AI assistant helping with a presentation. Answer questions based on the following context about the presentation. Be helpful, concise, and accurate. If you don't know the answer, say so rather than making things up.\n\n${context}`
    };
    
    // Create stream from OpenAI
    const response = await openai.chat.completions.create({
      model: "o3-mini",
      stream: true,
      messages: [systemMessage, ...messages],
    });
    
    // Return the stream directly
    return new Response(response as unknown as ReadableStream);
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Serve presentation files (GET handler)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string; presentationId: string }> }
) {
  try {
    const { categoryId, presentationId } = await params;
    
    // Get the requested URL path to determine which file is requested
    const url = new URL(request.url);
    let filePath = url.pathname.replace(`/api/presentations/${categoryId}/${presentationId}`, "");
    
    // If no specific file is requested, serve index.html
    if (!filePath || filePath === "/") {
      filePath = "/index.html";
    }
    
    console.log("Requested file path:", filePath);
    console.log("Category ID:", categoryId);
    console.log("Presentation ID:", presentationId);
    
    // Use direct path in public directory
    const fullPath = path.join(process.cwd(), "public", categoryId, presentationId, filePath.substring(1));
    
    console.log("Looking for file at:", fullPath);
    
    if (fs.existsSync(fullPath)) {
      console.log("Serving file from:", fullPath);
      const fileContent = fs.readFileSync(fullPath);
      const contentType = getContentType(fullPath);
      console.log("Content type:", contentType);
      return new NextResponse(fileContent, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "no-store, must-revalidate",
        },
      });
    }
    
    // If the file doesn't exist, return 404
    console.log("File not found:", fullPath);
    return new NextResponse(`File not found: ${filePath}`, { status: 404 });
  } catch (error) {
    console.error("Error serving presentation file:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Helper function to determine content type based on file extension
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  let contentType = "text/plain";
  
  switch (ext) {
    case ".html":
      contentType = "text/html";
      break;
    case ".css":
      contentType = "text/css";
      break;
    case ".js":
      contentType = "application/javascript";
      break;
    case ".json":
      contentType = "application/json";
      break;
    case ".png":
      contentType = "image/png";
      break;
    case ".jpg":
    case ".jpeg":
      contentType = "image/jpeg";
      break;
    case ".gif":
      contentType = "image/gif";
      break;
    case ".svg":
      contentType = "image/svg+xml";
      break;
    case ".pdf":
      contentType = "application/pdf";
      break;
    case ".md":
      contentType = "text/markdown";
      break;
  }
  
  return contentType;
}

// Helper function to load presentation context files
async function loadPresentationContext(categoryId: string, presentationId: string) {
  let notesContent = "";
  let dataContent = "";
  
  // Get paths to the context files
  const notesPath = path.join(process.cwd(), "public", categoryId, presentationId, "notes.md");
  const dataPath = path.join(process.cwd(), "public", categoryId, presentationId, "data.md");
  
  // Load notes.md if it exists
  if (fs.existsSync(notesPath)) {
    notesContent = fs.readFileSync(notesPath, "utf8");
    console.log("Loaded notes.md from", notesPath);
  } else {
    console.log("Notes file not found at", notesPath);
  }
  
  // Load data.md if it exists
  if (fs.existsSync(dataPath)) {
    dataContent = fs.readFileSync(dataPath, "utf8");
    console.log("Loaded data.md from", dataPath);
  } else {
    console.log("Data file not found at", dataPath);
  }
  
  return { notesContent, dataContent };
} 
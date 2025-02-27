import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ categoryId: string; presentationId: string }> }
) {
  const params = await paramsPromise;
  const { categoryId, presentationId } = params;
  
  try {
    // Get the requested URL path to determine which file is requested
    const url = new URL(request.url);
    let filePath = url.pathname.replace(`/api/presentations/${categoryId}/${presentationId}`, "");
    
    // If no specific file is requested, serve index.html
    if (!filePath || filePath === "/") {
      filePath = "/index.html";
    }
    
    // Debug log
    console.log("Request URL:", request.url);
    console.log("Category ID:", categoryId);
    console.log("Presentation ID:", presentationId);
    console.log("File Path:", filePath);
    
    // Determine if this is an AI Tinkerers presentation
    const isAiTinkerers = presentationId.includes("ai-tinkerers");
    
    let fullFilePath: string | null = null;
    
    // Try all possible file paths
    const pathsToTry = [];
    
    if (isAiTinkerers) {
      if (presentationId === "ai-tinkerers-2023-12-the-future-of-ai") {
        // Special case for this specific presentation
        pathsToTry.push(
          path.join(process.cwd(), "public", categoryId, "ai-tinkerers", "ai-tinkerers-2023-12-the-future-of-ai", filePath.substring(1)),
          path.join(process.cwd(), "public", categoryId, "ai-tinkerers-2023-12-the-future-of-ai", filePath.substring(1)),
          path.join(process.cwd(), "public", categoryId, presentationId, filePath.substring(1)),
          path.join(process.cwd(), "..", categoryId, "ai-tinkerers", "ai-tinkerers-2023-12-the-future-of-ai", filePath.substring(1)),
          path.join(process.cwd(), "..", categoryId, "ai-tinkerers-2023-12-the-future-of-ai", filePath.substring(1)),
          path.join(process.cwd(), "..", categoryId, presentationId, filePath.substring(1))
        );
      } else {
        // Parse the AI Tinkerers presentation ID to get subfolder structure
        const parts = presentationId.split("-");
        const datePart = parts.length > 3 ? `${parts[2]}-${parts[3]}` : ""; // e.g., feb-25
        const subfolderPart = parts.length > 4 ? parts.slice(4).join("-") : ""; // e.g., cursor or mcp-demo
        
        if (datePart && subfolderPart) {
          pathsToTry.push(
            path.join(process.cwd(), "public", categoryId, "ai-tinkerers", datePart, subfolderPart, filePath.substring(1)),
            path.join(process.cwd(), "public", categoryId, `ai-tinkerers-${datePart}-${subfolderPart}`, filePath.substring(1)),
            path.join(process.cwd(), "..", categoryId, "ai-tinkerers", datePart, subfolderPart, filePath.substring(1)),
            path.join(process.cwd(), "..", categoryId, `ai-tinkerers-${datePart}-${subfolderPart}`, filePath.substring(1))
          );
        } else if (datePart) {
          pathsToTry.push(
            path.join(process.cwd(), "public", categoryId, "ai-tinkerers", datePart, filePath.substring(1)),
            path.join(process.cwd(), "public", categoryId, `ai-tinkerers-${datePart}`, filePath.substring(1)),
            path.join(process.cwd(), "..", categoryId, "ai-tinkerers", datePart, filePath.substring(1)),
            path.join(process.cwd(), "..", categoryId, `ai-tinkerers-${datePart}`, filePath.substring(1))
          );
        } else {
          pathsToTry.push(
            path.join(process.cwd(), "public", categoryId, "ai-tinkerers", filePath.substring(1)),
            path.join(process.cwd(), "..", categoryId, "ai-tinkerers", filePath.substring(1))
          );
        }
      }
    } else {
      // For standard presentations
      pathsToTry.push(
        path.join(process.cwd(), "public", categoryId, presentationId, filePath.substring(1)),
        path.join(process.cwd(), "..", categoryId, presentationId, filePath.substring(1))
      );
    }
    
    // Try each path until we find one that exists
    for (const pathToTry of pathsToTry) {
      console.log("Checking path:", pathToTry);
      if (fs.existsSync(pathToTry)) {
        fullFilePath = pathToTry;
        console.log("Found file at:", fullFilePath);
        break;
      }
    }
    
    // If we found a file, serve it
    if (fullFilePath && fs.existsSync(fullFilePath)) {
      const fileContent = fs.readFileSync(fullFilePath);
      const contentType = getContentType(fullFilePath);
      return new NextResponse(fileContent, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "no-store, must-revalidate",
        },
      });
    }
    
    // If the file doesn't exist, return 404
    console.log("File not found:", filePath);
    console.log("Tried paths:", pathsToTry);
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
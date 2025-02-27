import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: { categoryId: string; presentationId: string } }
) {
  try {
    const { categoryId, presentationId } = params;
    
    // Try to find the notes.md file
    const pathsToTry = [
      // Public directory
      path.join(process.cwd(), "public", categoryId, presentationId, "notes.md"),
      
      // Special handling for AI Tinkerers presentations
      ...(presentationId.startsWith("ai-tinkerers") ? [
        path.join(process.cwd(), "public", categoryId, presentationId, "notes.md"),
        path.join(process.cwd(), "public", categoryId, "ai-tinkerers", presentationId.replace("ai-tinkerers/", ""), "notes.md")
      ] : []),
      
      // Legacy location
      path.join(process.cwd(), "..", categoryId, presentationId, "notes.md")
    ];
    
    // Try each path until we find one that exists
    let notesPath = null;
    for (const tryPath of pathsToTry) {
      if (fs.existsSync(tryPath)) {
        notesPath = tryPath;
        break;
      }
    }
    
    // If we found the notes, return them
    if (notesPath) {
      const notes = fs.readFileSync(notesPath, "utf8");
      return new NextResponse(notes, {
        headers: {
          "Content-Type": "text/markdown",
          "Cache-Control": "no-store, must-revalidate"
        }
      });
    }
    
    // If we didn't find the notes, return 404
    return new NextResponse("Notes not found", { status: 404 });
  } catch (error) {
    console.error("Error serving notes:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 
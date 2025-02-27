import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const cwd = process.cwd();
    const presentationId = "ai-tinkerers-2023-12-the-future-of-ai";
    const categoryId = "technical";
    const filePath = "/index.html";
    
    // Check all possible paths
    const pathsToCheck = [
      // Public paths
      {
        name: "public/technical/ai-tinkerers/ai-tinkerers-2023-12-the-future-of-ai",
        path: path.join(cwd, "public", categoryId, "ai-tinkerers", "ai-tinkerers-2023-12-the-future-of-ai", filePath.substring(1)),
      },
      {
        name: "public/technical/ai-tinkerers-2023-12-the-future-of-ai",
        path: path.join(cwd, "public", categoryId, "ai-tinkerers-2023-12-the-future-of-ai", filePath.substring(1)),
      },
      {
        name: "public/technical/ai-tinkerers-2023-12-the-future-of-ai (direct)",
        path: path.join(cwd, "public", categoryId, presentationId, filePath.substring(1)),
      },
      
      // External paths
      {
        name: "../technical/ai-tinkerers/ai-tinkerers-2023-12-the-future-of-ai",
        path: path.join(cwd, "..", categoryId, "ai-tinkerers", "ai-tinkerers-2023-12-the-future-of-ai", filePath.substring(1)),
      },
      {
        name: "../technical/ai-tinkerers-2023-12-the-future-of-ai",
        path: path.join(cwd, "..", categoryId, "ai-tinkerers-2023-12-the-future-of-ai", filePath.substring(1)),
      },
      {
        name: "../technical/ai-tinkerers-2023-12-the-future-of-ai (direct)",
        path: path.join(cwd, "..", categoryId, presentationId, filePath.substring(1)),
      },
    ];
    
    const results = pathsToCheck.map(item => ({
      name: item.name,
      path: item.path,
      exists: fs.existsSync(item.path),
      isFile: fs.existsSync(item.path) ? fs.statSync(item.path).isFile() : false,
      size: fs.existsSync(item.path) && fs.statSync(item.path).isFile() ? fs.statSync(item.path).size : 0,
    }));
    
    // Also check the directory structure
    const directoryStructure = {
      public: {
        technical: fs.existsSync(path.join(cwd, "public", "technical")),
        "technical/ai-tinkerers": fs.existsSync(path.join(cwd, "public", "technical", "ai-tinkerers")),
        "technical/ai-tinkerers/ai-tinkerers-2023-12-the-future-of-ai": fs.existsSync(path.join(cwd, "public", "technical", "ai-tinkerers", "ai-tinkerers-2023-12-the-future-of-ai")),
        "technical/ai-tinkerers-2023-12-the-future-of-ai": fs.existsSync(path.join(cwd, "public", "technical", "ai-tinkerers-2023-12-the-future-of-ai")),
      },
      external: {
        technical: fs.existsSync(path.join(cwd, "..", "technical")),
        "technical/ai-tinkerers": fs.existsSync(path.join(cwd, "..", "technical", "ai-tinkerers")),
        "technical/ai-tinkerers/ai-tinkerers-2023-12-the-future-of-ai": fs.existsSync(path.join(cwd, "..", "technical", "ai-tinkerers", "ai-tinkerers-2023-12-the-future-of-ai")),
        "technical/ai-tinkerers-2023-12-the-future-of-ai": fs.existsSync(path.join(cwd, "..", "technical", "ai-tinkerers-2023-12-the-future-of-ai")),
      }
    };
    
    return NextResponse.json({
      cwd,
      results,
      directoryStructure
    });
  } catch (error) {
    console.error("Error in debug file paths API route:", error);
    return NextResponse.json({ error: "Internal Server Error", details: String(error) }, { status: 500 });
  }
} 
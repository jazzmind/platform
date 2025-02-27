import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DEMO_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demo Presentation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      margin: 0;
      padding: 0;
      background: #f5f5f5;
      color: #333;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    h1 {
      color: #e74c3c;
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    p {
      font-size: 1.25rem;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Demo Presentation</h1>
    <p>This is a sample presentation file created for testing purposes.</p>
    <p>If you can see this, the presentation loading system is working correctly! 🎉</p>
  </div>
</body>
</html>
`;

function createDirectoryIfNotExists(dirPath: string): boolean {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
    return false;
  }
}

function writeFileIfNotExists(filePath: string, content: string): boolean {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content);
      console.log(`Created file: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    return false;
  }
}

export async function GET() {
  try {
    const cwd = process.cwd();
    const publicDir = path.join(cwd, "public");
    
    // Create necessary directories
    const operations = [];
    
    // Technical category
    operations.push({
      type: 'dir',
      path: path.join(publicDir, "technical"),
      created: createDirectoryIfNotExists(path.join(publicDir, "technical"))
    });
    
    // AI Tinkerers paths
    const aiTinkerersBase = path.join(publicDir, "technical", "ai-tinkerers");
    operations.push({
      type: 'dir',
      path: aiTinkerersBase,
      created: createDirectoryIfNotExists(aiTinkerersBase)
    });
    
    // Create a demo presentation inside AI Tinkerers
    const demoPath = path.join(aiTinkerersBase, "ai-tinkerers-2023-12-the-future-of-ai");
    operations.push({
      type: 'dir',
      path: demoPath,
      created: createDirectoryIfNotExists(demoPath)
    });
    
    // Create demo files
    const indexHtmlPath = path.join(demoPath, "index.html");
    operations.push({
      type: 'file',
      path: indexHtmlPath,
      created: writeFileIfNotExists(indexHtmlPath, DEMO_HTML)
    });
    
    return NextResponse.json({
      success: true,
      message: "Setup completed successfully",
      operations
    });
  } catch (error) {
    console.error("Error in setup API route:", error);
    return NextResponse.json({ 
      success: false,
      error: "Internal Server Error", 
      details: String(error) 
    }, { status: 500 });
  }
} 
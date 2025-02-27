import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function listDirectories(directory: string): string[] {
  try {
    if (!fs.existsSync(directory)) {
      return [];
    }
    return fs.readdirSync(directory, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  } catch (error) {
    console.error(`Error listing directories in ${directory}:`, error);
    return [];
  }
}

function listFiles(directory: string): string[] {
  try {
    if (!fs.existsSync(directory)) {
      return [];
    }
    return fs.readdirSync(directory, { withFileTypes: true })
      .filter(dirent => dirent.isFile())
      .map(dirent => dirent.name);
  } catch (error) {
    console.error(`Error listing files in ${directory}:`, error);
    return [];
  }
}

function checkPathExists(pathToCheck: string): boolean {
  try {
    return fs.existsSync(pathToCheck);
  } catch (error) {
    console.error(`Error checking if path exists ${pathToCheck}:`, error);
    return false;
  }
}

interface PathInfo {
  publicPath: string;
  publicExists: boolean;
  externalPath: string;
  externalExists: boolean;
}

interface TestPathInfo {
  publicPath: string;
  publicExists: boolean;
  publicFiles: string[];
  externalPath: string;
  externalExists: boolean;
  externalFiles: string[];
}

interface DebugResults {
  workingDirectory: string;
  publicDirectoryExists: boolean;
  externalDirectoryExists: boolean;
  publicCategories: string[];
  externalCategories: string[];
  aiTinkerers: PathInfo;
  technical: PathInfo;
  testPresentation: TestPathInfo;
}

export async function GET() {
  try {
    const cwd = process.cwd();
    const publicDir = path.join(cwd, "public");
    const externalDir = path.join(cwd, "..");
    
    // Get categories from public directory
    const publicCategories = listDirectories(publicDir);
    const externalCategories = listDirectories(externalDir);
    
    // Check some important paths
    const debugResults: DebugResults = {
      workingDirectory: cwd,
      publicDirectoryExists: checkPathExists(publicDir),
      externalDirectoryExists: checkPathExists(externalDir),
      publicCategories,
      externalCategories,
      aiTinkerers: {
        publicPath: path.join(publicDir, "ai-tinkerers"),
        publicExists: checkPathExists(path.join(publicDir, "ai-tinkerers")),
        externalPath: path.join(externalDir, "ai-tinkerers"),
        externalExists: checkPathExists(path.join(externalDir, "ai-tinkerers")),
      },
      technical: {
        publicPath: path.join(publicDir, "technical"),
        publicExists: checkPathExists(path.join(publicDir, "technical")),
        externalPath: path.join(externalDir, "technical"),
        externalExists: checkPathExists(path.join(externalDir, "technical")),
      },
      testPresentation: {
        publicPath: "",
        publicExists: false,
        publicFiles: [],
        externalPath: "",
        externalExists: false,
        externalFiles: []
      }
    };
    
    // Also check a specific presentation path
    const testPath = "ai-tinkerers/ai-tinkerers-2023-12-the-future-of-ai";
    debugResults.testPresentation = {
      publicPath: path.join(publicDir, testPath),
      publicExists: checkPathExists(path.join(publicDir, testPath)),
      publicFiles: listFiles(path.join(publicDir, testPath)),
      externalPath: path.join(externalDir, testPath),
      externalExists: checkPathExists(path.join(externalDir, testPath)),
      externalFiles: listFiles(path.join(externalDir, testPath)),
    };
    
    return NextResponse.json(debugResults);
  } catch (error) {
    console.error("Error in debug API route:", error);
    return NextResponse.json({ error: "Internal Server Error", details: String(error) }, { status: 500 });
  }
} 
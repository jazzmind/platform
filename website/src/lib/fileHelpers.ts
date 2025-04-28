import fs from 'fs/promises';
import path from 'path';

/**
 * Reads file content from the given path, trying both public and legacy locations
 * @param filePath - Relative path to the file (e.g. "technical/ai-meetup/presentation.md")
 * @returns The file content as a string, or null if the file doesn't exist
 */
export async function readFileContent(filePath: string): Promise<string | null> {
  try {
    // First try to read from public directory
    const publicDirPath = path.join(process.cwd(), 'public', filePath);
    try {
      return await fs.readFile(publicDirPath, 'utf-8');
    } catch {
      console.log(`File not found in public dir: ${publicDirPath}, trying legacy location`);
      
      // If not found in public dir, try the legacy location
      try {
        const legacyPath = path.join(process.cwd(), '..', filePath);
        return await fs.readFile(legacyPath, 'utf-8');
      } catch {
        console.error(`File not found at path: ${filePath} in either location`);
        return null;
      }
    }
  } catch (error) {
    console.error('Error reading file:', error);
    return null;
  }
}

/**
 * Checks if a file exists at the given path
 * @param filePath - Relative path to the file
 * @returns Boolean indicating if the file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    // First check in public directory
    const publicDirPath = path.join(process.cwd(), 'public', filePath);
    try {
      await fs.access(publicDirPath);
      return true;
    } catch {
      // If not found in public dir, try the legacy location
      try {
        const legacyPath = path.join(process.cwd(), '..', filePath);
        await fs.access(legacyPath);
        return true;
      } catch {
        return false;
      }
    }
  } catch {
    return false;
  }
}

/**
 * Lists files in a directory
 * @param dirPath - Relative path to the directory
 * @returns Array of filenames in the directory
 */
export async function listFiles(dirPath: string): Promise<string[]> {
  try {
    // First check in public directory
    const publicDirPath = path.join(process.cwd(), 'public', dirPath);
    try {
      const files = await fs.readdir(publicDirPath, { withFileTypes: true });
      return files
        .filter(dirent => dirent.isFile())
        .map(dirent => dirent.name);
    } catch {
      // If not found in public dir, try the legacy location
      try {
        const legacyPath = path.join(process.cwd(), '..', dirPath);
        const files = await fs.readdir(legacyPath, { withFileTypes: true });
        return files
          .filter(dirent => dirent.isFile())
          .map(dirent => dirent.name);
      } catch {
        console.error(`Directory not found: ${dirPath}`);
        return [];
      }
    }
  } catch (error) {
    console.error(`Error listing files in ${dirPath}:`, error);
    return [];
  }
}

/**
 * Gets the appropriate content type based on file extension
 * @param filePath - Path to the file
 * @returns The content type string
 */
export function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case ".html": return "text/html";
    case ".css": return "text/css";
    case ".js": return "application/javascript";
    case ".json": return "application/json";
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".gif": return "image/gif";
    case ".svg": return "image/svg+xml";
    case ".pdf": return "application/pdf";
    case ".pptx": return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case ".md": return "text/markdown";
    case ".txt": return "text/plain";
    default: return "application/octet-stream";
  }
} 
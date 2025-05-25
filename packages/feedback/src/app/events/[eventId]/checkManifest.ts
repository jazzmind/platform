import fs from 'fs';
import path from 'path';

/**
 * Checks if an event has files directory with a manifest.json
 * @param eventId The ID of the event
 * @returns Boolean indicating whether the event has a manifest.json
 */
export function checkEventManifest(eventId: string): boolean {
  try {
    const filesDirectory = path.join(process.cwd(), 'src/data/events', eventId, 'files');
    const manifestPath = path.join(filesDirectory, 'manifest.json');
    
    return fs.existsSync(filesDirectory) && fs.existsSync(manifestPath);
  } catch (error) {
    console.error(`Error checking manifest: ${error}`);
    return false;
  }
} 
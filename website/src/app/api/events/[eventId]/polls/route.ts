import { NextRequest, NextResponse } from 'next/server';
import { put, list, del } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface RequestBody {
  email: string;
  responses: Record<string, string>;
  isUpdate?: boolean;
}

const LOCK_TIMEOUT = 30000; // 30 seconds timeout for locks

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body: RequestBody = await request.json();
    const { email, responses, isUpdate } = body;

    // Validate the required fields
    if (!eventId || !email || !responses) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Validate email format
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
    }

    // Get the event data to verify that the event exists and to get the datahash
    const eventsDirectory = path.join(process.cwd(), "src/data/events");
    const eventPath = path.join(eventsDirectory, `${eventId}.json`);

    if (!fs.existsSync(eventPath)) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    const { datahash } = eventData.private;

    // Implement file locking with a timeout to prevent concurrent writes
    const lockId = crypto.randomBytes(8).toString('hex');
    const lockFileName = `${eventId}-${datahash}-polls.lock`;
    const csvFileName = `${eventId}-${datahash}-polls.csv`;
    
    // Try to create a lock
    const lockBlob = await acquireLock(lockFileName, lockId);
    if (!lockBlob) {
      return NextResponse.json({ message: 'Service is busy, please try again later' }, { status: 429 });
    }
    
    try {
      // Format data as CSV row
      const timestamp = new Date().toISOString();
      
      // Get existing data or create a new CSV file
      let csvContent = '';
      const existingBlobs = await list({ prefix: csvFileName });
      
      if (existingBlobs.blobs.length > 0) {
        // Get the existing CSV file
        const existingBlobUrl = existingBlobs.blobs[0].url;
        const response = await fetch(existingBlobUrl);
        csvContent = await response.text();
      }
      
      if (csvContent === '') {
        // Create header row for a new CSV file
        const headerRow = ['email', 'timestamp', ...Object.keys(responses)];
        csvContent = headerRow.join(',') + '\n';
      } else if (isUpdate) {
        // If this is an update, remove the previous entry for this email
        const rows = csvContent.trim().split('\n');
        const headerRow = rows[0];
        const emailColumnIndex = headerRow.split(',').findIndex(col => col.trim() === 'email');
        
        if (emailColumnIndex === -1) {
          throw new Error('Invalid CSV format: email column not found');
        }
        
        // Filter out the row with the matching email
        const newRows = rows.filter(row => {
          const columns = parseCSVRow(row);
          return columns[emailColumnIndex].toLowerCase() !== email.toLowerCase();
        });
        
        csvContent = newRows.join('\n') + '\n';
      }
      
      // Create a new row with the response data
      const responseRow = [
        email,
        timestamp,
        ...Object.values(responses)
      ].map(value => `"${value.toString().replace(/"/g, '""')}"`).join(',');
      
      // Append the new row to the CSV content
      csvContent += responseRow + '\n';
      
      // Upload the updated CSV to the blob store
      await put(csvFileName, csvContent, {
        contentType: 'text/csv',
        access: 'public',
      });
      
      return NextResponse.json({ 
        message: isUpdate ? 'Poll responses updated successfully' : 'Poll responses saved successfully' 
      }, { status: 200 });
    } finally {
      // Release the lock
      await releaseLock(lockFileName, lockId);
    }
  } catch (error) {
    console.error('Error saving poll responses:', error);
    return NextResponse.json({ message: 'An error occurred while saving responses' }, { status: 500 });
  }
}

// Helper function to parse CSV rows (handles quoted values)
function parseCSVRow(row: string): string[] {
  const result = [];
  let inQuotes = false;
  let currentValue = '';
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      // Toggle quote state
      inQuotes = !inQuotes;
      
      // Handle escaped quotes (two double quotes in a row)
      if (i < row.length - 1 && row[i + 1] === '"') {
        currentValue += '"';
        i++; // Skip the next quote
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(currentValue);
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  
  // Add the last field
  result.push(currentValue);
  return result;
}

// Helper function to get event data if it exists
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const datahash = searchParams.get('datahash');

    if (!datahash) {
      return NextResponse.json({ message: 'Missing datahash parameter' }, { status: 400 });
    }

    // Get the event data to verify the datahash
    const eventsDirectory = path.join(process.cwd(), "src/data/events");
    const eventPath = path.join(eventsDirectory, `${eventId}.json`);

    if (!fs.existsSync(eventPath)) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    const correctHash = eventData.private.datahash;

    // Verify the datahash is correct
    if (datahash !== correctHash) {
      return NextResponse.json({ message: 'Invalid datahash' }, { status: 403 });
    }

    // If the hash is correct, return the CSV file
    const csvFileName = `${eventId}-${datahash}-polls.csv`;
    const existingBlobs = await list({ prefix: csvFileName });

    if (existingBlobs.blobs.length === 0) {
      return NextResponse.json({ message: 'No data available yet' }, { status: 404 });
    }

    // Return the CSV file with proper headers
    const csvUrl = existingBlobs.blobs[0].url;
    const response = await fetch(csvUrl);
    const csvContent = await response.text();

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=${csvFileName}`
      }
    });
  } catch (error) {
    console.error('Error retrieving poll responses:', error);
    return NextResponse.json({ message: 'An error occurred while retrieving data' }, { status: 500 });
  }
}

// Lock management functions
async function acquireLock(lockFileName: string, lockId: string): Promise<boolean> {
  try {
    // Check if lock exists
    const existingLocks = await list({ prefix: lockFileName });
    
    if (existingLocks.blobs.length > 0) {
      const existingLock = existingLocks.blobs[0];
      const lockCreationTime = new Date(existingLock.uploadedAt).getTime();
      const currentTime = Date.now();
      
      // If the lock is older than LOCK_TIMEOUT, it's stale and can be removed
      if (currentTime - lockCreationTime > LOCK_TIMEOUT) {
        await del(existingLock.url);
      } else {
        // Lock is still active
        return false;
      }
    }
    
    // Create a new lock
    await put(lockFileName, lockId, {
      contentType: 'text/plain',
      access: 'public',
    });
    
    return true;
  } catch (error) {
    console.error('Error acquiring lock:', error);
    return false;
  }
}

async function releaseLock(lockFileName: string, lockId: string): Promise<boolean> {
  try {
    const existingLocks = await list({ prefix: lockFileName });
    
    if (existingLocks.blobs.length > 0) {
      const existingLock = existingLocks.blobs[0];
      const response = await fetch(existingLock.url);
      const existingLockId = await response.text();
      
      // Only delete the lock if it's the one we created
      if (existingLockId === lockId) {
        await del(existingLock.url);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error releasing lock:', error);
    return false;
  }
} 
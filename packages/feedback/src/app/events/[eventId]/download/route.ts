import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

// Poll question type definition
interface PollQuestion {
  [key: string]: string[];
}

// This route handles direct downloads using the datahash as a secure parameter
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const datahash = searchParams.get('datahash');

    // Validate the parameters
    if (!eventId || !datahash) {
      return NextResponse.json({ message: 'Missing required parameters' }, { status: 400 });
    }

    // Get the event data to verify the datahash
    const eventsDirectory = path.join(process.cwd(), "src/data/events");
    const eventPath = path.join(eventsDirectory, `${eventId}.json`);

    if (!fs.existsSync(eventPath)) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    const correctHash = eventData.private.datahash;

    // Verify the datahash is correct for security
    if (datahash !== correctHash) {
      return NextResponse.json({ message: 'Invalid access token' }, { status: 403 });
    }

    // Get the CSV file from Vercel Blob storage
    const csvFileName = `${eventId}-${datahash}-polls.csv`;
    const existingBlobs = await list({ prefix: csvFileName });

    if (existingBlobs.blobs.length === 0) {
      // No data available yet, create an empty CSV with headers based on poll questions
      const headerRow = ['email', 'timestamp'];
      
      // Add poll question headers if available
      if (eventData.private && eventData.private.polls) {
        eventData.private.polls.forEach((poll: PollQuestion) => {
          const questionName = Object.keys(poll)[0];
          headerRow.push(questionName);
        });
      }
      
      const emptyCSV = headerRow.join(',') + '\n';
      
      return new NextResponse(emptyCSV, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=${csvFileName}`
        }
      });
    }

    // Return the CSV file with proper headers for download
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
    console.error('Error downloading event data:', error);
    return NextResponse.json({ message: 'An error occurred while retrieving data' }, { status: 500 });
  }
} 
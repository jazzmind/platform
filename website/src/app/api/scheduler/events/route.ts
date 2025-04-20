import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';
import crypto from 'crypto';
import { SchedulerEvent } from '@/models/scheduler';

// Validate environment variable for access code
const SCHEDULER_ACCESS_CODE = process.env.SCHEDULER_ACCESS_CODE;
if (!SCHEDULER_ACCESS_CODE) {
  console.warn('SCHEDULER_ACCESS_CODE environment variable is not set');
}

export async function POST(request: NextRequest) {
  try {
    // Extract and validate the request body
    const body = await request.json();
    const { 
      title, 
      objective, 
      timePreferences, 
      duration, 
      frequency, 
      dateRangeStart, 
      dateRangeEnd, 
      accessCode,
      createdBy
    } = body;

    // Validate the required fields
    if (!title || !objective || !timePreferences || !duration || !frequency || 
        !dateRangeStart || !dateRangeEnd || !accessCode || !createdBy) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Validate access code against environment variable
    if (accessCode !== SCHEDULER_ACCESS_CODE) {
      return NextResponse.json({ message: 'Invalid access code' }, { status: 403 });
    }

    // Validate date range
    const startDate = new Date(dateRangeStart);
    const endDate = new Date(dateRangeEnd);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate >= endDate) {
      return NextResponse.json({ message: 'Invalid date range' }, { status: 400 });
    }

    // Validate email format for createdBy
    if (!/^\S+@\S+\.\S+$/.test(createdBy)) {
      return NextResponse.json({ message: 'Invalid email format for createdBy' }, { status: 400 });
    }

    // Generate a unique ID for the event
    const eventId = crypto.randomBytes(8).toString('hex');
    const datahash = crypto.randomBytes(8).toString('hex');

    // Create a scheduler event object
    const schedulerEvent: SchedulerEvent = {
      id: eventId,
      title,
      objective,
      timePreferences,
      duration,
      frequency,
      dateRangeStart,
      dateRangeEnd,
      createdAt: new Date().toISOString(),
      createdBy
    };

    // Store the event in blob storage
    const eventFileName = `scheduler-event-${eventId}.json`;
    await put(eventFileName, JSON.stringify(schedulerEvent), {
      contentType: 'application/json',
      access: 'public',
      addRandomSuffix: false,
    });

    // Create a metadata file that includes the datahash for security
    const metadataFileName = `scheduler-metadata-${eventId}.json`;
    const metadata = {
      eventId,
      datahash,
      createdAt: schedulerEvent.createdAt
    };

    await put(metadataFileName, JSON.stringify(metadata), {
      contentType: 'application/json',
      access: 'public',
      addRandomSuffix: false,
    });

    return NextResponse.json({ 
      message: 'Event created successfully',
      eventId,
      shareUrl: `/scheduler/${eventId}` 
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating scheduler event:', error);
    return NextResponse.json({ message: 'An error occurred while creating the event' }, { status: 500 });
  }
}

// Get all scheduler events (for admin purposes, requires access code)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accessCode = searchParams.get('accessCode');

    // Validate access code
    if (!accessCode || accessCode !== SCHEDULER_ACCESS_CODE) {
      return NextResponse.json({ message: 'Invalid access code' }, { status: 403 });
    }

    // List all scheduler events from blob storage
    const blobs = await list({ prefix: 'scheduler-event-' });
    
    // If no events are found, return an empty array
    if (blobs.blobs.length === 0) {
      return NextResponse.json({ events: [] }, { status: 200 });
    }

    // Fetch and parse each event
    const eventsPromises = blobs.blobs.map(async (blob) => {
      const response = await fetch(blob.url);
      return await response.json() as SchedulerEvent;
    });

    const events = await Promise.all(eventsPromises);

    // Sort events by creation date (newest first)
    events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ events }, { status: 200 });

  } catch (error) {
    console.error('Error fetching scheduler events:', error);
    return NextResponse.json({ message: 'An error occurred while fetching events' }, { status: 500 });
  }
} 
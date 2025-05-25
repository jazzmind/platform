import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface CollaboratorInfo {
  name: string;
  email: string;
  timestamp: string;
}

interface CollaborationRequest {
  name: string;
  email: string;
  eventCode: string;
}

// Handles collaboration authentication
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body: CollaborationRequest = await request.json();
    const { name, email, eventCode } = body;

    // Validate the required fields
    if (!eventId || !name || !email || !eventCode) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Validate email format
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
    }

    // Get the event data to verify the event code
    const eventsDirectory = path.join(process.cwd(), "src/data/events", eventId);
    const eventPath = path.join(eventsDirectory, "event.json");

    if (!fs.existsSync(eventPath)) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    
    // Verify the event code matches
    if (eventData.private.code !== eventCode) {
      return NextResponse.json({ message: 'Invalid event code' }, { status: 403 });
    }

    // Create a unique collaborator ID
    const collaboratorId = crypto.randomBytes(16).toString('hex');
    
    // Store collaborator info in Vercel Blob
    const collaboratorInfo: CollaboratorInfo = {
      name,
      email,
      timestamp: new Date().toISOString()
    };
    
    // Save collaborator data
    const collaboratorFileName = `${eventId}-collaborator-${collaboratorId}.json`;
    await put(collaboratorFileName, JSON.stringify(collaboratorInfo), {
      contentType: 'application/json',
      access: 'public',
      addRandomSuffix: false,
    });
    
    // Create response with cookie
    const response = NextResponse.json({ 
      message: 'Collaboration session started',
      collaboratorId
    }, { status: 200 });
    
    // Set the cookie on the response
    response.cookies.set('collaborator_id', collaboratorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Error starting collaboration session:', error);
    return NextResponse.json({ message: 'An error occurred while starting collaboration' }, { status: 500 });
  }
}

// Check if user is authenticated for collaboration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const collaboratorId = request.cookies.get('collaborator_id')?.value;
    if (!collaboratorId) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }
    
    // Verify collaborator exists
    const collaboratorFileName = `${eventId}-collaborator-${collaboratorId}.json`;
    const existingBlobs = await list({ prefix: collaboratorFileName });
    if (existingBlobs.blobs.length === 0) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }
    
    // Get collaborator info
    const blobUrl = existingBlobs.blobs[0].url;
    const response = await fetch(blobUrl);
    if (!response.ok) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }
    
    const collaboratorInfo = await response.json();
    
    return NextResponse.json({ 
      authenticated: true,
      user: {
        id: collaboratorId,
        name: collaboratorInfo.name,
        email: collaboratorInfo.email
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error checking collaboration session:', error);
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
} 
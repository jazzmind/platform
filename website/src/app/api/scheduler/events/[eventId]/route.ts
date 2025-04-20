import { NextRequest, NextResponse } from 'next/server';
import { put, list, del } from '@vercel/blob';
import { SchedulerEvent, UserAvailability } from '@/models/scheduler';
import crypto from 'crypto';

// Lock timeout for concurrent operations
const LOCK_TIMEOUT = 30000; // 30 seconds

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    
    // Fetch the event data
    const eventFileName = `scheduler-event-${eventId}.json`;
    const existingBlobs = await list({ prefix: eventFileName });
    
    if (existingBlobs.blobs.length === 0) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }
    
    // Get the event data
    const response = await fetch(existingBlobs.blobs[0].url);
    const event = await response.json() as SchedulerEvent;
    
    // Remove the createdBy email for privacy
    const publicEvent = {
      ...event,
      createdBy: event.createdBy.split('@')[0] // Only share the username part
    };
    
    return NextResponse.json({ event: publicEvent }, { status: 200 });
  } catch (error) {
    console.error('Error fetching scheduler event:', error);
    return NextResponse.json({ message: 'An error occurred while fetching the event' }, { status: 500 });
  }
}

// Submit availability for a specific event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();
    const { email, availableDates, calendarProvider } = body;
    
    // Validate required fields
    if (!email || !availableDates || availableDates.length === 0) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate email format
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
    }
    
    // Check if the event exists
    const eventFileName = `scheduler-event-${eventId}.json`;
    const existingEventBlobs = await list({ prefix: eventFileName });
    
    if (existingEventBlobs.blobs.length === 0) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }
    
    // Generate a unique user ID
    const userId = crypto.randomBytes(8).toString('hex');
    
    // Prepare user availability data
    const userAvailability: UserAvailability = {
      eventId,
      userId,
      email,
      availableDates
    };
    
    // Implement file locking to prevent concurrent writes
    const lockId = crypto.randomBytes(8).toString('hex');
    const lockFileName = `scheduler-lock-${eventId}.json`;
    const availabilityFileName = `scheduler-availability-${eventId}.json`;
    
    // Try to acquire a lock
    const lockAcquired = await acquireLock(lockFileName, lockId);
    if (!lockAcquired) {
      return NextResponse.json({ message: 'Service is busy, please try again later' }, { status: 429 });
    }
    
    try {
      // Check if availability data file exists
      let availabilityData: UserAvailability[] = [];
      const existingAvailabilityBlobs = await list({ prefix: availabilityFileName });
      
      if (existingAvailabilityBlobs.blobs.length > 0) {
        // Get existing availability data
        const availabilityResponse = await fetch(existingAvailabilityBlobs.blobs[0].url);
        availabilityData = await availabilityResponse.json();
      }
      
      // Check if this email already submitted availability
      const existingIndex = availabilityData.findIndex(a => a.email.toLowerCase() === email.toLowerCase());
      
      if (existingIndex >= 0) {
        // Update existing availability
        availabilityData[existingIndex] = {
          ...availabilityData[existingIndex],
          availableDates
        };
      } else {
        // Add new availability
        availabilityData.push(userAvailability);
      }
      
      // Save the updated availability data
      await put(availabilityFileName, JSON.stringify(availabilityData), {
        contentType: 'application/json',
        access: 'public',
        addRandomSuffix: false,
      });
      
      // If calendar provider info was submitted, store that as well
      if (calendarProvider) {
        const connectionFileName = `scheduler-connection-${eventId}-${userId}.json`;
        await put(connectionFileName, JSON.stringify({
          userId,
          email,
          provider: calendarProvider.provider,
          accessToken: calendarProvider.accessToken,
          refreshToken: calendarProvider.refreshToken,
          expiresAt: calendarProvider.expiresAt,
          providerId: calendarProvider.providerId
        }), {
          contentType: 'application/json',
          access: 'public',
          addRandomSuffix: false,
        });
      }
      
      return NextResponse.json({ 
        message: existingIndex >= 0 ? 'Availability updated successfully' : 'Availability saved successfully',
        userId
      }, { status: 200 });
    } finally {
      // Release the lock
      await releaseLock(lockFileName, lockId);
    }
  } catch (error) {
    console.error('Error saving availability:', error);
    return NextResponse.json({ message: 'An error occurred while saving availability' }, { status: 500 });
  }
}

// Helper functions for lock management
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
      addRandomSuffix: false,
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
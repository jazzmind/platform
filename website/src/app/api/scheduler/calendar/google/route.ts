import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Validate required parameters
    if (!eventId || !userId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Retrieve the connection data
    const connectionFileName = `scheduler-connection-${eventId}-${userId}.json`;
    const connectionBlobs = await list({ prefix: connectionFileName });
    
    if (connectionBlobs.blobs.length === 0) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }
    
    const connectionResponse = await fetch(connectionBlobs.blobs[0].url);
    const connectionData = await connectionResponse.json();
    
    // Check if the token is expired
    if (connectionData.expiresAt < Date.now()) {
      // Token is expired, refresh it
      if (!connectionData.refreshToken) {
        return NextResponse.json(
          { error: 'No refresh token available' },
          { status: 401 }
        );
      }
      
      // Refresh the token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID || '',
          client_secret: GOOGLE_CLIENT_SECRET || '',
          refresh_token: connectionData.refreshToken,
          grant_type: 'refresh_token',
        }),
      });
      
      const refreshData = await refreshResponse.json();
      
      if (!refreshResponse.ok) {
        console.error('Error refreshing token:', refreshData);
        return NextResponse.json(
          { error: 'Failed to refresh token' },
          { status: 401 }
        );
      }
      
      // Update the token in the connection data
      connectionData.accessToken = refreshData.access_token;
      connectionData.expiresAt = Date.now() + (refreshData.expires_in * 1000);
    }
    
    // Query the Google Calendar API for events
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${encodeURIComponent(startDate)}T00:00:00Z&` +
      `timeMax=${encodeURIComponent(endDate)}T23:59:59Z&` +
      `singleEvents=true&orderBy=startTime`, {
      headers: {
        Authorization: `Bearer ${connectionData.accessToken}`,
      },
    });
    
    const calendarData = await calendarResponse.json();
    
    if (!calendarResponse.ok) {
      console.error('Error fetching calendar events:', calendarData);
      return NextResponse.json(
        { error: 'Failed to fetch calendar events' },
        { status: 500 }
      );
    }
    
    // Transform the events into a simplified format for the client
    interface GoogleCalendarEvent {
      id: string;
      summary?: string;
      start: {
        dateTime?: string;
        date?: string;
      };
      end: {
        dateTime?: string;
        date?: string;
      };
    }

    const events = calendarData.items.map((event: GoogleCalendarEvent) => ({
      id: event.id,
      summary: event.summary || 'Busy',
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      allDay: !event.start.dateTime,
    }));
    
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching calendar events' },
      { status: 500 }
    );
  }
} 
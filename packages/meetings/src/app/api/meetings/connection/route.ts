import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    const userId = searchParams.get('userId');
    
    // Validate required parameters
    if (!eventId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Retrieve the connection data
    const connectionFileName = `meetings-connection-${eventId}-${userId}.json`;
    const connectionBlobs = await list({ prefix: connectionFileName });
    
    if (connectionBlobs.blobs.length === 0) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }
    
    const connectionResponse = await fetch(connectionBlobs.blobs[0].url);
    const connectionData = await connectionResponse.json();
    
    // Return only necessary data to client
    return NextResponse.json({
      email: connectionData.email,
      provider: connectionData.provider,
      providerId: connectionData.providerId
    });
  } catch (error) {
    console.error('Error fetching connection data:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching connection data' },
      { status: 500 }
    );
  }
} 
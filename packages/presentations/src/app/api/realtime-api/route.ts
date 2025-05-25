import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the session description protocol (SDP) from the request body
    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('application/sdp')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/sdp' },
        { status: 400 }
      );
    }
    
    // Get the model from query params, default to gpt-4o-mini-realtime-preview
    const searchParams = request.nextUrl.searchParams;
    const model = searchParams.get('model') || 'gpt-4o-mini-realtime-preview';
    
    // Get SDP from request body
    const sdp = await request.text();
    
    // Forward the SDP offer to OpenAI's Realtime API
    const realtimeResponse = await fetch(`https://api.openai.com/v1/realtime?model=${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/sdp',
      },
      body: sdp,
    });
    
    if (!realtimeResponse.ok) {
      const errorText = await realtimeResponse.text();
      console.error('OpenAI Realtime API error:', errorText);
      return NextResponse.json(
        { error: `Failed to establish WebRTC connection: ${errorText}` },
        { status: realtimeResponse.status }
      );
    }
    
    // Return the SDP answer from OpenAI
    const answer = await realtimeResponse.text();
    
    return new NextResponse(answer, {
      headers: {
        'Content-Type': 'application/sdp',
      },
    });
  } catch (error) {
    console.error('Error handling WebRTC connection:', error);
    return NextResponse.json(
      { error: 'Failed to establish WebRTC connection' },
      { status: 500 }
    );
  }
} 
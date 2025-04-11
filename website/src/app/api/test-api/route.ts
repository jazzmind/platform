import { NextRequest, NextResponse } from 'next/server';

// Simple test endpoint to verify API calls work
export async function GET() {
  console.log('Test API called');
  return NextResponse.json({ message: 'API is working' });
}

export async function POST(request: NextRequest) {
  console.log('Test API POST called');
  try {
    const body = await request.json();
    console.log('Received data:', body);
    return NextResponse.json({ 
      message: 'Received your data',
      received: body
    });
  } catch (error) {
    console.error('Error in test API:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { put } from '@vercel/blob';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const REDIRECT_URI = `${SITE_URL}/api/auth/google/callback`;

// Scopes needed for calendar access
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'profile',
  'email'
].join(' ');

export async function GET(request: NextRequest) {
  try {
    // Get the eventId and email from query parameters
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    const email = searchParams.get('email');
    
    if (!eventId || !email) {
      return NextResponse.json(
        { error: 'Missing eventId or email parameter' },
        { status: 400 }
      );
    }
    
    // Generate a state parameter for security (CSRF protection)
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store the state, eventId, and email in Vercel Blob for verification during callback
    const stateData = {
      state,
      eventId,
      email,
      timestamp: Date.now()
    };
    
    // Store state with an expiration (10 minutes)
    await put(`google-oauth-state-${state}.json`, JSON.stringify(stateData), {
      contentType: 'application/json',
      access: 'public',
      addRandomSuffix: false,
    });
    
    // Construct the authorization URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID || '');
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', SCOPES);
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    authUrl.searchParams.append('state', state);
    
    // Redirect the user to Google's authorization page
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Error initiating Google OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google authentication' },
      { status: 500 }
    );
  }
} 
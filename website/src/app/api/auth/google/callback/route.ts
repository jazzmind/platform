import { NextRequest, NextResponse } from 'next/server';
import { list, put, del } from '@vercel/blob';
import crypto from 'crypto';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const REDIRECT_URI = `${SITE_URL}/api/auth/google/callback`;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Handle error from Google OAuth
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(`${SITE_URL}/scheduler/auth-error?error=${encodeURIComponent(error)}`);
    }
    
    // Check if we have all required parameters
    if (!code || !state) {
      return NextResponse.redirect(`${SITE_URL}/scheduler/auth-error?error=missing_parameters`);
    }
    
    // Retrieve state data from blob storage
    const stateBlobs = await list({ prefix: `google-oauth-state-${state}` });
    
    if (stateBlobs.blobs.length === 0) {
      return NextResponse.redirect(`${SITE_URL}/scheduler/auth-error?error=invalid_state`);
    }
    
    const stateBlob = stateBlobs.blobs[0];
    const stateResponse = await fetch(stateBlob.url);
    const stateData = await stateResponse.json();
    
    // Check if state is expired (10 minutes)
    const stateAge = Date.now() - stateData.timestamp;
    if (stateAge > 10 * 60 * 1000) {
      await del(stateBlob.url);
      return NextResponse.redirect(`${SITE_URL}/scheduler/auth-error?error=expired_state`);
    }
    
    // Extract the eventId and email from state data
    const { eventId, email } = stateData;
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID || '',
        client_secret: GOOGLE_CLIENT_SECRET || '',
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.error('Error exchanging code for tokens:', tokenData);
      return NextResponse.redirect(`${SITE_URL}/scheduler/auth-error?error=token_exchange_failed`);
    }
    
    // Get user information from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    
    const userInfo = await userInfoResponse.json();
    
    if (!userInfoResponse.ok) {
      console.error('Error fetching user info:', userInfo);
      return NextResponse.redirect(`${SITE_URL}/scheduler/auth-error?error=user_info_failed`);
    }
    
    // Verify that the email matches
    if (userInfo.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.redirect(`${SITE_URL}/scheduler/auth-error?error=email_mismatch`);
    }
    
    // Generate a unique user ID
    const userId = crypto.randomBytes(8).toString('hex');
    
    // Store the connection information
    const connectionData = {
      userId,
      email: userInfo.email,
      provider: 'google',
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
      providerId: userInfo.id
    };
    
    const connectionFileName = `scheduler-connection-${eventId}-${userId}.json`;
    await put(connectionFileName, JSON.stringify(connectionData), {
      contentType: 'application/json',
      access: 'public',
      addRandomSuffix: false,
    });
    
    // Clean up the state blob
    await del(stateBlob.url);
    
    // Redirect back to the scheduler page with success message
    return NextResponse.redirect(`${SITE_URL}/scheduler/${eventId}?auth=success&provider=google&userId=${userId}`);
  } catch (error) {
    console.error('Error handling Google OAuth callback:', error);
    return NextResponse.redirect(`${SITE_URL}/scheduler/auth-error?error=server_error`);
  }
} 
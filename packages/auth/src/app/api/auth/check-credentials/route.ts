import { NextResponse } from 'next/server';

// Helper function to validate Google OAuth credentials
async function validateGoogleCredentials(clientId: string, clientSecret: string): Promise<{ isValid: boolean; error?: string }> {
  try {
    // Test Google OAuth by making a request to the discovery endpoint
    const response = await fetch('https://accounts.google.com/.well-known/openid_configuration');
    if (!response.ok) return { isValid: false, error: 'Unable to reach Google OAuth endpoints' };
    
    // Additional validation: check if client_id format is valid
    if (!clientId || !clientSecret) return { isValid: false, error: 'Missing client ID or secret' };
    if (!clientId.includes('.apps.googleusercontent.com')) return { isValid: false, error: 'Invalid Google client ID format (should end with .apps.googleusercontent.com)' };
    
    return { isValid: true };
  } catch (error) {
    console.error('Google validation error:', error);
    return { isValid: false, error: 'Network error while validating Google credentials' };
  }
}

// Helper function to validate Microsoft credentials
async function validateMicrosoftCredentials(clientId: string, clientSecret: string, issuer: string): Promise<{ isValid: boolean; error?: string }> {
  try {
    // Test Microsoft OAuth by making a request to the discovery endpoint
    const response = await fetch(`${issuer}/.well-known/openid_configuration`);
    if (!response.ok) return { isValid: false, error: 'Unable to reach Microsoft OAuth endpoints with provided issuer' };
    
    // Additional validation: check if client_id is a valid GUID format
    if (!clientId || !clientSecret || !issuer) return { isValid: false, error: 'Missing client ID, secret, or issuer' };
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(clientId)) return { isValid: false, error: 'Invalid Microsoft client ID format (should be a GUID)' };
    
    return { isValid: true };
  } catch (error) {
    console.error('Microsoft validation error:', error);
    return { isValid: false, error: 'Network error while validating Microsoft credentials' };
  }
}

// Helper function to validate Apple credentials
async function validateAppleCredentials(appleId: string, appleSecret: string): Promise<{ isValid: boolean; error?: string }> {
  try {
    // For Apple, we can validate the format since it uses JWT
    if (!appleId || !appleSecret) return { isValid: false, error: 'Missing Apple ID or secret' };
    
    // Apple ID should be in reverse domain format
    if (!appleId.includes('.')) return { isValid: false, error: 'Invalid Apple ID format (should be in reverse domain format)' };
    
    // Apple secret should be a JWT-like format or at least a reasonable length
    if (appleSecret.length < 32) return { isValid: false, error: 'Apple secret too short (should be a JWT token)' };
    
    return { isValid: true };
  } catch (error) {
    console.error('Apple validation error:', error);
    return { isValid: false, error: 'Error while validating Apple credentials' };
  }
}

export async function GET() {
  try {
    // Check and validate Google credentials
    const googleCredentials = {
      hasCredentials: !!(
        process.env.GOOGLE_CLIENT_ID && 
        process.env.GOOGLE_CLIENT_SECRET
      ),
      clientId: !!process.env.GOOGLE_CLIENT_ID,
      clientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      isValid: false,
      error: undefined as string | undefined,
    };
    
    if (googleCredentials.hasCredentials) {
      const validation = await validateGoogleCredentials(
        process.env.GOOGLE_CLIENT_ID!,
        process.env.GOOGLE_CLIENT_SECRET!
      );
      googleCredentials.isValid = validation.isValid;
      googleCredentials.error = validation.error;
    }

    // Check and validate Microsoft credentials
    const microsoftCredentials = {
      hasCredentials: !!(
        process.env.MICROSOFT_ENTRA_ID_CLIENT_ID && 
        process.env.MICROSOFT_ENTRA_ID_CLIENT_SECRET && 
        process.env.MICROSOFT_ENTRA_ID_ISSUER
      ),
      clientId: !!process.env.MICROSOFT_ENTRA_ID_CLIENT_ID,
      clientSecret: !!process.env.MICROSOFT_ENTRA_ID_CLIENT_SECRET,
      issuer: !!process.env.MICROSOFT_ENTRA_ID_ISSUER,
      isValid: false,
      error: undefined as string | undefined,
    };
    
    if (microsoftCredentials.hasCredentials) {
      const validation = await validateMicrosoftCredentials(
        process.env.MICROSOFT_ENTRA_ID_CLIENT_ID!,
        process.env.MICROSOFT_ENTRA_ID_CLIENT_SECRET!,
        process.env.MICROSOFT_ENTRA_ID_ISSUER!
      );
      microsoftCredentials.isValid = validation.isValid;
      microsoftCredentials.error = validation.error;
    }

    // Check and validate Apple credentials
    const appleCredentials = {
      hasCredentials: !!(
        process.env.APPLE_ID && 
        process.env.APPLE_SECRET
      ),
      appleId: !!process.env.APPLE_ID,
      appleSecret: !!process.env.APPLE_SECRET,
      isValid: false,
      error: undefined as string | undefined,
    };
    
    if (appleCredentials.hasCredentials) {
      const validation = await validateAppleCredentials(
        process.env.APPLE_ID!,
        process.env.APPLE_SECRET!
      );
      appleCredentials.isValid = validation.isValid;
      appleCredentials.error = validation.error;
    }

    return NextResponse.json({
      google: googleCredentials,
      microsoft: microsoftCredentials,
      apple: appleCredentials,
    });
  } catch (error) {
    console.error('Error checking credentials:', error);
    return NextResponse.json(
      { error: 'Failed to check credentials' },
      { status: 500 }
    );
  }
} 
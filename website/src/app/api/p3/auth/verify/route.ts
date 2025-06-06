import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { SignJWT } from 'jose';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

// Send verification email (in production, use a real email service)
async function sendVerificationEmail(email: string, token: string) {
  // TODO: Integrate with email service (SendGrid, etc.)
  console.log(`Send verification email to ${email} with token: ${token}`);
  console.log(`Verification link: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/p3/auth/verify?token=${token}`);
}

// Send magic link email
async function sendMagicLinkEmail(email: string, token: string) {
  // TODO: Integrate with email service
  console.log(`Send magic link to ${email} with token: ${token}`);
  console.log(`Magic link: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/p3/auth/verify?token=${token}`);
}

// POST: Request verification or magic link
export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    // Validate email domain
    if (!email.endsWith('@practera.com')) {
      return NextResponse.json(
        { error: 'Only @practera.com email addresses are allowed' },
        { status: 400 }
      );
    }

    // Check if collaborator exists
    let collaborator = await prisma.p3Collaborator.findUnique({
      where: { email }
    });

    if (!collaborator) {
      // Create new collaborator
      const verificationToken = randomBytes(32).toString('hex');
      
      collaborator = await prisma.p3Collaborator.create({
        data: {
          email,
          name: name || email.split('@')[0],
          verificationToken
        }
      });

      // Send verification email
      await sendVerificationEmail(email, verificationToken);

      return NextResponse.json({
        message: 'Verification email sent. Please check your inbox.',
        requiresVerification: true
      });
    }

    if (!collaborator.verifiedAt) {
      // Resend verification email
      const verificationToken = randomBytes(32).toString('hex');
      
      await prisma.p3Collaborator.update({
        where: { id: collaborator.id },
        data: { verificationToken }
      });

      await sendVerificationEmail(email, verificationToken);

      return NextResponse.json({
        message: 'Verification email sent. Please check your inbox.',
        requiresVerification: true
      });
    }

    // Send magic link for verified users
    const authToken = randomBytes(32).toString('hex');
    const authTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.p3Collaborator.update({
      where: { id: collaborator.id },
      data: {
        authToken,
        authTokenExpiry
      }
    });

    await sendMagicLinkEmail(email, authToken);

    return NextResponse.json({
      message: 'Magic link sent to your email. Please check your inbox.',
      requiresVerification: false
    });

  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// GET: Verify token and authenticate
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing verification token' },
        { status: 400 }
      );
    }

    // Check for verification token
    let collaborator = await prisma.p3Collaborator.findUnique({
      where: { verificationToken: token }
    });

    if (collaborator && !collaborator.verifiedAt) {
      // Verify the collaborator
      collaborator = await prisma.p3Collaborator.update({
        where: { id: collaborator.id },
        data: {
          verifiedAt: new Date(),
          verificationToken: null
        }
      });

      // Create auth token for immediate login
      const authToken = randomBytes(32).toString('hex');
      const authTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await prisma.p3Collaborator.update({
        where: { id: collaborator.id },
        data: {
          authToken,
          authTokenExpiry
        }
      });

      // Create JWT for session
      const jwt = await new SignJWT({ 
        collaboratorId: collaborator.id,
        email: collaborator.email,
        name: collaborator.name
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .sign(JWT_SECRET);

      const response = NextResponse.redirect(new URL('/p3', request.url));
      response.cookies.set('p3-auth', jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/'
      });

      return response;
    }

    // Check for magic link token
    collaborator = await prisma.p3Collaborator.findFirst({
      where: {
        authToken: token,
        authTokenExpiry: {
          gt: new Date()
        }
      }
    });

    if (collaborator) {
      // Clear the auth token (single use)
      await prisma.p3Collaborator.update({
        where: { id: collaborator.id },
        data: {
          authToken: null,
          authTokenExpiry: null
        }
      });

      // Create JWT for session
      const jwt = await new SignJWT({
        collaboratorId: collaborator.id,
        email: collaborator.email,
        name: collaborator.name
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .sign(JWT_SECRET);

      const response = NextResponse.redirect(new URL('/p3', request.url));
      response.cookies.set('p3-auth', jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/'
      });

      return response;
    }

    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
} 
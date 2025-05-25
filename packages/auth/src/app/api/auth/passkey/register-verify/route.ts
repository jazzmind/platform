import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient() as any; // Type assertion to bypass Prisma client type issues

// This should be your application's domain
const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
const origin = process.env.AUTH_URL || `http://${rpID}:3001`;

export async function POST(req: NextRequest) {
  try {
    // Verify the user is authenticated
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const userId = body.userId || session.user.id;
    const credential = body.credential;

    // Ensure the user can only register a passkey for themselves
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the challenge that was stored during the registration options request
    const challengeRecord = await prisma.passkeyChallenge.findUnique({
      where: { userId },
    });

    if (!challengeRecord) {
      return NextResponse.json(
        { error: 'Registration challenge not found. Please try again.' },
        { status: 400 }
      );
    }

    const challenge = challengeRecord.challenge;

    // Verify the registration response
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: 'Passkey verification failed' },
        { status: 400 }
      );
    }

    // Get the credential info
    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

    // Store the credential in the database
    await prisma.authenticator.create({
      data: {
        userId,
        credentialID: Buffer.from(credentialID),
        credentialPublicKey: Buffer.from(credentialPublicKey),
        counter,
        transports: credential.transports || [],
      },
    });

    // Clean up the challenge
    await prisma.passkeyChallenge.delete({
      where: { userId },
    });

    return NextResponse.json({ verified: true });
  } catch (error) {
    console.error('Error verifying passkey registration:', error);
    return NextResponse.json(
      { error: 'Failed to verify passkey registration' },
      { status: 500 }
    );
  }
} 
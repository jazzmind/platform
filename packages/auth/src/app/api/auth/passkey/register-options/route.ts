import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient() as any; // Type assertion to bypass Prisma client type issues

// This should be your application's domain
const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
const rpName = process.env.WEBAUTHN_RP_NAME || 'Auth Package';
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
    const email = body.email || session.user.email;
    const username = body.username || email || userId;

    // Ensure the user can only register a passkey for themselves
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get existing authenticators for this user
    const existingAuthenticators = await prisma.authenticator.findMany({
      where: {
        userId: userId,
      },
      select: {
        credentialID: true,
        credentialPublicKey: true,
        counter: true,
      },
    });

    // Format existing authenticators for registration options
    const userAuthenticators = existingAuthenticators.map((auth: {
      credentialID: Buffer;
      credentialPublicKey: Buffer;
      counter: bigint;
    }) => ({
      credentialID: new Uint8Array(auth.credentialID),
      credentialPublicKey: new Uint8Array(auth.credentialPublicKey),
      counter: auth.counter,
    }));

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: userId,
      userName: username,
      attestationType: 'none',
      authenticatorSelection: {
        userVerification: 'preferred',
        residentKey: 'required',
      },
      excludeCredentials: userAuthenticators.map((authenticator: {
        credentialID: Uint8Array;
      }) => ({
        id: authenticator.credentialID,
        type: 'public-key' as const,
      })),
    });

    // Store the challenge temporarily for verification
    await prisma.passkeyChallenge.upsert({
      where: { userId },
      update: {
        challenge: options.challenge,
        createdAt: new Date(),
      },
      create: {
        userId,
        challenge: options.challenge,
        createdAt: new Date(),
      },
    });

    return NextResponse.json({ publicKey: options });
  } catch (error) {
    console.error('Error generating registration options:', error);
    return NextResponse.json(
      { error: 'Failed to generate registration options' },
      { status: 500 }
    );
  }
} 
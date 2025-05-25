import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient() as any; // Type assertion to bypass Prisma client type issues

export async function POST(req: NextRequest) {
  try {
    // Verify the user is authenticated
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const userId = body.userId || session.user.id;

    // Ensure the user can only check their own passkey status
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all passkeys/authenticators for the user
    const authenticators = await prisma.authenticator.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format devices for the frontend
    const devices = authenticators.map((auth: any) => ({
      id: auth.credentialID,
      name: auth.name || `Device ${auth.credentialID.slice(0, 8)}...`,
      createdAt: auth.createdAt,
      lastUsed: auth.lastUsed,
    }));

    return NextResponse.json({ 
      hasPasskey: authenticators.length > 0,
      devices: devices
    });
  } catch (error) {
    console.error('Error checking passkey status:', error);
    return NextResponse.json(
      { error: 'Failed to check passkey status' },
      { status: 500 }
    );
  }
} 
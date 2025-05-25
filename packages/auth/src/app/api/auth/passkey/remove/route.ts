import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient() as any; // Type assertion to bypass Prisma client type issues

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, deviceId } = await request.json();

    if (!userId || !deviceId) {
      return NextResponse.json(
        { error: 'User ID and Device ID are required' },
        { status: 400 }
      );
    }

    // Ensure the user can only remove their own passkeys
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Remove the specific passkey device
    const deletedCredential = await prisma.authenticator.delete({
      where: {
        credentialID: deviceId,
        userId: userId,
      },
    });

    if (!deletedCredential) {
      return NextResponse.json(
        { error: 'Passkey device not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Passkey device removed successfully'
    });
  } catch (error) {
    console.error('Error removing passkey device:', error);
    return NextResponse.json(
      { error: 'Failed to remove passkey device' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pairingCode, command } = body;

    if (!pairingCode || !command) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const pairing = await prisma.presentationPairing.findUnique({
      where: {
        pairingCode,
      },
    });

    if (!pairing) {
      return NextResponse.json(
        { error: 'Pairing not found' },
        { status: 404 }
      );
    }

    // Parse existing commands array
    const currentCommands = pairing.controllerCommands 
      ? JSON.parse(pairing.controllerCommands as string) 
      : [];
    
    // Add new command with timestamp
    const updatedCommands = [
      ...currentCommands,
      {
        command,
        timestamp: Date.now(),
      }
    ];

    // Process command logic
    let updates: any = {
      controllerCommands: JSON.stringify(updatedCommands),
    };

    // Handle specific commands
    if (command === 'next') {
      updates.currentPromptIndex = pairing.currentPromptIndex + 1;
    } else if (command === 'previous' && pairing.currentPromptIndex > 0) {
      updates.currentPromptIndex = pairing.currentPromptIndex - 1;
    }

    // Update the pairing
    const updatedPairing = await prisma.presentationPairing.update({
      where: {
        pairingCode,
      },
      data: updates,
    });

    return NextResponse.json({
      success: true,
      currentPromptIndex: updatedPairing.currentPromptIndex,
    });
  } catch (error) {
    console.error('Error updating pairing:', error);
    return NextResponse.json(
      { error: 'Failed to update pairing' },
      { status: 500 }
    );
  }
} 
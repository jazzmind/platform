import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // Correctly await the params as per Next.js 15 requirement
    const { code } = await params;
    
    const pairing = await prisma.presentationPairing.findUnique({
      where: {
        pairingCode: code,
      },
    });
    
    if (!pairing) {
      return NextResponse.json(
        { error: 'Pairing not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      isPaired: pairing.isPaired,
      presentationId: pairing.presentationId,
      categoryId: pairing.categoryId,
      currentPromptIndex: pairing.currentPromptIndex,
    });
  } catch (error) {
    console.error(`Error checking pairing status for code ${params}:`, error);
    return NextResponse.json(
      { error: 'Failed to check pairing status' },
      { status: 500 }
    );
  }
} 
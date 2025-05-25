import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface RouteParams {
  params: Promise<{
    code: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Await the params before accessing its properties
    const { code } = await params;
    
    if (!code || code.length < 4) {
      console.log('[check-pairing] Invalid pairing code format:', code);
      return NextResponse.json(
        { error: "Invalid pairing code" },
        { status: 400 }
      );
    }
    
    // Find the pairing in the database
    // Extract presentationId from combined code if present
    let pairingCode = code;
    let presentationId: string | null = null;
    
    if (code.includes('-')) {
      // If the format is presentationId-pairingCode, extract both parts
      const parts = code.split('-');
      presentationId = parts.slice(0, -1).join('-'); // Everything before the last dash
      pairingCode = parts.pop() || code;
    }
    
    console.log(`[check-pairing] Checking code: ${pairingCode}, presentationId: ${presentationId || 'not specified'}`);
    
    // Find all matching pairings, then pick the most recent one
    // This handles the case where duplicate API calls created multiple pairings
    const query: Prisma.PresentationPairingFindManyArgs = {
      where: {
        pairingCode: pairingCode
      },
      orderBy: {
        createdAt: 'desc'
      }
    };
    
    // If we have a presentationId, add it to the query for more specificity
    if (presentationId) {
      query.where = {
        pairingCode,
        presentationId
      };
    }
    
    const pairings = await prisma.presentationPairing.findMany(query);
    
    // No pairings found at all
    if (!pairings || pairings.length === 0) {
      console.log(`[check-pairing] No pairings found for code: ${pairingCode}`);
      return NextResponse.json(
        { error: "Pairing code not found" },
        { status: 404 }
      );
    }
    
    // Use the most recent pairing
    const pairingData = pairings[0];
    
    // Check if the pairing is expired (30 minutes)
    const thirtyMinutesMs = 30 * 60 * 1000;
    if (new Date().getTime() - pairingData.lastUpdated.getTime() > thirtyMinutesMs) {
      console.log(`[check-pairing] Pairing expired for code: ${pairingCode}`);
      return NextResponse.json(
        { error: "Pairing code has expired" },
        { status: 410 }
      );
    }
    
    // If multiple pairings were found for the same code, clean up the duplicates
    if (pairings.length > 1) {
      console.log(`[check-pairing] Found ${pairings.length} pairings for code: ${pairingCode}, cleaning up duplicates`);
      
      // Use a transaction to clean up duplicates to ensure consistency
      await prisma.$transaction(async (tx) => {
        // First verify that the pairings still exist (they might have been cleaned up by another process)
        const currentPairings = await tx.presentationPairing.findMany({
          where: {
            id: {
              in: pairings.map(p => p.id)
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
        
        if (currentPairings.length <= 1) {
          console.log(`[check-pairing] No duplicates found anymore for code: ${pairingCode}`);
          return;
        }
        
        // Keep the most recent one, delete the rest
        const idsToDelete = currentPairings.slice(1).map(p => p.id);
        
        const deleted = await tx.presentationPairing.deleteMany({
          where: {
            id: {
              in: idsToDelete
            }
          }
        });
        
        console.log(`[check-pairing] Deleted ${deleted.count} duplicate pairings in transaction`);
      }, {
        timeout: 5000,
        isolationLevel: 'Serializable'
      });
    }
    
    console.log(`[check-pairing] Code: ${pairingCode}, isPaired: ${pairingData.isPaired}`);
    
    return NextResponse.json({
      isValid: true,
      pairingData: {
        id: pairingData.id,
        categoryId: pairingData.categoryId,
        presentationId: pairingData.presentationId,
        isPaired: pairingData.isPaired,
        currentPromptIndex: pairingData.currentPromptIndex,
        timerState: {
          timeLeft: pairingData.timerTimeLeft,
          isRunning: pairingData.timerIsRunning,
          startTime: pairingData.timerStartTime ? Number(pairingData.timerStartTime) : null
        },
        controllerCommands: JSON.parse(pairingData.controllerCommands as string || '[]'),
        lastUpdated: pairingData.lastUpdated
      }
    });
  } catch (error) {
    console.error("[check-pairing] Error checking pairing:", error);
    return NextResponse.json(
      { error: "Failed to check pairing" },
      { status: 500 }
    );
  }
} 
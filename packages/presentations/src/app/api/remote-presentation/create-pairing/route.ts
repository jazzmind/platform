import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  console.log('[create-pairing] Request received');
  try {
    const { categoryId, presentationId } = await request.json();
    
    if (!categoryId || !presentationId) {
      console.log('[create-pairing] Missing categoryId or presentationId');
      return NextResponse.json(
        { error: "Missing categoryId or presentationId" },
        { status: 400 }
      );
    }
    
    // Use a transaction to handle race conditions
    // This ensures that if two calls happen simultaneously, they don't both create pairings
    const result = await prisma.$transaction(async (tx) => {
      console.log(`[create-pairing] Starting transaction for ${presentationId}`);
      
      // First check for an existing pairing that's not too old
      const existingPairing = await tx.presentationPairing.findFirst({
        where: {
          presentationId,
          // Only consider relatively recent pairings (< 6 hours old)
          createdAt: {
            gt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      if (existingPairing) {
        console.log(`[create-pairing] Found existing pairing for ${presentationId}, code: ${existingPairing.pairingCode}`);
        
        // Return the existing pairing info
        return {
          pairingCode: existingPairing.pairingCode,
          sessionId: `${presentationId}-${existingPairing.pairingCode}`,
          id: existingPairing.id,
          isExisting: true
        };
      }
      
      console.log(`[create-pairing] No recent pairing found for ${presentationId}, creating new one`);
      
      // Delete all old pairings for this presentation
      const deletedCount = await tx.presentationPairing.deleteMany({
        where: {
          presentationId
        }
      });
      
      console.log(`[create-pairing] Deleted ${deletedCount.count} old pairings for ${presentationId}`);
      
      // Generate a 4-digit pairing code
      const pairingCode = Math.floor(1000 + Math.random() * 9000).toString();
      
      // Create a record in the database
      const pairingData = await tx.presentationPairing.create({
        data: {
          pairingCode,
          categoryId,
          presentationId,
          isPaired: false,
          currentPromptIndex: 0,
          timerIsRunning: false,
          controllerCommands: JSON.stringify([])
        }
      });
      
      console.log(`[create-pairing] Created new pairing for ${presentationId}, code: ${pairingCode}`);
      
      // Return the new pairing info
      return {
        pairingCode,
        sessionId: `${presentationId}-${pairingCode}`,
        id: pairingData.id,
        isExisting: false
      };
    }, {
      // Use a longer timeout for the transaction
      timeout: 10000,
      // Set isolation level to ensure consistency
      isolationLevel: 'Serializable'
    });
    
    // Return the result from the transaction
    return NextResponse.json(result);
  } catch (error) {
    console.error("[create-pairing] Error creating pairing:", error);
    return NextResponse.json(
      { error: "Failed to create pairing" },
      { status: 500 }
    );
  }
} 
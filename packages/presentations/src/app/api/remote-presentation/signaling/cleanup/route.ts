import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    console.log('[Signaling][CLEANUP] Starting cleanup of orphaned signaling messages');
    
    // Use a transaction for the cleanup operations to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Delete messages older than 30 minutes
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      
      const deletedCount = await tx.signalingMessage.deleteMany({
        where: {
          createdAt: {
            lt: thirtyMinutesAgo
          }
        }
      });
      
      console.log(`[Signaling][CLEANUP] Deleted ${deletedCount.count} orphaned signaling messages`);
      
      // Also clean up old pairing records that are not paired
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      
      const deletedPairings = await tx.presentationPairing.deleteMany({
        where: {
          isPaired: false,
          createdAt: {
            lt: twoHoursAgo
          }
        }
      });
      
      console.log(`[Signaling][CLEANUP] Deleted ${deletedPairings.count} unused pairing records`);
      
      return {
        deletedMessages: deletedCount.count,
        deletedPairings: deletedPairings.count
      };
    }, {
      timeout: 10000
    });
    
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("[Signaling][CLEANUP] Error during cleanup:", error);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 }
    );
  }
} 
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// In-memory storage is no longer used - using database storage instead
// export const signalingMessages: Record<string, SignalingMessage[]> = {};

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { sessionId, role, type, data: signalData } = data;

    if (!sessionId) {
      console.log("[Signaling] Error: Missing sessionId");
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      );
    }

    if (!role) {
      console.log("[Signaling] Error: Missing role");
      return NextResponse.json(
        { error: "Missing role" },
        { status: 400 }
      );
    }
    
    // Log basic info about the request
    console.log(`[Signaling][SEND] SessionID: ${sessionId}, Role: ${role}`);
    
    // Store the message in the database using Prisma
    const message = await prisma.signalingMessage.create({
      data: {
        sessionId: sessionId,
        role: role,
        type: type || 'webrtc-signal',
        data: signalData || {},
        processed: false
      }
    });
    
    // Log message details for debugging
    let messageInfo = `type: ${message.type}`;
    if (signalData && typeof signalData === 'object' && 'type' in signalData) {
      const signalType = signalData.type;
      messageInfo += `, signal-type: ${signalType}`;
    }
    
    console.log(`[Signaling][SEND] Stored message (${messageInfo}) from ${role} for session ${sessionId} in database`);
    
    // Clean up old messages (> 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const deleteCount = await prisma.signalingMessage.deleteMany({
      where: {
        createdAt: {
          lt: fiveMinutesAgo
        }
      }
    });
    
    if (deleteCount.count > 0) {
      console.log(`[Signaling] Cleaned up ${deleteCount.count} old messages from database`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Signaling] Error in signaling server:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle DELETE to cleanup signaling data for a session
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      );
    }
    
    // Remove all signaling data for this session from database
    const deleteCount = await prisma.signalingMessage.deleteMany({
      where: {
        sessionId: sessionId
      }
    });
    
    console.log(`[Signaling] Deleted ${deleteCount.count} messages for session: ${sessionId}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cleaning up signaling data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 
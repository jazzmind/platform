import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { SignalingMessage } from "@prisma/client";

export type RTCMessage = {
  type: string;
  role: string;
  data: Record<string, unknown>;
};

// Add GET handler to support polling with query parameters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const role = searchParams.get("role");
    //const pairingCode = searchParams.get("pairingCode");

    //console.log(`[Signaling][POLL] Request from role: ${role}, sessionId: ${sessionId}, pairingCode: ${pairingCode}`);

    if (!sessionId) {
      console.error("[Signaling][POLL] Missing sessionId");
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      );
    }

    if (!role) {
      console.error(`[Signaling][POLL] Missing role for session ${sessionId}`);
      return NextResponse.json(
        { error: "Missing role parameter" },
        { status: 400 }
      );
    }

    // Get messages for this session from the database
    // Only return messages sent by the opposite role
    const targetRole = role === 'controller' ? 'screen' : 'controller';
    
    //console.log(`[Signaling][POLL] Finding messages from ${targetRole} for ${role}`);
    
    const messages = await prisma.signalingMessage.findMany({
      where: {
        sessionId: sessionId,
        role: targetRole,
        processed: false
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    //console.log(`[Signaling][POLL] Found ${messages.length} messages from ${targetRole} for ${role}`);

    if (messages.length > 0) {
      // Mark the messages as processed
      await prisma.signalingMessage.updateMany({
        where: {
          id: {
            in: messages.map((m: SignalingMessage) => m.id)
          }
        },
        data: {
          processed: true
        }
      });
      
      console.log(`[Signaling][POLL] Marked ${messages.length} messages as processed`);
    }

    // Convert the messages to the expected format
    const formattedMessages = messages.map((m: SignalingMessage) => ({
      type: m.type,
      role: m.role,
      data: m.data as Record<string, unknown>
    }));

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error("Error in signaling polling:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log(`[Signaling][POST] Received message from role: ${body.role} for session: ${body.sessionId}`);
    
    if (!body.sessionId) {
      console.error('[Signaling][POST] Missing sessionId');
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      );
    }

    if (!body.role) {
      console.error(`[Signaling][POST] Missing role for session ${body.sessionId}`);
      return NextResponse.json(
        { error: "Missing role parameter" },
        { status: 400 }
      );
    }

    if (!body.type) {
      console.error(`[Signaling][POST] Missing message type for session ${body.sessionId} from ${body.role}`);
      return NextResponse.json(
        { error: "Missing message type" },
        { status: 400 }
      );
    }

    // Store the message in the database
    const message = await prisma.signalingMessage.create({
      data: {
        sessionId: body.sessionId,
        role: body.role,
        type: body.type,
        data: body.data || {},
        processed: false
      }
    });
    
    // Log message details for debugging
    let messageInfo = `type: ${message.type}`;
    if (message.type === 'webrtc-signal' && message.data && typeof message.data === 'object' && 'type' in message.data) {
      const signalType = message.data.type;
      messageInfo += `, signal-type: ${signalType}`;
    }
    
    console.log(`[Signaling][POST] Stored message (${messageInfo}) from ${body.role} for session ${body.sessionId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in signaling POST:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
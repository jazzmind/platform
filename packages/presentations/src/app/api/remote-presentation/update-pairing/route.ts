import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { presentationId, pairingCode, action, data } = await request.json();
    
    if (!presentationId || !pairingCode || !action) {
      return NextResponse.json(
        { error: "Missing presentationId, pairingCode or action" },
        { status: 400 }
      );
    }
    
    // Find the pairing in the database
    const pairingData = await prisma.presentationPairing.findUnique({
      where: { pairingCode }
    });
    
    if (!pairingData) {
      return NextResponse.json(
        { error: "Pairing code not found" },
        { status: 404 }
      );
    }
    
    // Prepare the update data
    const updateData: Record<string, unknown> = {};
    
    // Update the data based on the action
    switch (action) {
      case 'poll':
        // For polling, we don't modify the data, just return current state
        break;
        
      case 'pair':
        console.log('Pairing request received for:', presentationId, pairingCode);
        console.log('Current pairing status:', pairingData.isPaired);
        updateData.isPaired = true;
        console.log('Updated pairing status to:', updateData.isPaired);
        break;
        
      case 'unpair':
        updateData.isPaired = false;
        break;
        
      case 'next':
        if (pairingData.currentPromptIndex < data.maxIndex) {
          updateData.currentPromptIndex = pairingData.currentPromptIndex + 1;
        }
        break;
        
      case 'previous':
        if (pairingData.currentPromptIndex > 0) {
          updateData.currentPromptIndex = pairingData.currentPromptIndex - 1;
        }
        break;
        
      case 'goto':
        if (data.index !== undefined && 
            typeof data.index === 'number' && 
            data.index >= 0 && 
            data.index <= data.maxIndex) {
          updateData.currentPromptIndex = data.index;
        }
        break;
        
      case 'startTimer':
        updateData.timerTimeLeft = data.minutes * 60;
        updateData.timerIsRunning = true;
        updateData.timerStartTime = BigInt(Date.now());
        break;
        
      case 'pauseTimer':
        if (pairingData.timerIsRunning && pairingData.timerStartTime) {
          const elapsed = Math.floor((Date.now() - Number(pairingData.timerStartTime)) / 1000);
          const remaining = Math.max(0, pairingData.timerTimeLeft || 0 - elapsed);
          
          updateData.timerTimeLeft = remaining;
          updateData.timerIsRunning = false;
          updateData.timerStartTime = null;
        }
        break;
        
      case 'resumeTimer':
        if (pairingData.timerTimeLeft && pairingData.timerTimeLeft > 0) {
          updateData.timerIsRunning = true;
          updateData.timerStartTime = BigInt(Date.now());
        }
        break;
        
      case 'resetTimer':
        updateData.timerTimeLeft = null;
        updateData.timerIsRunning = false;
        updateData.timerStartTime = null;
        break;
        
      case 'addCommand':
        // Add a new command to the queue
        if (data.command) {
          const commands = JSON.parse(pairingData.controllerCommands as string || '[]');
          commands.push({
            ...data.command,
            timestamp: Date.now()
          });
          
          // Limit command queue to last 10 commands
          if (commands.length > 10) {
            updateData.controllerCommands = JSON.stringify(commands.slice(-10));
          } else {
            updateData.controllerCommands = JSON.stringify(commands);
          }
        }
        break;
        
      case 'clearCommands':
        // Clear processed commands
        if (data.processedTimestamp) {
          const commands = JSON.parse(pairingData.controllerCommands as string || '[]');
          const filteredCommands = commands.filter(
            (cmd: { timestamp: number }) => cmd.timestamp > data.processedTimestamp
          );
          updateData.controllerCommands = JSON.stringify(filteredCommands);
        }
        break;
        
      case 'updateTimer':
        // Update timer state directly
        if (data.timerState) {
          updateData.timerTimeLeft = data.timerState.timeLeft;
          updateData.timerIsRunning = data.timerState.isRunning;
          updateData.timerStartTime = data.timerState.startTime ? BigInt(data.timerState.startTime) : null;
        }
        break;
        
      case 'cleanup':
        // For cleanup we don't change anything, just update timestamp
        break;
    }
    
    // If we have updates to apply, update the database
    const updatedPairing = Object.keys(updateData).length > 0 
      ? await prisma.presentationPairing.update({
          where: { id: pairingData.id },
          data: updateData
        })
      : pairingData;
    
    return NextResponse.json({
      success: true,
      updated: Object.keys(updateData).length > 0,
      pairingData: {
        id: updatedPairing.id,
        isPaired: updatedPairing.isPaired,
        currentPromptIndex: updatedPairing.currentPromptIndex,
        timerState: {
          timeLeft: updatedPairing.timerTimeLeft,
          isRunning: updatedPairing.timerIsRunning,
          startTime: updatedPairing.timerStartTime ? Number(updatedPairing.timerStartTime) : null
        },
        controllerCommands: JSON.parse(updatedPairing.controllerCommands as string || '[]'),
        lastUpdated: updatedPairing.lastUpdated
      }
    });
  } catch (error) {
    console.error("Error updating pairing:", error);
    return NextResponse.json(
      { error: "Failed to update pairing" },
      { status: 500 }
    );
  }
} 
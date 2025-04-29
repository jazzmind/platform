// Presentation pairing types
export interface PresentationPairing {
  id: string;
  pairingCode: string;
  presentationId: string;
  categoryId: string;
  isPaired: boolean;
  createdAt: Date;
  lastUpdated: Date;
  currentPromptIndex: number;
  controllerCommands: string | null;
  timerTimeLeft: number | null;
  timerIsRunning: boolean;
  timerStartTime: bigint | null;
}

export interface PairingCommand {
  command: string;
  timestamp: number;
}

// Signaling message types
export interface SignalingMessage {
  id: string;
  sessionId: string;
  role: string;
  type: string;
  data: any;
  processed: boolean;
  createdAt: Date;
} 
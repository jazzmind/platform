import EventEmitter from 'events';
import Peer, { Instance } from 'simple-peer';

// Interface for the SimplePeer instance with internal properties
interface SimplePeerExtended extends Instance {
  _initiator?: boolean;
  _pc?: RTCPeerConnection;
}

// Interface for messages sent over WebRTC
export type RTCMessage = {
  type: string;
  data?: Record<string, unknown>;
};

// Basic STUN servers for WebRTC connection
const DEFAULT_ICE_SERVERS = [
  {
    urls: "stun:stun.relay.metered.ca:80",
  },
  {
    urls: "turn:global.relay.metered.ca:80",
    username: "5afa134a6c2432e8fb0f6c8d",
    credential: "m6EFsA1fQ6N1rIiu",
  },
  {
    urls: "turn:global.relay.metered.ca:80?transport=tcp",
    username: "5afa134a6c2432e8fb0f6c8d",
    credential: "m6EFsA1fQ6N1rIiu",
  },
  {
    urls: "turn:global.relay.metered.ca:443",
    username: "5afa134a6c2432e8fb0f6c8d",
    credential: "m6EFsA1fQ6N1rIiu",
  },
  {
    urls: "turns:global.relay.metered.ca:443?transport=tcp",
    username: "5afa134a6c2432e8fb0f6c8d",
    credential: "m6EFsA1fQ6N1rIiu",
  }
];

export class WebRTCConnection extends EventEmitter {
  private peer: SimplePeerExtended | null = null;
  private sessionId: string;
  private pairingCode: string;
  private role: 'controller' | 'screen';
  private signalingUrl: string;
  private connected = false;
  private polling = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private connectionState = 'new';
  private pendingSignalingMessages: unknown[] = [];
  private manuallyDisconnected = false;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private receivedOffer = false;
  private receivedAnswer = false;
  private iceCandidatesSent = 0;
  private iceCandidatesReceived = 0;
  private connectionStartTime = Date.now();

  /**
   * Create a new WebRTC connection
   * @param options Configuration options
   */
  constructor(options: { 
    sessionId: string, 
    pairingCode: string, 
    role: 'controller' | 'screen',
    signalingUrl?: string 
  }) {
    super();
    this.sessionId = options.sessionId;
    this.pairingCode = options.pairingCode;
    this.role = options.role;
    this.signalingUrl = options.signalingUrl || '/api/remote-presentation/signaling';
    
    console.log(`WebRTCConnection created for ${this.role} with sessionId: ${this.sessionId}, pairingCode: ${this.pairingCode}`);
    
    // Let's debug the connection order
    if (this.role === 'controller') {
      console.log(`[${this.role}] Controller should connect AFTER screen to avoid race conditions`);
    } else {
      console.log(`[${this.role}] Screen should connect FIRST to be ready to receive the offer`);
    }
  }

  /**
   * Process any signaling messages that were received before the peer was ready
   */
  public processPendingSignalingMessages(): void {
    if (this.pendingSignalingMessages.length > 0 && this.peer) {
      console.log(`[${this.role}] Processing ${this.pendingSignalingMessages.length} pending signaling messages`);
      
      this.pendingSignalingMessages.forEach((data) => {
        try {
          if (this.peer) {
            // Log the type of signaling message
            const signalType = data && typeof data === 'object' && 'type' in data 
              ? (data as { type: string }).type 
              : 'unknown';
            console.log(`[${this.role}] Processing pending ${signalType} signaling message`);
            
            if (signalType === 'offer' && this.role === 'screen') {
              console.log(`[${this.role}] ✓ Received offer from controller`);
              this.receivedOffer = true;
            } else if (signalType === 'answer' && this.role === 'controller') {
              console.log(`[${this.role}] ✓ Received answer from screen`);
              this.receivedAnswer = true;
            } else if (signalType === 'candidate') {
              this.iceCandidatesReceived++;
              console.log(`[${this.role}] ✓ Received ICE candidate (${this.iceCandidatesReceived} total)`);
            }
            
            this.peer.signal(data as Peer.SignalData);
          }
        } catch (err) {
          console.error(`[${this.role}] Error applying pending signaling data:`, err);
        }
      });
      
      this.pendingSignalingMessages = [];
    }
  }

  /**
   * Send a message to the peer
   * @param message The message to send
   */
  sendMessage(message: Record<string, unknown>): boolean {
    if (!this.peer || !this.connected) {
      console.warn(`[${this.role}] Cannot send message - not connected`);
      return false;
    }

    try {
      console.log(`[${this.role}] Sending message:`, message);
      this.peer.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`[${this.role}] Failed to send message:`, error);
      return false;
    }
  }

  /**
   * Connect to the peer
   * @param withMicrophone Whether to include microphone audio (controller only)
   */
  async connect(withMicrophone = false): Promise<void> {
    console.log(`[${this.role}] Connecting WebRTC as ${this.role}...`);
    this.manuallyDisconnected = false;
    this.connectionStartTime = Date.now();
    
    // Set a connection timeout
    this.setConnectionTimeout();
    
    // Start polling for signaling messages first
    await this.startSignalingPolling();
    
    // Give the signaling connection a moment to establish for the screen
    if (this.role === 'controller') {
      console.log(`[${this.role}] Controller waiting briefly before initializing peer to ensure screen is ready...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Create the peer connection
    this.initializePeer(withMicrophone);
    
    return Promise.resolve();
  }

  /**
   * Set a timeout for the connection
   */
  private setConnectionTimeout(): void {
    // Clear any existing timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
    
    // Set a new timeout - use different timeouts based on role
    const timeoutDuration = this.role === 'screen' ? 30000 : 25000; // 30s for screen, 25s for controller
    
    this.connectionTimeout = setTimeout(() => {
      if (!this.connected && !this.manuallyDisconnected) {
        const elapsedTime = (Date.now() - this.connectionStartTime) / 1000;
        console.warn(`[${this.role}] Connection timed out after ${elapsedTime}s`);
        
        // Provide diagnostic information
        const diagnosticInfo = {
          role: this.role,
          receivedOffer: this.receivedOffer,
          receivedAnswer: this.receivedAnswer,
          iceCandidatesSent: this.iceCandidatesSent,
          iceCandidatesReceived: this.iceCandidatesReceived,
          timeElapsed: elapsedTime
        };
        
        console.error(`[${this.role}] Connection diagnostic:`, diagnosticInfo);
        
        // Determine most likely cause of failure
        let errorMessage = 'Connection timed out';
        
        if (this.role === 'screen' && !this.receivedOffer) {
          errorMessage += ': No offer received from controller';
        } else if (this.role === 'controller' && !this.receivedAnswer) {
          errorMessage += ': No answer received from screen';
        } else if (this.iceCandidatesReceived === 0) {
          errorMessage += ': No ICE candidates received, possible network issue or firewall';
        }
        
        this.emit('error', new Error(errorMessage));
      }
    }, timeoutDuration);
  }

  /**
   * Disconnect from the peer
   */
  async disconnect(): Promise<void> {
    console.log(`[${this.role}] Disconnecting WebRTC connection...`);
    this.manuallyDisconnected = true;
    this.polling = false;
    
    // Clear timers
    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    // Clean up the peer
    this.destroyPeer();
    
    // Clean up server-side signaling
    this.cleanupSignaling();
    
    this.connected = false;
    this.connectionState = 'disconnected';
    this.emit('disconnected');
  }

  /**
   * Check if we're connected to the peer
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get the current connection state
   */
  getConnectionState(): string {
    return this.connectionState;
  }

  /**
   * Static method to clean up orphaned connections from database
   */
  static async cleanupOrphanedConnections(signalingUrl: string): Promise<void> {
    try {
      console.log('Cleaning up orphaned WebRTC connections');
      await fetch(`${signalingUrl}/cleanup`, {
        method: 'POST'
      });
      console.log('Orphaned connections cleanup completed');
    } catch (error) {
      console.error('Failed to clean up orphaned connections:', error);
    }
  }

  /**
   * Initialize the peer connection
   */
  private initializePeer(withMicrophone = false) {
    // Destroy any existing peer
    if (this.peer) {
      this.destroyPeer();
    }

    try {
      // Initialize the peer with the correct configuration
      const isInitiator = this.role === 'controller';
      console.log(`[${this.role}] Initializing WebRTC peer, isInitiator: ${isInitiator}`);
      
      // Reset tracking variables
      this.receivedOffer = false;
      this.receivedAnswer = false;
      this.iceCandidatesSent = 0;
      this.iceCandidatesReceived = 0;
      
      // Configure peer options
      const peerOptions: Peer.Options = {
        initiator: isInitiator,
        trickle: true,
        config: {
          iceServers: DEFAULT_ICE_SERVERS,
          iceCandidatePoolSize: 10 // Increase candidate pool for better connectivity
        }
      };

      // Log detailed configuration
      console.log(`[${this.role}] Using ICE servers:`, JSON.stringify(DEFAULT_ICE_SERVERS));
      console.log(`[${this.role}] Peer configuration: initiator=${isInitiator}, trickle=true`);

      // Create the peer instance
      this.peer = new Peer(peerOptions) as SimplePeerExtended;
      this.connectionState = 'connecting';
      
      // Set up event handlers
      this.setupPeerEvents();
      
      // Add audio track if requested (for controller only)
      if (withMicrophone && isInitiator && this.peer) {
        try {
          console.log(`[${this.role}] Requesting microphone access...`);
          navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
              if (this.peer) {
                this.peer.addStream(stream);
                console.log(`[${this.role}] Microphone access granted and stream added to peer`);
              }
            })
            .catch(err => {
              console.error(`[${this.role}] Failed to get microphone access:`, err);
            });
        } catch (err) {
          console.error(`[${this.role}] Failed to get microphone access:`, err);
        }
      }

      // Process any pending signaling messages
      this.processPendingSignalingMessages();

    } catch (error) {
      console.error(`[${this.role}] Failed to initialize WebRTC:`, error);
      this.emit('error', error);
    }
  }

  /**
   * Set up peer events
   */
  private setupPeerEvents(): void {
    if (!this.peer) {
      console.error(`[${this.role}] Cannot setup peer events - peer is null`);
      return;
    }

    // Connection established
    this.peer.on('connect', () => {
      console.log(`[${this.role}] 🎉 Connected to peer!`);
      this.connected = true;
      this.connectionState = 'connected';
      
      // Clear connection timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      // Log connection metrics
      const connectionTime = Math.round((Date.now() - this.connectionStartTime) / 1000);
      console.log(`[${this.role}] Connection established in ${connectionTime}s with ${this.iceCandidatesReceived} ICE candidates received`);
      
      this.emit('connected');
    });

    // Received data
    this.peer.on('data', (data) => {
      try {
        console.log(`[${this.role}] Received data via WebRTC`);
        const message = JSON.parse(data.toString());
        this.emit('message', message);
      } catch (error) {
        console.error(`[${this.role}] Failed to parse WebRTC message:`, error);
      }
    });

    // Connection closed
    this.peer.on('close', () => {
      console.log(`[${this.role}] Peer connection closed`);
      this.connected = false;
      this.connectionState = 'disconnected';
      this.emit('disconnected');
    });

    // Error
    this.peer.on('error', (err: Error) => {
      console.error(`[${this.role}] Peer error:`, err);
      this.connectionState = 'error';
      this.emit('error', err);
    });

    // Signal data needs to be exchanged
    this.peer.on('signal', (data: Peer.SignalData) => {
      const signalType = data && typeof data === 'object' && 'type' in data ? data.type : 'unknown';
      console.log(`[${this.role}] SimplePeer 'signal' event triggered with ${signalType} data`);
      
      // Keep track of signaling message types
      if (signalType === 'offer' && this.role === 'controller') {
        console.log(`[${this.role}] ✓ Generated offer to send to screen`);
      } else if (signalType === 'answer' && this.role === 'screen') {
        console.log(`[${this.role}] ✓ Generated answer to send to controller`);
      } else if (signalType === 'candidate') {
        this.iceCandidatesSent++;
        console.log(`[${this.role}] ✓ Sending ICE candidate (${this.iceCandidatesSent} total)`);
      }
      
      this.sendSignalingData(data);
    });
    
    // Stream received
    this.peer.on('stream', (stream) => {
      console.log(`[${this.role}] Received stream:`, stream.id);
      this.emit('stream', stream);
    });
    
    // Track ICE connection state changes if possible
    if (this.peer._pc) {
      this.peer._pc.oniceconnectionstatechange = () => {
        if (this.peer && this.peer._pc) {
          const state = this.peer._pc.iceConnectionState;
          console.log(`[${this.role}] ICE connection state changed to: ${state}`);
          
          if (state === 'failed') {
            console.error(`[${this.role}] ICE connection failed - this often indicates firewall or NAT traversal issues`);
          }
        }
      };
    }
  }

  /**
   * Send signaling data to the signaling server
   */
  private async sendSignalingData(data: unknown): Promise<void> {
    try {
      const signalingData = {
        type: 'webrtc-signal',
        sessionId: this.sessionId,
        pairingCode: this.pairingCode,
        role: this.role,
        sender: this.role, // Add sender information
        data
      };

      const url = this.signalingUrl;
      
      // Log what type of signaling data we're sending
      const signalType = data && typeof data === 'object' && 'type' in data 
        ? (data as { type: string }).type 
        : 'unknown';
      
      console.log(`[${this.role}] 📤 Sending ${signalType} signaling data`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(signalingData)
      });
      
      if (!response.ok) {
        console.error(`[${this.role}] Failed to send signaling data, status: ${response.status}`);
        this.emit('error', new Error(`Signaling server responded with status ${response.status}`));
      } else {
        console.log(`[${this.role}] ✓ Successfully sent ${signalType} signaling data`);
        
        // Special handling for offers and answers
        if (signalType === 'offer' && this.role === 'controller') {
          console.log(`[${this.role}] Offer has been sent to the screen`);
        } else if (signalType === 'answer' && this.role === 'screen') {
          console.log(`[${this.role}] Answer has been sent to the controller`);
        }
      }
    } catch (error) {
      console.error(`[${this.role}] Failed to send signaling data:`, error);
      this.emit('error', new Error('Signaling failed'));
    }
  }

  /**
   * Start polling for signaling messages
   */
  private async startSignalingPolling(): Promise<void> {
    console.log(`[${this.role}] Starting signaling polling for sessionId: ${this.sessionId}`);
    
    if (!this.pairingCode) {
      console.error(`[${this.role}] No pairing code set, cannot start signaling`);
      throw new Error('No pairing code set');
    }
    
    this.polling = true;
    
    // Start the polling loop
    await this.pollSignalingServer();
    
    return Promise.resolve();
  }

  /**
   * Poll the signaling server for messages
   */
  private async pollSignalingServer(): Promise<void> {
    if (!this.polling || !this.pairingCode) {
      console.log(`[${this.role}] Polling stopped`);
      return;
    }
    
    try {
      const url = `/api/remote-presentation/signaling/poll?pairingCode=${this.pairingCode}&role=${this.role}&sessionId=${this.sessionId}`;
      console.log(`[${this.role}] Polling signaling server: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error(`[${this.role}] Polling request failed with status ${response.status}`);
        throw new Error(`Polling request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.messages && data.messages.length > 0) {
        console.log(`[${this.role}] Received ${data.messages.length} signaling messages`);
        
        // Process each message
        for (const message of data.messages) {
          if (message.data) {
            const signalType = message.data && typeof message.data === 'object' && 'type' in message.data 
              ? message.data.type 
              : 'unknown';
              
            console.log(`[${this.role}] 📩 Received ${signalType} signaling message from ${message.sender || 'unknown'}`);
            
            if (signalType === 'offer' && this.role === 'screen') {
              console.log(`[${this.role}] ✓ Received offer from controller`);
              this.receivedOffer = true;
            } else if (signalType === 'answer' && this.role === 'controller') {
              console.log(`[${this.role}] ✓ Received answer from screen`);
              this.receivedAnswer = true;
            } else if (signalType === 'candidate') {
              this.iceCandidatesReceived++;
              console.log(`[${this.role}] ✓ Received ICE candidate (${this.iceCandidatesReceived} total)`);
            }
            
            if (this.peer) {
              console.log(`[${this.role}] Applying ${signalType} signaling message to peer`);
              try {
                this.peer.signal(message.data);
              } catch (err) {
                console.error(`[${this.role}] Error applying signaling data from poll:`, err);
              }
            } else {
              console.warn(`[${this.role}] No peer available, queuing signaling message`);
              this.pendingSignalingMessages.push(message.data);
            }
          }
        }
        
        // Attempt to process any newly queued messages if the peer might have been initialized
        // between the start of the poll and now.
        this.processPendingSignalingMessages(); 
      }
    } catch (error) {
      console.error(`[${this.role}] Error polling for signaling messages:`, error);
      // Stop polling on error to prevent spamming logs/server
      this.polling = false; 
      // Optionally emit an error event
      this.emit('error', new Error(`Polling failed: ${error instanceof Error ? error.message : String(error)}`));
    }
    
    // Schedule the next poll if we're still polling
    if (this.polling) {
      this.pollingInterval = setTimeout(() => this.pollSignalingServer(), 1000);
    }
  }

  /**
   * Clean up the peer connection
   */
  private destroyPeer() {
    if (this.peer) {
      console.log(`[${this.role}] Destroying peer instance`);
      try {
        this.peer.destroy();
      } catch (error) {
        console.error(`[${this.role}] Error destroying peer:`, error);
      }
      this.peer = null;
    }
  }

  /**
   * Tell the server to clean up signaling resources
   */
  private async cleanupSignaling(): Promise<void> {
    if (!this.pairingCode) return;
    
    try {
      console.log(`[${this.role}] Cleaning up signaling resources for pairingCode: ${this.pairingCode}`);
      this.polling = false;
      const response = await fetch(`/api/remote-presentation/signaling/cleanup?pairingCode=${this.pairingCode}&role=${this.role}&sessionId=${this.sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.warn(`[${this.role}] Signaling cleanup request failed with status ${response.status}`);
      } else {
        console.log(`[${this.role}] Signaling resources cleaned up successfully`);
      }
    } catch (error) {
      console.error(`[${this.role}] Error cleaning up signaling resources:`, error);
    }
  }
} 
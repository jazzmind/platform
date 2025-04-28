import EventEmitter from 'events';
import Peer from 'simple-peer';
import { SignalData } from 'simple-peer';

export interface RTCMessage {
  type: string;
  data?: Record<string, unknown>;
}

interface SignalingData {
  type: string;
  sessionId: string;
  [key: string]: unknown;
}

export class WebRTCConnection extends EventEmitter {
  private peer: Peer.Instance | null = null;
  private sessionId: string;
  private pairingCode: string;
  private role: 'controller' | 'screen';
  private signalingUrl: string;
  private connected = false;
  private polling = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private failedPollingAttempts = 0; // Track consecutive failed polling attempts
  private maxFailedPollingAttempts = 15; // 15 attempts with 1 second interval = ~15 seconds
  // Using 'any' type here because SimplePeer's signal method accepts a complex union type that's difficult to represent precisely
  private pendingSignalingMessages: unknown[] = []; // Store messages received before peer is ready
  private connectionStartTime: number = Date.now(); // Track when connection process started
  private inactivityTimeout: NodeJS.Timeout | null = null; // Timeout for inactivity
  private maxInactivityTime = 60000; // 60 seconds (1 minute) of inactivity before auto-disconnect

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
    console.log(`Using signaling URL: ${this.signalingUrl}`);
    
    // If this is the screen, set up an inactivity timeout
    if (this.role === 'screen') {
      this.setupInactivityTimeout();
    }
  }

  /**
   * Setup a timeout that will disconnect this connection if no peer connects within a specified time
   */
  private setupInactivityTimeout(): void {
    // Clear any existing timeout
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
    }
    
    console.log(`[${this.role}] Setting up inactivity timeout for ${this.maxInactivityTime/1000} seconds`);
    
    // Set new timeout
    this.inactivityTimeout = setTimeout(() => {
      // Only disconnect if we're not already connected
      if (!this.connected) {
        console.error(`[${this.role}] No connection established after ${this.maxInactivityTime/1000} seconds. Auto-disconnecting due to inactivity.`);
        this.emit('error', new Error('Connection timed out due to inactivity'));
        this.disconnect();
      }
    }, this.maxInactivityTime);
  }

  /**
   * Connect to the peer
   * @param withMicrophone Whether to include microphone audio (controller only)
   */
  async connect(withMicrophone = false): Promise<void> {
    if (this.peer) {
      console.log(`[${this.role}] Connection already exists, reusing existing peer`);
      return;
    }

    try {
      // Initialize the peer with the correct configuration
      const isInitiator = this.role === 'controller';
      console.log(`[${this.role}] Initializing WebRTC peer, isInitiator: ${isInitiator}, sessionId: ${this.sessionId}`);
      
      // Configure peer options
      const peerOptions: Peer.Options = {
        initiator: isInitiator,
        trickle: true, // We'll handle signaling manually
      };

      // Add audio track if requested (for controller only)
      if (withMicrophone && isInitiator) {
        try {
          console.log(`[${this.role}] Requesting microphone access...`);
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          peerOptions.stream = stream;
          console.log(`[${this.role}] Microphone access granted`);
        } catch (err) {
          console.error(`[${this.role}] Failed to get microphone access:`, err);
        }
      }

      // Create the peer instance
      console.log(`[${this.role}] Creating SimplePeer instance with options:`, peerOptions);
      this.peer = new Peer(peerOptions);
      console.log(`[${this.role}] SimplePeer instance created and is${this.peer ? '' : ' NOT'} ready`);

      // Set up event handlers immediately
      this.setupPeerEvents();

      // IMPORTANT: For non-initiator (screen), don't start polling until
      // peer is fully set up and the 'signal' event handler is registered
      if (!isInitiator) {
        // Small delay to ensure the signal event handler is properly registered
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Process any pending signaling messages that were received before peer was created
      const pendingCount = this.pendingSignalingMessages.length;
      if (pendingCount > 0) {
        console.log(`[${this.role}] Found ${pendingCount} pending messages to process immediately after initialization`);
        this.processPendingSignalingMessages();
      } else {
        console.log(`[${this.role}] No pending signaling messages found after initialization`);
      }

      // Start polling for signaling messages
      console.log(`[${this.role}] Starting signaling polling for sessionId: ${this.sessionId}`);
      this.startSignalingPolling();

      console.log(`[${this.role}] WebRTC peer setup complete and ready for signaling`);
      
    } catch (error) {
      console.error(`[${this.role}] Failed to initialize WebRTC:`, error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Process any signaling messages that were received before the peer was ready
   */
  public processPendingSignalingMessages(): void {
    if (this.pendingSignalingMessages.length > 0 && this.peer) {
      console.log(`[${this.role}] Processing ${this.pendingSignalingMessages.length} pending signaling messages`);
      
      this.pendingSignalingMessages.forEach((data, index) => {
        try {
          console.log(`[${this.role}] Processing pending message #${index + 1}:`, 
            typeof data === 'object' ? JSON.stringify(data).substring(0, 100) + '...' : data);
          if (this.peer) {
            console.log(`[${this.role}] Calling peer.signal() with pending data`);
            this.peer.signal(data as SignalData);
            console.log(`[${this.role}] peer.signal() call completed for pending message #${index + 1}`);
          }
        } catch (err) {
          console.error(`[${this.role}] Error applying pending signaling data:`, err);
        }
      });
      
      // Clear the pending messages
      console.log(`[${this.role}] Cleared pending messages queue`);
      this.pendingSignalingMessages = [];
    } else if (this.pendingSignalingMessages.length > 0) {
      console.error(`[${this.role}] Cannot process pending messages - peer is still null`);
    }
  }

  /**
   * Send a message to the peer
   * @param message The message to send
   */
  sendMessage(message: RTCMessage): boolean {
    if (!this.peer || !this.connected) {
      console.warn('Cannot send message - not connected');
      return false;
    }

    try {
      this.peer.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  /**
   * Disconnect from the peer
   */
  async disconnect(): Promise<void> {
    console.log(`[${this.role}] Disconnecting WebRTC connection for sessionId: ${this.sessionId}`);
    
    // Clear any inactivity timeout
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
      this.inactivityTimeout = null;
      console.log(`[${this.role}] Inactivity timeout cleared for sessionId: ${this.sessionId}`);
    }
    
    // Mark as not connected immediately to prevent further operations
    this.connected = false;
    
    // Stop polling for signaling messages
    console.log(`[${this.role}] Stopping polling for sessionId: ${this.sessionId}`);
    this.polling = false;
    
    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
      this.pollingInterval = null;
      console.log(`[${this.role}] Polling interval cleared for sessionId: ${this.sessionId}`);
    }
    
    // Clear any pending messages
    const pendingCount = this.pendingSignalingMessages.length;
    if (pendingCount > 0) {
      console.log(`[${this.role}] Clearing ${pendingCount} pending messages for sessionId: ${this.sessionId}`);
    }
    this.pendingSignalingMessages = [];
    
    // Close the peer connection
    if (this.peer) {
      console.log(`[${this.role}] Destroying peer for sessionId: ${this.sessionId}`);
      
      try {
        this.peer.destroy();
        console.log(`[${this.role}] Peer destroyed successfully for sessionId: ${this.sessionId}`);
      } catch (err) {
        console.error(`[${this.role}] Error destroying peer:`, err);
      } finally {
        this.peer = null;
      }
    } else {
      console.log(`[${this.role}] No peer to destroy for sessionId: ${this.sessionId}`);
    }
    
    this.emit('disconnected');
    
    // Clean up signaling data
    try {
      console.log(`[${this.role}] Cleaning up signaling data for sessionId: ${this.sessionId}`);
      const response = await fetch(`${this.signalingUrl}?sessionId=${this.sessionId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        console.log(`[${this.role}] Signaling data cleaned up successfully for sessionId: ${this.sessionId}`);
      } else {
        console.warn(`[${this.role}] Failed to clean up signaling data, status: ${response.status}`);
      }
    } catch (error) {
      console.error(`[${this.role}] Error cleaning up signaling data:`, error);
    }
    
    console.log(`[${this.role}] Disconnect complete for sessionId: ${this.sessionId}`);
  }

  /**
   * Check if we're connected to the peer
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Set up peer events
   */
  private setupPeerEvents(): void {
    if (!this.peer) {
      console.error(`[${this.role}] Cannot setup peer events - peer is null`);
      return;
    }

    console.log(`[${this.role}] Setting up peer events for sessionId: ${this.sessionId}`);

    // Connection established
    this.peer.on('connect', () => {
      console.log(`[${this.role}] WebRTC connection established for sessionId: ${this.sessionId}`);
      this.connected = true;
      
      // Clear inactivity timeout on successful connection
      if (this.inactivityTimeout) {
        clearTimeout(this.inactivityTimeout);
        this.inactivityTimeout = null;
        console.log(`[${this.role}] Cleared inactivity timeout after successful connection`);
      }
      
      this.emit('connected');
    });

    // Received data
    this.peer.on('data', (data) => {
      try {
        console.log(`[${this.role}] Received data via WebRTC for sessionId: ${this.sessionId}`);
        const message = JSON.parse(data.toString());
        this.emit('message', message);
      } catch (error) {
        console.error(`[${this.role}] Failed to parse WebRTC message:`, error);
      }
    });

    // Connection closed
    this.peer.on('close', () => {
      console.log(`[${this.role}] WebRTC connection closed for sessionId: ${this.sessionId}`);
      this.connected = false;
      this.emit('disconnected');
    });

    // Error
    this.peer.on('error', (error) => {
      console.error(`[${this.role}] WebRTC error for sessionId: ${this.sessionId}:`, error);
      this.emit('error', error);
    });

    // Signal data needs to be exchanged
    this.peer.on('signal', (data) => {
      const signalType = data && typeof data === 'object' && 'type' in data ? data.type : 'unknown';
      console.log(`[${this.role}] SimplePeer 'signal' event triggered with ${signalType} data for sessionId: ${this.sessionId}`);
      this.sendSignalingData(data);
    });

    // Add ICE state debugging
    this.peer.on('iceStateChange', (state) => {
      console.log(`[${this.role}] ICE state changed to: ${state}`);
    });
    
    console.log(`[${this.role}] All peer events have been registered for sessionId: ${this.sessionId}`);
  }

  /**
   * Send signaling data to the signaling server
   */
  private async sendSignalingData(data: unknown): Promise<void> {
    try {
      console.log(`[${this.role}] Preparing to send signaling data`);
      
      const signalingData: SignalingData = {
        type: 'webrtc-signal',
        sessionId: this.sessionId,
        pairingCode: this.pairingCode,
        role: this.role,
        data
      };

      // Log the type of signal being sent
      let signalType = 'unknown';
      if (data && typeof data === 'object' && 'type' in data) {
        signalType = (data as { type: string }).type;
      }
      
      console.log(`[${this.role}] Sending ${signalType} signal to sessionId: ${this.sessionId}`);

      const url = this.signalingUrl;
      console.log(`[${this.role}] POST request to: ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(signalingData)
      });
      
      if (response.ok) {
        console.log(`[${this.role}] ${signalType} signal successfully sent`);
      } else {
        console.error(`[${this.role}] Failed to send signaling data, status: ${response.status}`);
        
        // Try to get more error details
        try {
          const errorData = await response.json();
          console.error(`[${this.role}] Error details:`, errorData);
        } catch {
          // Ignore error parsing error
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
  private startSignalingPolling(): void {
    if (this.polling) {
      console.log(`[${this.role}] Polling already started for sessionId: ${this.sessionId}, skipping`);
      return;
    }
    this.polling = true;
    this.failedPollingAttempts = 0; // Reset the counter when starting polling
    console.log(`[${this.role}] Starting signaling polling for sessionId: ${this.sessionId}`);

    const pollForMessages = async () => {
      // Store a local reference to the sessionId to detect if disconnect was called
      const currentSessionId = this.sessionId;
      
      // Immediately check if polling should stop
      if (!this.polling) {
        console.log(`[${this.role}] Polling stopped for sessionId: ${currentSessionId}`);
        return;
      }
      
      // Also check if the peer was destroyed, which would be a reason to stop polling
      if (!this.peer) {
        console.log(`[${this.role}] Peer no longer exists, stopping polling for sessionId: ${currentSessionId}`);
        this.polling = false;
        return;
      }
      
      try {
        const pollUrl = `${this.signalingUrl}/poll?sessionId=${currentSessionId}&pairingCode=${this.pairingCode}&role=${this.role}`;
        console.log(`[${this.role}] Polling for messages: ${pollUrl}`);
        
        // Use AbortController to allow cancelling the fetch if disconnect is called
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 5000); // 5 second timeout
        
        const response = await fetch(pollUrl, {
          signal: abortController.signal
        }).catch(err => {
          // Check if this is an abort error (connection was cancelled)
          if (err.name === 'AbortError') {
            console.log(`[${this.role}] Polling request aborted`);
            return null;
          }
          throw err;
        });
        
        clearTimeout(timeoutId);
        
        // Double check if disconnected during fetch
        if (!this.polling || this.sessionId !== currentSessionId) {
          console.log(`[${this.role}] Polling was stopped during fetch, aborting for sessionId: ${currentSessionId}`);
          return;
        }
        
        // After the fetch, check again if polling should stop
        if (!this.polling) {
          console.log(`[${this.role}] Polling was stopped during fetch, aborting for sessionId: ${currentSessionId}`);
          return;
        }
        
        // If response is null (due to abort) or not OK, handle appropriately
        if (!response || !response.ok) {
          if (!response) {
            console.log(`[${this.role}] No response from polling (likely aborted)`);
            return;
          }
          
          // Increment failed attempts counter on error
          this.failedPollingAttempts++;
          console.error(`[${this.role}] Polling request failed with status: ${response.status}, failed attempts: ${this.failedPollingAttempts}/${this.maxFailedPollingAttempts}`);
          
          // Disconnect after reaching max failed attempts
          if (this.failedPollingAttempts >= this.maxFailedPollingAttempts) {
            console.error(`[${this.role}] Maximum failed polling attempts (${this.maxFailedPollingAttempts}) reached, disconnecting...`);
            this.polling = false;
            this.emit('error', new Error('Connection timed out after multiple failed polling attempts'));
            this.disconnect();
            return;
          }
          
          // If the response indicates that the pairing is no longer valid, stop polling
          if (response.status === 404 || response.status === 410) {
            console.log(`[${this.role}] Pairing no longer valid, stopping polling for sessionId: ${currentSessionId}`);
            this.polling = false;
            return;
          }
        } else {
          // Reset failed attempts counter on successful poll
          if (this.failedPollingAttempts > 0) {
            console.log(`[${this.role}] Resetting failed polling attempts counter after successful poll`);
            this.failedPollingAttempts = 0;
          }
          
          // Additional check before parsing JSON
          if (!this.polling || this.sessionId !== currentSessionId) {
            console.log(`[${this.role}] Polling was stopped before JSON parsing, aborting`);
            return;
          }
          
          const messages = await response.json();
          
          // Check one more time after JSON parsing
          if (!this.polling || this.sessionId !== currentSessionId) {
            console.log(`[${this.role}] Polling was stopped during JSON parsing, aborting for sessionId: ${currentSessionId}`);
            return;
          }
          
          if (Array.isArray(messages) && messages.length > 0) {
            console.log(`[${this.role}] Received ${messages.length} signaling messages for sessionId: ${currentSessionId}`);
            
            // Process messages in sequence, important for WebRTC handshake
            for (const message of messages) {
              // Quick check if polling should stop
              if (!this.polling || this.sessionId !== currentSessionId) {
                console.log(`[${this.role}] Polling stopped during message processing, aborting for sessionId: ${currentSessionId}`);
                return;
              }
              
              if (message.type === 'webrtc-signal' && message.data) {
                // Get the WebRTC signal type (offer/answer/candidate)
                const signalType = message.data && typeof message.data === 'object' && 'type' in message.data 
                  ? message.data.type 
                  : 'unknown';
                
                console.log(`[${this.role}] Processing ${signalType} signaling message`);
                
                // Apply the signaling data to our peer or store it for later
                if (this.peer) {
                  try {
                    console.log(`[${this.role}] Calling peer.signal() with ${signalType} data`);
                    this.peer.signal(message.data);
                    console.log(`[${this.role}] peer.signal() call completed for ${signalType}`);
                  } catch (err) {
                    console.error(`[${this.role}] Error applying ${signalType} data:`, err);
                  }
                } else {
                  console.warn(`[${this.role}] ⚠️ Peer not ready for ${signalType}, storing for later. This is unexpected at this point.`);
                  this.pendingSignalingMessages.push(message.data);
                }
              } else {
                console.log(`[${this.role}] Ignoring non-webrtc-signal message or message without data`, message);
              }
            }
          } else {
            console.log(`[${this.role}] No signaling messages received for sessionId: ${currentSessionId}`);
            
            // For screen role, if we've been waiting too long with no messages and still not connected,
            // check how long we've been trying and potentially time out
            if (this.role === 'screen' && !this.connected) {
              const currentTime = Date.now();
              const connectionTime = currentTime - this.connectionStartTime;
              
              // Log time waiting for connection
              if (connectionTime > 30000 && connectionTime % 10000 < 1000) { // Log every ~10 seconds after 30 seconds
                console.log(`[${this.role}] Waiting for controller for ${Math.round(connectionTime/1000)} seconds`);
              }
            }
          }
        }
      } catch (error) {
        // Check if we're still polling before handling the error
        if (!this.polling || this.sessionId !== currentSessionId) {
          console.log(`[${this.role}] Error occurred but polling was already stopped, ignoring`);
          return;
        }
        
        // Increment failed attempts counter on error
        this.failedPollingAttempts++;
        console.error(`[${this.role}] Error polling for signaling messages:`, error);
        console.log(`[${this.role}] Failed polling attempts: ${this.failedPollingAttempts}/${this.maxFailedPollingAttempts}`);
        
        // Disconnect after reaching max failed attempts
        if (this.failedPollingAttempts >= this.maxFailedPollingAttempts) {
          console.error(`[${this.role}] Maximum failed polling attempts (${this.maxFailedPollingAttempts}) reached, disconnecting...`);
          this.polling = false;
          this.emit('error', new Error('Connection timed out after multiple failed polling attempts'));
          this.disconnect();
          return;
        }
      }
      
      // Only schedule the next poll if polling is still enabled and the session ID hasn't changed
      if (this.polling && this.sessionId === currentSessionId) {
        // Continue polling - use a shorter interval of 1 second for more responsive connection
        this.pollingInterval = setTimeout(pollForMessages, 1000);
        console.log(`[${this.role}] Scheduled next poll for sessionId: ${currentSessionId}`);
      } else {
        console.log(`[${this.role}] Polling stopped, not scheduling next poll for sessionId: ${currentSessionId}`);
      }
    };

    // Start the polling loop
    console.log(`[${this.role}] Starting initial poll for sessionId: ${this.sessionId}`);
    pollForMessages();
  }

  /**
   * Add event listener
   */
  on(event: string, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }

  /**
   * Add one-time event listener
   */
  once(event: string, listener: (...args: unknown[]) => void): this {
    return super.once(event, listener);
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: (...args: unknown[]) => void): this {
    return super.off(event, listener);
  }

  /**
   * Add event listener (alias for on)
   */
  addListener(event: string, listener: (...args: unknown[]) => void): this {
    return super.addListener(event, listener);
  }

  /**
   * Remove event listener (alias for off)
   */
  removeListener(event: string, listener: (...args: unknown[]) => void): this {
    return super.removeListener(event, listener);
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
} 
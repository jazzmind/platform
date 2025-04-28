import { EventEmitter } from 'events';

interface RealtimeClientOptions {
  apiEndpoint?: string;
  model?: string;
  vadOptions?: {
    type?: 'server_vad' | 'semantic_vad';
    eagerness?: 'low' | 'medium' | 'high' | 'auto';
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
    interrupt_response?: boolean;
  };
}

type ToolDefinition = {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

type ToolCallback = (args: Record<string, unknown>) => Promise<unknown> | unknown;

interface SessionUpdateParams {
  instructions?: string;
  voice?: string;
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none';
  temperature?: number;
  input_audio_transcription?: {
    model: string;
    language?: string;
    prompt?: string;
  };
  turn_detection?: {
    type?: 'server_vad' | 'semantic_vad';
    eagerness?: 'low' | 'medium' | 'high' | 'auto';
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
    interrupt_response?: boolean;
  };
}

interface ResponseCreateMessage {
  type: 'response.create';
  response: {
    modalities: string[];
    instructions?: string;
    max_output_tokens?: number;
  };
}

export class RealtimeClient extends EventEmitter {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaStream: MediaStream | null = null;
  private audioTrack: MediaStreamTrack | null = null;
  private apiEndpoint: string;
  private model: string;
  private vadOptions: RealtimeClientOptions['vadOptions'];
  private sessionParams: SessionUpdateParams = {};
  private tools: Map<string, { definition: ToolDefinition; callback: ToolCallback }> = new Map();
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'closed' = 'disconnected';

  constructor(options: RealtimeClientOptions = {}) {
    super();
    console.debug('[RealtimeClient] constructor called', { options });
    this.apiEndpoint = options.apiEndpoint || '/api/realtime-api';
    this.model = options.model || 'gpt-4o-mini-realtime-preview';
    
    // Set default VAD options based on mode
    if (options.vadOptions?.type === 'semantic_vad' || !options.vadOptions?.type) {
      this.vadOptions = {
        type: 'semantic_vad',
        eagerness: options.vadOptions?.eagerness || 'high',
        interrupt_response: options.vadOptions?.interrupt_response || false
      };
    } else {
      // Server mode (now only used if explicitly requested)
      this.vadOptions = {
        type: 'server_vad',
        threshold: options.vadOptions?.threshold || 0.5,
        prefix_padding_ms: options.vadOptions?.prefix_padding_ms || 300,
        silence_duration_ms: options.vadOptions?.silence_duration_ms || 500,
        interrupt_response: options.vadOptions?.interrupt_response || false,
      };
    }
    
    // Initialize session params with VAD options
    if (this.vadOptions) {
      this.sessionParams.turn_detection = this.vadOptions;
    }
  }

  /**
   * Initialize the WebRTC connection with OpenAI's Realtime API
   */
  async connect(audioElement: HTMLAudioElement): Promise<void> {
    console.debug('[RealtimeClient] connect called', { connectionState: this.connectionState });
    if (this.connectionState === 'connected') {
      throw new Error('RealtimeClient is already connected');
    }

    this.connectionState = 'connecting';
    this.audioElement = audioElement;

    try {
      // Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioTracks = this.mediaStream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio track found in media stream');
      }
      this.audioTrack = audioTracks[0];

      // Create peer connection
      this.pc = new RTCPeerConnection();
      
      // Add data channel for messaging
      this.dc = this.pc.createDataChannel('oai-events');
      this.setupDataChannel();

      // Add local audio track
      this.pc.addTrack(this.audioTrack, this.mediaStream);
      
      // Handle incoming audio
      this.pc.ontrack = (event) => {
        if (this.audioElement && event.streams && event.streams[0]) {
          this.audioElement.srcObject = event.streams[0];
          this.audioElement.play().catch((error) => {
            console.error('Error playing audio:', error);
            this.emit('error', new Error('Failed to play audio'));
          });
        }
      };

      // Create and set local description (offer)
      await this.pc.setLocalDescription();
      
      // Wait for ICE gathering to complete
      await this.waitForIceGatheringComplete();
      
      if (!this.pc.localDescription) {
        throw new Error('Failed to create local description');
      }

      // Send offer to OpenAI via our server
      const response = await fetch(`${this.apiEndpoint}?model=${encodeURIComponent(this.model)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
        },
        body: this.pc.localDescription.sdp,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API responded with error: ${errorText}`);
      }

      // Get answer SDP
      const answerSdp = await response.text();
      const answer = { type: 'answer', sdp: answerSdp } as RTCSessionDescriptionInit;
      
      // Set remote description
      await this.pc.setRemoteDescription(answer);
      
      // Wait for connection to establish
      await this.waitForConnectionEstablished();
      
      this.connectionState = 'connected';
      this.emit('connected');
      
      // Session parameters will be applied when the data channel opens in setupDataChannel
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  /**
   * Close the WebRTC connection
   */
  async disconnect(): Promise<void> {
    console.debug('[RealtimeClient] disconnect called', { connectionState: this.connectionState });
    console.log('Disconnecting RealtimeClient...');
    
    // If already disconnected, just return
    if (this.connectionState === 'disconnected') {
      console.log('Already disconnected, nothing to do.');
      return;
    }

    // Mark as closed to prevent further operations
    this.connectionState = 'closed';
    
    try {
      // Close data channel
      if (this.dc) {
        try {
          console.log('Closing data channel...');
          this.dc.close();
        } catch (error) {
          console.error('Error closing data channel:', error);
        }
        this.dc = null;
      }
      
      // Stop media tracks
      if (this.mediaStream) {
        try {
          console.log('Stopping media tracks...');
          this.mediaStream.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (trackError) {
              console.error('Error stopping track:', trackError);
            }
          });
        } catch (mediaError) {
          console.error('Error handling media stream:', mediaError);
        }
        this.mediaStream = null;
      }
      
      // Close peer connection
      if (this.pc) {
        try {
          console.log('Closing peer connection...');
          this.pc.close();
        } catch (pcError) {
          console.error('Error closing peer connection:', pcError);
        }
        this.pc = null;
      }
    } catch (error) {
      console.error('Error during disconnect:', error);
    } finally {
      // Always clean up resources and update state
      this.audioTrack = null;
      this.connectionState = 'disconnected';
      this.emit('disconnected');
      console.log('Disconnect completed.');
    }
  }

  /**
   * Update session parameters
   */
  updateSession(params: SessionUpdateParams): void {
    // Store params for later if not connected
    Object.assign(this.sessionParams, params);
    
    if (this.connectionState !== 'connected' || !this.dc) {
      return;
    }
    
    const message = {
      type: 'session.update',
      session: { ...params }
    };
    
    try {
      if (this.dc.readyState === 'open') {
        this.dc.send(JSON.stringify(message));
      } else {
        console.warn('Cannot update session: data channel is not open', this.dc.readyState);
        this.emit('error', new Error(`Data channel not ready (state: ${this.dc.readyState})`));
      }
    } catch (error) {
      console.error('Error sending session update:', error);
      this.emit('error', error);
    }
  }

  /**
   * Add a tool that can be called by the model
   */
  addTool(definition: ToolDefinition, callback: ToolCallback): void {
    this.tools.set(definition.name, { definition, callback });
    
    // Update tools in session if already connected
    if (this.connectionState === 'connected' && this.dc?.readyState === 'open') {
      const tools = Array.from(this.tools.values()).map(t => t.definition);
      this.updateSession({ tools });
    } else {
      // Store tools for later when connection is established
      const tools = Array.from(this.tools.values()).map(t => t.definition);
      Object.assign(this.sessionParams, { tools });
    }
  }

  /**
   * Create a response from the model
   */
  createResponse(instructions?: string): void {
    if (!this.isConnected()) {
      const error = new Error(`Cannot create response: client is not connected (state: ${this.connectionState})`);
      this.emit('error', error);
      throw error;
    }
    
    const message: ResponseCreateMessage = {
      type: 'response.create',
      response: {
        modalities: ['text', 'audio']
      }
    };
    
    if (instructions) {
      message.response.instructions = instructions;
    }
    
    try {
      this.dc!.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending response.create message:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Cancel the current response
   */
  cancelResponse(): void {
    if (this.connectionState !== 'connected' || !this.dc || this.dc.readyState !== 'open') {
      return;
    }
    
    const message = {
      type: 'response.cancel'
    };
    
    try {
      this.dc.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending response.cancel message:', error);
      this.emit('error', error);
    }
  }

  /**
   * Check if the client is connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected' && 
           this.pc !== null &&
           this.dc?.readyState === 'open';
  }

  /**
   * Handle server-side error message
   */
  private handleServerError(message: Record<string, unknown>): void {
    if (message && typeof message === 'object' && message.type === 'error') {
      console.error('Server sent error message:', message);
      
      // Extract error details from OpenAI's response
      const serverError = message.error;
      let errorMessage = 'Server returned an error';
      let errorCode: string | number = 'unknown_error';
      
      if (typeof serverError === 'object' && serverError !== null) {
        if ('message' in serverError && serverError.message) {
          errorMessage = String(serverError.message);
        }
        
        if ('code' in serverError && serverError.code) {
          errorCode = typeof serverError.code === 'string' || typeof serverError.code === 'number'
            ? serverError.code
            : 'unknown_error';
          if (!errorMessage.includes(String(errorCode))) {
            errorMessage = `Error ${errorCode}: ${errorMessage}`;
          }
        }
        
        // Log additional details if available
        if ('type' in serverError) {
          console.error(`Error type: ${serverError.type}`);
        }
      }
      
      const error = new Error(errorMessage);
      // Add error code as a property to the error object
      (error as Error & { code: string | number }).code = errorCode;
      
      this.emit('error', error);
      
      // For certain critical errors, disconnect automatically
      const criticalErrorCodes = ['invalid_api_key', 'invalid_model', 'server_error'];
      if (typeof errorCode === 'string' && criticalErrorCodes.includes(errorCode)) {
        console.warn('Critical error received from server, disconnecting...');
        this.disconnect().catch(disconnectError => {
          console.error('Error during automatic disconnect:', disconnectError);
        });
      }
    }
  }

  /**
   * Setup data channel event handlers
   */
  private setupDataChannel(): void {
    if (!this.dc) return;

    this.dc.onopen = () => {
      console.log('WebRTC data channel opened');
      this.emit('datachannel_open');
      
      // Apply stored session parameters now that the channel is open
      if (Object.keys(this.sessionParams).length > 0) {
        try {
          const message = {
            type: 'session.update',
            session: { ...this.sessionParams }
          };
          
          if (this.dc && this.dc.readyState === 'open') {
            this.dc.send(JSON.stringify(message));
          } else {
            console.warn('Data channel was opened but is no longer available or ready');
          }
        } catch (error) {
          console.error('Error sending initial session parameters:', error);
          this.emit('error', error);
        }
      }
    };

    this.dc.onclose = () => {
      console.log('WebRTC data channel closed');
      this.emit('datachannel_close');
    };

    this.dc.onerror = (event) => {
      console.error('WebRTC data channel error:', event);
      const errorMessage = event instanceof Event ? event.type : 'unknown error';
      this.emit('error', new Error(`Data channel error: ${errorMessage}`));
    };

    this.dc.onmessage = async (event) => {
      try {
        // Log raw message for debugging
        const rawData = event.data;
        if (typeof rawData === 'string' && rawData.length > 1000) {
          console.log('Received large message, length:', rawData.length);
        } else {
          console.log('Received raw message:', rawData.substring ? rawData.substring(0, 200) + (rawData.length > 200 ? '...' : '') : rawData);
        }
        
        // Try to parse the JSON message
        const message = JSON.parse(rawData) as Record<string, unknown>;
        
        // Check for error messages from server
        if (message.type === 'error') {
          this.handleServerError(message);
        }
        
        // Handle function calls from the model
        if (message.type === 'response.function_call_arguments.done') {
          const name = message.name as string;
          const callId = message.call_id as string || 'unknown_call_id';
          const args = message.arguments as string | undefined;
          let parsedArgs: Record<string, unknown> = {};
          
          // Emit an event for tool call starting
          this.emit('tool_call_start', { name, callId });
          
          try {
            // Parse arguments with better error handling
            if (args) {
              parsedArgs = JSON.parse(args) as Record<string, unknown>;
            }
          } catch (argError) {
            console.error(`Error parsing function arguments for ${name}:`, argError);
            console.log('Failed to parse arguments:', args);
            
            // Emit a tool call error event
            this.emit('tool_call_error', { name, error: argError });
            
            // Try to recover by removing any truncated portions or fixing common JSON issues
            if (args) {
              // Attempt to fix common JSON issues
              const fixedArgs = this.attemptToFixJson(args);
              try {
                parsedArgs = JSON.parse(fixedArgs) as Record<string, unknown>;
                console.log('Successfully parsed arguments after fixing JSON');
              } catch (_fixError) {
                // Still failed, use empty object
                console.error('Failed to fix and parse arguments, using empty object instead:', _fixError);
                parsedArgs = {};
              }
            }
          }
          
          const tool = this.tools.get(name);
          if (tool) {
            try {
              const result = await tool.callback(parsedArgs);
              
              if (this.dc && this.dc.readyState === 'open') {
                // Send the result using the conversation.item.create message type
                this.dc.send(JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: callId,
                    output: typeof result === 'string' ? result : JSON.stringify(result)
                  }
                }));
                
                // Emit a tool call complete event
                this.emit('tool_call_complete', { name, callId, result });
              } else {
                console.warn('Cannot send function call result: data channel not open');
                this.emit('tool_call_error', { name, error: new Error('Data channel not open') });
              }
            } catch (error) {
              console.error(`Error executing function ${name}:`, error);
              
              // Emit a tool call error event
              this.emit('tool_call_error', { name, error });
              
              if (this.dc && this.dc.readyState === 'open') {
                // Send the error using the conversation.item.create message type
                this.dc.send(JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: callId,
                    output: JSON.stringify({
                      error: error instanceof Error ? error.message : String(error)
                    })
                  }
                }));
              } else {
                console.warn('Cannot send function call error: data channel not open');
              }
            }
          } else {
            // Emit error for unknown tool
            this.emit('tool_call_error', { 
              name, 
              error: new Error(`Unknown tool: ${name}`) 
            });
          }
        }
        
        // Forward all messages as events
        this.emit(message.type as string, message);
        this.emit('message', message);
      } catch (error) {
        console.error('Error processing message:', error);
        
        // Provide more context about the parsing error
        if (error instanceof SyntaxError && event.data && typeof event.data === 'string') {
          console.error('JSON parsing error. Message preview:', 
            event.data.substring(0, 100) + (event.data.length > 100 ? '...' : ''));
          
          // Try to identify the problematic section
          const errorMatch = /position (\d+)/.exec(error.message);
          if (errorMatch && errorMatch[1]) {
            const position = parseInt(errorMatch[1], 10);
            const start = Math.max(0, position - 20);
            const end = Math.min(event.data.length, position + 20);
            console.error(`Problem area (around position ${position}):`, 
              event.data.substring(start, position) + ' >>> ERROR HERE <<< ' + event.data.substring(position, end));
          }
        }
        
        this.emit('error', error);
      }
    };
  }

  /**
   * Wait for ICE gathering to complete
   */
  private waitForIceGatheringComplete(): Promise<void> {
    if (!this.pc) {
      return Promise.reject(new Error('No peer connection'));
    }
    
    // If already complete, resolve immediately
    if (this.pc.iceGatheringState === 'complete') {
      return Promise.resolve();
    }
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('ICE gathering timed out'));
      }, 10000);
      
      this.pc!.addEventListener('icegatheringstatechange', () => {
        if (this.pc?.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
  }

  /**
   * Wait for connection to establish
   */
  private waitForConnectionEstablished(): Promise<void> {
    if (!this.pc) {
      return Promise.reject(new Error('No peer connection'));
    }
    
    // If already connected, resolve immediately
    if (this.pc.connectionState === 'connected') {
      return Promise.resolve();
    }
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection establishment timed out'));
      }, 10000);
      
      this.pc!.addEventListener('connectionstatechange', () => {
        if (this.pc?.connectionState === 'connected') {
          clearTimeout(timeout);
          resolve();
        } else if (this.pc?.connectionState === 'failed') {
          clearTimeout(timeout);
          reject(new Error('Connection failed'));
        }
      });
    });
  }

  /**
   * Attempt to fix common JSON syntax issues
   */
  private attemptToFixJson(json: string): string {
    let fixed = json;
    
    // Try to fix common issues:
    // 1. Unclosed quotes
    const quoteMatches = fixed.match(/"/g);
    if (quoteMatches && quoteMatches.length % 2 !== 0) {
      // Uneven number of quotes, try to add closing quote at the end
      fixed = fixed + '"';
    }
    
    // 2. Truncated JSON - try to properly close objects/arrays
    // Count opening and closing braces
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      // Add missing closing braces
      fixed = fixed + '}'.repeat(openBraces - closeBraces);
    }
    
    // Count opening and closing brackets
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;
    if (openBrackets > closeBrackets) {
      // Add missing closing brackets
      fixed = fixed + ']'.repeat(openBrackets - closeBrackets);
    }
    
    return fixed;
  }
  
  /**
   * Update voice activity detection settings
   */
  updateVadSettings(vadOptions: {
    type?: 'server_vad' | 'semantic_vad';
    // For semantic VAD
    eagerness?: 'low' | 'medium' | 'high' | 'auto';
    // For server VAD
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
  }): void {
    if (vadOptions.type === 'semantic_vad') {
      this.vadOptions = {
        type: 'semantic_vad',
        eagerness: vadOptions.eagerness || this.vadOptions?.eagerness || 'medium',
        interrupt_response: false
      };
    } else {
      this.vadOptions = {
        type: 'server_vad',
        threshold: vadOptions.threshold || this.vadOptions?.threshold || 0.5,
        prefix_padding_ms: vadOptions.prefix_padding_ms || this.vadOptions?.prefix_padding_ms || 300,
        silence_duration_ms: vadOptions.silence_duration_ms || this.vadOptions?.silence_duration_ms || 500,
        interrupt_response: false
      };
    }
    
    // Update session parameters with new VAD settings
    this.updateSession({
      turn_detection: this.vadOptions
    });
    
    console.log('Updated VAD settings:', this.vadOptions);
  }

  /**
   * Send the current slide context (title and prompt/notes) to the AI
   */
  sendCurrentSlideContext(title: string, prompt: string): void {
    if (!this.isConnected()) {
      return;
    }
    
    try {
      // Use createResponse with instructions containing slide context
      const instructions = `Slide changed: "${title}"\nSlide notes: "${prompt}"\n\nRemember that your audio is likely muted - the user won't hear your voice responses. Focus on adding visual bullet points with animations like 'fade', 'slide', 'bounce', or 'emphasis'. Remain silent unless directly addressed with "hey, presentation assistant".`;
      this.createResponse(instructions);
    } catch (error) {
      console.error('Error sending slide context:', error);
      this.emit('error', error);
    }
  }

  /**
   * Inform the AI about mute state changes
   */
  sendMuteStateUpdate(isMuted: boolean): void {
    if (!this.isConnected()) {
      return;
    }
    
    try {
      let instructions = '';
      if (isMuted) {
        instructions = `Your audio has been muted by the user. The user will not hear your verbal responses, so focus entirely on visual updates to the slides. Use animated bullet points to communicate effectively without audio.`;
      } else {
        instructions = `Your audio has been unmuted by the user. You can now respond verbally when addressed directly with "hey, presentation assistant". Continue to focus primarily on visual slide updates.`;
      }
      this.createResponse(instructions);
    } catch (error) {
      console.error('Error sending mute state update:', error);
      this.emit('error', error);
    }
  }
}

// Interfaces for presentation tools callbacks
export interface PresentationToolCallbacks {
  onUpdateSlide?: (args: {
    title?: string;
    content?: string;
    bullets?: string[];
    codeBlocks?: string[];
    imagePrompt?: string;
    bulletAnimations?: { 
      text: string;
      animation: string; 
    }[];
  }) => Promise<unknown> | unknown;
  onClearSlide?: () => Promise<unknown> | unknown;
  onNextSlide?: () => Promise<unknown> | unknown;
  onPreviousSlide?: () => Promise<unknown> | unknown;
}

/**
 * Set up common presentation tools for a RealtimeClient instance
 */
export function setupPresentationTools(
  client: RealtimeClient,
  callbacks: PresentationToolCallbacks
): void {
  // Tool to update the slide content
  if (callbacks.onUpdateSlide) {
    client.addTool(
      {
        type: 'function',
        name: 'updateSlide',
        description: 'Update the slide content with new information',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'The title of the slide'
            },
            content: {
              type: 'string',
              description: 'The main content text for the slide'
            },
            bullets: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Bullet points for the slide'
            },
            bulletAnimations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: {
                    type: 'string',
                    description: 'The text of the bullet point'
                  },
                  animation: {
                    type: 'string',
                    description: 'The animation to use for this bullet (fade, slide, bounce, emphasis)'
                  }
                },
                required: ['text', 'animation']
              },
              description: 'Animated bullet points with animation style specification'
            },
            codeBlocks: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Code examples to include in the slide'
            },
            imagePrompt: {
              type: 'string',
              description: 'A description of an image that would complement the slide'
            }
          },
          required: []
        }
      },
      callbacks.onUpdateSlide
    );
  }
  
  // Tool to clear the current slide
  if (callbacks.onClearSlide) {
    client.addTool(
      {
        type: 'function',
        name: 'clearSlide',
        description: 'Clear the current slide content',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      callbacks.onClearSlide
    );
  }
  
  // Tool to advance to the next slide
  if (callbacks.onNextSlide) {
    client.addTool(
      {
        type: 'function',
        name: 'nextSlide',
        description: 'Advance to the next slide in the presentation',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      callbacks.onNextSlide
    );
  }
  
  // Tool to go back to the previous slide
  if (callbacks.onPreviousSlide) {
    client.addTool(
      {
        type: 'function',
        name: 'previousSlide',
        description: 'Go back to the previous slide in the presentation',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      callbacks.onPreviousSlide
    );
  }
}

/**
 * Presentation instruction options
 */
export interface PresentationInstructionsOptions {
  /** Voice to use for assistant responses */
  voice?: string;
  /** Temperature setting for the model (0.0-1.0) */
  temperature?: number;
  /** Role of the assistant (silent assistant vs interactive) */
  role?: 'silent' | 'interactive';
  /** Initial greeting to say when starting */
  initialGreeting?: string;
}

/**
 * Set up standard presentation instructions for the assistant
 * 
 * @param client The RealtimeClient instance
 * @param presentationContent The presentation content or notes to provide as context
 * @param options Additional options for the instructions
 * @returns The client for chaining
 */
export function setupPresentationInstructions(
  client: RealtimeClient,
  presentationContent?: string,
  options: PresentationInstructionsOptions = {}
): RealtimeClient {
  const {
    voice = 'coral',
    temperature = 0.7,
    role = 'silent'
  } = options;
  
  let instructions = '';
  
  if (role === 'silent') {
    instructions = `You are a silent AI presentation assistant that updates the slides in real time as the presenter speaks. Your audio is likely muted by the user, so focus on visual updates. Listen carefully to the presenter and follow these rules:
1. Use the "updateSlide" function to update the slide with each new bullet point while the presenter is talking. Don't change the slide title, just add new bullets.
2. Keep bullets concise and relevant to what the presenter is currently talking about
3. Use the bulletAnimations parameter to animate each bullet with an effect like 'fade', 'slide', 'bounce', or 'emphasis'
4. If you receive information about a new slide with a new title, use that as context for what the presenter is about to discuss
5. Use the "clearSlide" function only when the presenter has clearly moved to a different topic that doesn't align with the current slide title
6. Use the "nextSlide" function if the presenter explicitly asks to move to the next slide
7. Don't respond verbally or interrupt the presenter unless they say "hey, presentation assistant" as part of their sentence
8. Remember that the system will send you slide context information when slides change - use this to better understand the current presentation context
9. Since your audio is likely muted, focus on visual slide updates rather than verbal responses`;
  } else {
    instructions = `You are an interactive AI presentation assistant that helps the presenter control their slides. Note that your audio may be muted by the user.
Listen to the presenter and update the slides based on their commands.
Use the available tools to navigate between slides or update slide content.
When using updateSlide, always APPEND to the existing content and bullets rather than replacing them.
Use bulletAnimations to create dynamic, animated bullet points with effects like 'fade', 'slide', 'bounce', or 'emphasis'.
The system will send you slide context information when slides change - use this to better understand what the presenter is discussing.
Respond verbally when asked a direct question or when clarification is needed, but be aware the user may have muted your audio.`;
  }
  
  // Add presentation content as context if provided
  if (presentationContent) {
    instructions += `\n\nHere's the presentation content for context:\n${presentationContent}`;
  }
  
  // Update the session parameters
  client.updateSession({
    instructions,
    voice,
    temperature
  });
    
  return client;
} 
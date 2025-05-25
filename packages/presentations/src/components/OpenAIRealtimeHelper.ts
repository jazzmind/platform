import { RealtimeClient } from './RealtimeClient';

export interface VADSettings {
  type?: 'server_vad' | 'semantic_vad';
  eagerness?: 'low' | 'medium' | 'high' | 'auto';
  threshold?: number;
  prefix_padding_ms?: number;
  silence_duration_ms?: number;
  interrupt_response?: boolean;
}

// Match the interface used by RealtimeClient
export interface ToolDefinition {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface SessionUpdateParams {
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none';
  temperature?: number;
  instructions?: string;
}

export interface SlideTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  callback: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

export interface RealtimeSetupOptions {
  audioElement: HTMLAudioElement;
  modelName?: string;
  vadOptions?: VADSettings;
  onError?: (error: Error | string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onTranscript?: (transcript: { text: string; is_final: boolean }) => void;
  onToolCall?: (name: string, args: Record<string, unknown>) => void;
}

export async function setupRealtimeClient(options: RealtimeSetupOptions): Promise<RealtimeClient> {
  console.debug('[OpenAIRealtimeHelper] setupRealtimeClient called', { options });
  const {
    audioElement,
    modelName = 'gpt-4o-mini-realtime-preview',
    vadOptions = {
      type: 'semantic_vad',
      eagerness: 'medium',
      interrupt_response: true
    },
    onError,
    onConnected,
    onDisconnected,
    onTranscript,
    onToolCall
  } = options;
  
  // Create new realtime client
  console.debug('[OpenAIRealtimeHelper] Creating new RealtimeClient', { modelName, vadOptions });
  const client = new RealtimeClient({
    apiEndpoint: '/api/realtime-api',
    model: modelName,
    vadOptions
  });
  
  // Set up event listeners
  if (onError) {
    client.on('error', (error) => {
      console.error('Realtime client error:', error);
      
      // Handle different error formats
      if (typeof error === 'object' && error !== null && 'error' in error) {
        const serverError = error.error;
        const errorMessage = typeof serverError === 'object' && serverError !== null && 'message' in serverError 
          ? String(serverError.message)
          : 'Server returned an error';
        onError(errorMessage);
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        onError(errorMessage);
      }
    });
  }
  
  if (onTranscript) {
    client.on('transcript', (transcript) => {
      onTranscript(transcript);
    });
  }
  
  if (onConnected) {
    client.on('connected', onConnected);
  }

  if (onDisconnected) {
    client.on('disconnected', onDisconnected);
  }
  
  // Setup tool call handler if provided
  if (onToolCall) {
    client.on('tool_call', (name, args) => {
      onToolCall(name, args);
    });
  }
  
  // Connect to the realtime API
  try {
    console.debug('[OpenAIRealtimeHelper] Calling client.connect');
    await client.connect(audioElement);
    return client;
  } catch (error) {
    console.error('Failed to connect to realtime API:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (onError) {
      onError(errorMessage);
    }
    throw error;
  }
}

export function addPresentationTools(
  client: RealtimeClient, 
  tools: SlideTool[]
): void {
  // Add each tool to the client
  for (const tool of tools) {
    client.addTool(
      {
        type: 'function',
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      },
      tool.callback
    );
  }
}

export function updateSessionWithTools(
  client: RealtimeClient,
  params: SessionUpdateParams
): void {
  client.updateSession(params);
}

export function processSlideUpdateFunctionCall(
  content: string
): Record<string, unknown> | null {
  // Extract function call parameters from content string
  const functionMatch = content.match(/update_presentation\((\{.*\})\)/);
  if (functionMatch && functionMatch[1]) {
    try {
      return JSON.parse(functionMatch[1]);
    } catch (error) {
      console.error('Error parsing function call parameters:', error);
      return null;
    }
  }
  return null;
} 
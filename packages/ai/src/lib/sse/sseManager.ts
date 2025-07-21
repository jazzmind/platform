/**
 * Server-Sent Events (SSE) Management Library
 * 
 * Provides a robust, reusable SSE implementation with session management,
 * client tracking, and automatic cleanup. Built for Next.js 15 compatibility.
 */

import { randomUUID } from 'crypto';

export interface SSEClient {
  id: string;
  write: (data: string) => void;
  close: () => void;
  metadata?: Record<string, unknown>;
  connectedAt: Date;
  lastActivity: Date;
}

export interface SSESession {
  sessionId: string;
  channelId: string;
  clients: Set<SSEClient>;
  metadata: Record<string, unknown>;
  createdAt: Date;
  lastActivity: Date;
}

export interface SSEMessage {
  type: string;
  data: unknown;
  timestamp?: string;
  sessionId?: string;
}

export interface SSEChannelConfig {
  maxClients?: number;
  heartbeatInterval?: number;
  clientTimeout?: number;
  enableHeartbeat?: boolean;
  autoCleanup?: boolean;
}

// Global storage that persists across HMR
interface GlobalWithSSE {
  __sseManager?: {
    sessions: Map<string, SSESession>;
    channels: Map<string, SSEChannelConfig>;
    heartbeatIntervals: Map<string, NodeJS.Timeout>;
  };
}

const getGlobalSSE = (): NonNullable<GlobalWithSSE['__sseManager']> => {
  const globalWithSSE = globalThis as GlobalWithSSE;
  if (!globalWithSSE.__sseManager) {
    globalWithSSE.__sseManager = {
      sessions: new Map(),
      channels: new Map(),
      heartbeatIntervals: new Map(),
    };
  }
  return globalWithSSE.__sseManager;
};

export class SSEManager {
  private static readonly DEFAULT_CONFIG: Required<SSEChannelConfig> = {
    maxClients: 100,
    heartbeatInterval: 30000, // 30 seconds
    clientTimeout: 120000, // 2 minutes
    enableHeartbeat: true,
    autoCleanup: true,
  };

  /**
   * Create a new SSE session
   */
  static createSession(
    channelId: string,
    metadata: Record<string, unknown> = {},
    config?: SSEChannelConfig
  ): string {
    const sessionId = randomUUID();
    const global = getGlobalSSE();
    
    // Store channel config
    const channelConfig = { ...this.DEFAULT_CONFIG, ...config };
    global.channels.set(channelId, channelConfig);
    
    const session: SSESession = {
      sessionId,
      channelId,
      clients: new Set(),
      metadata,
      createdAt: new Date(),
      lastActivity: new Date(),
    };
    
    global.sessions.set(sessionId, session);
    
    // Start heartbeat if enabled
    if (channelConfig.enableHeartbeat) {
      this.startHeartbeat(channelId, channelConfig.heartbeatInterval);
    }
    
    console.log(`📡 SSE Session created: ${sessionId} on channel: ${channelId}`);
    return sessionId;
  }

  /**
   * Get session by ID
   */
  static getSession(sessionId: string): SSESession | undefined {
    return getGlobalSSE().sessions.get(sessionId);
  }

  /**
   * Get all sessions for a channel
   */
  static getChannelSessions(channelId: string): SSESession[] {
    const global = getGlobalSSE();
    return Array.from(global.sessions.values())
      .filter(session => session.channelId === channelId);
  }

  /**
   * Create an SSE client connection
   */
  static createClient(
    sessionId: string,
    metadata: Record<string, unknown> = {}
  ): SSEClient | null {
    const session = this.getSession(sessionId);
    if (!session) {
      console.error(`❌ Session not found: ${sessionId}`);
      return null;
    }

    const channelConfig = getGlobalSSE().channels.get(session.channelId);
    if (!channelConfig) {
      console.error(`❌ Channel config not found: ${session.channelId}`);
      return null;
    }

    // Check client limit
    if (session.clients.size >= (channelConfig.maxClients ?? 0)) {
      console.warn(`⚠️ Max clients reached for session: ${sessionId}`);
      return null;
    }

    const client: SSEClient = {
      id: randomUUID(),
      write: () => {}, // Will be set by the response stream
      close: () => {}, // Will be set by the response stream
      metadata,
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    session.clients.add(client);
    session.lastActivity = new Date();

    console.log(`🔌 SSE Client connected: ${client.id} to session: ${sessionId}`);
    console.log(`📊 Session now has ${session.clients.size} clients`);

    return client;
  }

  /**
   * Remove a client from a session
   */
  static removeClient(sessionId: string, clientId: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    const clientToRemove = Array.from(session.clients)
      .find(client => client.id === clientId);
    
    if (clientToRemove) {
      session.clients.delete(clientToRemove);
      session.lastActivity = new Date();
      
      console.log(`🔌 SSE Client disconnected: ${clientId} from session: ${sessionId}`);
      console.log(`📊 Session now has ${session.clients.size} clients`);
      
      // Auto-cleanup empty sessions
      const channelConfig = getGlobalSSE().channels.get(session.channelId);
      if (channelConfig?.autoCleanup && session.clients.size === 0) {
        this.deleteSession(sessionId);
      }
      
      return true;
    }

    return false;
  }

  /**
   * Broadcast message to all clients in a session
   */
  static broadcastToSession(sessionId: string, message: SSEMessage): number {
    const session = this.getSession(sessionId);
    if (!session) {
      console.warn(`⚠️ Session not found for broadcast: ${sessionId}`);
      return 0;
    }

    const messageString = this.formatSSEMessage(message);
    const clients = Array.from(session.clients);
    let successCount = 0;

    clients.forEach(client => {
      try {
        client.write(messageString);
        client.lastActivity = new Date();
        successCount++;
      } catch (error) {
        console.warn(`⚠️ Failed to send to client ${client.id}:`, error);
        session.clients.delete(client);
      }
    });

    session.lastActivity = new Date();
    
    console.log(`📡 Broadcasted to ${successCount}/${clients.length} clients in session: ${sessionId}`);
    return successCount;
  }

  /**
   * Broadcast message to all sessions in a channel
   */
  static broadcastToChannel(channelId: string, message: SSEMessage): number {
    const sessions = this.getChannelSessions(channelId);
    let totalSent = 0;

    sessions.forEach(session => {
      totalSent += this.broadcastToSession(session.sessionId, message);
    });

    console.log(`📡 Broadcasted to ${totalSent} clients across ${sessions.length} sessions in channel: ${channelId}`);
    return totalSent;
  }

  /**
   * Send message to a specific client
   */
  static sendToClient(sessionId: string, clientId: string, message: SSEMessage): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    const client = Array.from(session.clients)
      .find(c => c.id === clientId);
    
    if (!client) return false;

    try {
      client.write(this.formatSSEMessage(message));
      client.lastActivity = new Date();
      session.lastActivity = new Date();
      return true;
    } catch (error) {
      console.warn(`⚠️ Failed to send to client ${clientId}:`, error);
      session.clients.delete(client);
      return false;
    }
  }

  /**
   * Delete a session and cleanup resources
   */
  static deleteSession(sessionId: string): boolean {
    const global = getGlobalSSE();
    const session = global.sessions.get(sessionId);
    
    if (!session) return false;

    // Close all clients
    session.clients.forEach(client => {
      try {
        client.close();
      } catch (error) {
        console.warn(`⚠️ Error closing client ${client.id}:`, error);
      }
    });

    // Remove session
    const deleted = global.sessions.delete(sessionId);
    
    // Stop heartbeat if no more sessions on this channel
    const remainingSessions = this.getChannelSessions(session.channelId);
    if (remainingSessions.length === 0) {
      this.stopHeartbeat(session.channelId);
    }

    console.log(`🗑️ SSE Session deleted: ${sessionId}`);
    return deleted;
  }

  /**
   * Cleanup expired sessions and inactive clients
   */
  static cleanup(): void {
    const global = getGlobalSSE();
    const now = Date.now();
    let cleanedSessions = 0;
    let cleanedClients = 0;

    global.sessions.forEach((session, sessionId) => {
      const channelConfig = global.channels.get(session.channelId);
      if (!channelConfig) return;

      // Remove inactive clients
      const inactiveClients = Array.from(session.clients)
        .filter(client => now - client.lastActivity.getTime() > (channelConfig.clientTimeout ?? 0));
      
      inactiveClients.forEach(client => {
        session.clients.delete(client);
        cleanedClients++;
      });

      // Remove empty sessions if auto-cleanup is enabled
      if (channelConfig.autoCleanup && session.clients.size === 0) {
        this.deleteSession(sessionId);
        cleanedSessions++;
      }
    });

    if (cleanedSessions > 0 || cleanedClients > 0) {
      console.log(`🧹 SSE Cleanup: ${cleanedSessions} sessions, ${cleanedClients} clients removed`);
    }
  }

  /**
   * Get statistics about SSE usage
   */
  static getStats(): {
    totalSessions: number;
    totalClients: number;
    channelStats: Record<string, { sessions: number; clients: number }>;
  } {
    const global = getGlobalSSE();
    const channelStats: Record<string, { sessions: number; clients: number }> = {};
    let totalClients = 0;

    global.sessions.forEach(session => {
      if (!channelStats[session.channelId]) {
        channelStats[session.channelId] = { sessions: 0, clients: 0 };
      }
      channelStats[session.channelId].sessions++;
      channelStats[session.channelId].clients += session.clients.size;
      totalClients += session.clients.size;
    });

    return {
      totalSessions: global.sessions.size,
      totalClients,
      channelStats,
    };
  }

  /**
   * Create SSE Response stream for Next.js API routes
   */
  static createStream(
    sessionId: string,
    clientMetadata?: Record<string, unknown>
  ): Response | null {
    const client = this.createClient(sessionId, clientMetadata);
    if (!client) return null;

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      start(controller) {
        // Set up client functions
        client.write = (data: string) => {
          controller.enqueue(encoder.encode(data));
        };

        client.close = () => {
          controller.close();
        };

        // Send initial connection confirmation
        const welcomeMessage = SSEManager.formatSSEMessage({
          type: 'connected',
          data: { sessionId, clientId: client.id },
        });
        controller.enqueue(encoder.encode(welcomeMessage));
      },

      cancel() {
        // Cleanup when client disconnects
        SSEManager.removeClient(sessionId, client.id);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });
  }

  /**
   * Format message for SSE protocol
   */
  private static formatSSEMessage(message: SSEMessage): string {
    const timestamp = message.timestamp || new Date().toISOString();
    const messageWithTimestamp = { ...message, timestamp };
    
    return `data: ${JSON.stringify(messageWithTimestamp)}\n\n`;
  }

  /**
   * Start heartbeat for a channel
   */
  private static startHeartbeat(channelId: string, interval: number): void {
    const global = getGlobalSSE();
    
    // Clear existing heartbeat
    this.stopHeartbeat(channelId);
    
    const heartbeatInterval = setInterval(() => {
      const sessions = this.getChannelSessions(channelId);
      
      if (sessions.length === 0) {
        this.stopHeartbeat(channelId);
        return;
      }

      sessions.forEach(session => {
        this.broadcastToSession(session.sessionId, {
          type: 'heartbeat',
          data: { timestamp: new Date().toISOString() },
        });
      });
      
      // Trigger cleanup
      this.cleanup();
    }, interval);

    global.heartbeatIntervals.set(channelId, heartbeatInterval);
    console.log(`💓 Heartbeat started for channel: ${channelId}`);
  }

  /**
   * Stop heartbeat for a channel
   */
  private static stopHeartbeat(channelId: string): void {
    const global = getGlobalSSE();
    const interval = global.heartbeatIntervals.get(channelId);
    
    if (interval) {
      clearInterval(interval);
      global.heartbeatIntervals.delete(channelId);
      console.log(`💓 Heartbeat stopped for channel: ${channelId}`);
    }
  }
}


export const SSEChannels = {
  AI_TESTING: 'ai-testing',
  DOCUMENT_PROCESSING: 'document-processing',
  ORGANIZATION_SYNC: 'organization-sync',
  PROPOSAL_GENERATION: 'proposal-generation',
  CHAT_SESSIONS: 'chat-sessions',
} as const;

export type SSEChannelType = typeof SSEChannels[keyof typeof SSEChannels];

// Auto-cleanup interval (run every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    SSEManager.cleanup();
  }, 5 * 60 * 1000);
} 
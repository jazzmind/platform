/**
 * Base Agent Framework for ProposalHub AI System
 * 
 * Provides foundational interfaces and classes for the agentic AI architecture
 * using LangChain/LangGraph orchestration patterns.
 */

import { z } from 'zod';
import { CallbackManagerForChainRun } from '@langchain/core/callbacks/manager';
import { AIService } from '../aiService';

// Core Agent Types
export type AgentType = 
  | 'human_interface' 
  | 'document_sourcing' 
  | 'document_analysis' 
  | 'knowledge_management'
  | 'intent_dispatcher';

export type StepType = 
  | 'ai_call' 
  | 'processing' 
  | 'validation' 
  | 'human_decision' 
  | 'data_extraction'
  | 'workflow_routing';

// Agent Configuration Interface
export interface AgentConfig {
  enabled: boolean;
  maxRetries: number;
  timeoutMs: number;
  enableLogging: boolean;
  enableDebugLogging: boolean;
  logPrefix: string;
  capabilities?: AgentCapability[];
  metadata?: Record<string, unknown>;
}

// Agent Input/Output Interfaces
export interface AgentInput {
  data: Record<string, unknown>;
  context?: WorkflowContext;
  previousStep?: AgentOutput;
  userInput?: UserInput;
  metadata?: Record<string, unknown>;
}

export interface AgentOutput {
  success: boolean;
  data: Record<string, unknown>;
  nextStep?: string;
  humanInteraction?: HumanInteractionRequest;
  error?: Error;
  metadata?: {
    executionTime: number;
    tokensUsed?: number;
    confidence?: number;
    [key: string]: unknown;
  };
}

// Workflow Context
export interface WorkflowContext {
  workflowId: string;
  executionId: string;
  userId?: string;
  organizationId?: string;
  stepHistory: string[];
  sharedData: Record<string, unknown>;
  progressCallback?: (progress: WorkflowProgress) => void;
  sseSessionId?: string;
}

export interface WorkflowProgress {
  stage: string;
  current: number;
  total: number;
  message: string;
  metadata?: Record<string, unknown>;
}

// User Input Interface
export interface UserInput {
  type: 'text' | 'file' | 'selection' | 'approval';
  content: unknown;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

// Human Interaction Request
export interface HumanInteractionRequest {
  type: 'decision' | 'approval' | 'input' | 'review';
  prompt: string;
  options?: Array<{
    id: string;
    label: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }>;
  data: Record<string, unknown>;
  timeout?: number;
  required: boolean;
}

// Agent Capabilities
export interface AgentCapability {
  name: string;
  description: string;
  inputTypes: string[];
  outputTypes: string[];
  requirements?: string[];
}

// Validation Result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: Record<string, unknown>;
}

// Retry Policy
export interface RetryPolicy {
  maxAttempts: number;
  delayMs: number;
  backoffFactor: number;
  retryableErrors: string[];
}

/**
 * Abstract Base Agent Class
 * 
 * Provides common functionality for all AI agents in the system
 */
export abstract class BaseAgent extends AIService {
  protected agentType: AgentType;
  protected capabilities: AgentCapability[];
  
  constructor(agentType: AgentType, config: AgentConfig) {
    super({
      maxRetries: config.maxRetries || 3,
      timeoutMs: config.timeoutMs || 30000,
      enableLogging: config.enableLogging || true,
      enableDebugLogging: config.enableDebugLogging || false,
      logPrefix: config.logPrefix || agentType.toUpperCase(),
    });
    
    this.agentType = agentType;
    this.capabilities = config.capabilities || [];
    
    this.log(`${agentType} agent initialized with ${this.capabilities.length} capabilities`);
  }

  /**
   * Execute the agent's primary function
   */
  abstract execute(input: AgentInput): Promise<AgentOutput>;

  /**
   * Validate input before processing
   */
  abstract validate(input: AgentInput): ValidationResult;

  /**
   * Get agent capabilities
   */
  getCapabilities(): AgentCapability[] {
    return this.capabilities;
  }

  /**
   * Get agent type
   */
  getAgentType(): AgentType {
    return this.agentType;
  }

  /**
   * Check if agent can handle specific input type
   */
  canHandle(inputType: string): boolean {
    return this.capabilities.some(cap => 
      cap.inputTypes.includes(inputType)
    );
  }

  /**
   * Execute agent with comprehensive error handling and logging
   */
  async executeWithContext(
    input: AgentInput,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _callbackManager?: CallbackManagerForChainRun
  ): Promise<AgentOutput> {
    const startTime = Date.now();
    const executionId = `${this.agentType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      this.log(`Starting execution: ${executionId}`);
      
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        throw new Error(`Input validation failed: ${validation.errors.join(', ')}`);
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        this.log(`Validation warnings: ${validation.warnings.join(', ')}`);
      }

      // Execute agent logic
      const result = await this.execute(input);
      
      // Add execution metadata
      const executionTime = Date.now() - startTime;
      result.metadata = {
        executionTime,
        executionId,
        agentType: this.agentType,
        tokensUsed: result.metadata?.tokensUsed,
        confidence: result.metadata?.confidence,
        ...(result.metadata ? Object.fromEntries(
          Object.entries(result.metadata).filter(([key]) => 
            !['executionTime', 'tokensUsed', 'confidence'].includes(key)
          )
        ) : {}),
      } as typeof result.metadata;

      this.log(`Execution completed: ${executionId} (${result.metadata?.executionTime || 0}ms)`);
      
      return result;
      
    } catch (error) {
      const errorResult: AgentOutput = {
        success: false,
        data: {},
        error: error as Error,
        metadata: {
          executionTime: Date.now() - startTime,
          executionId,
          agentType: this.agentType,
        }
      };

      this.log(`Execution failed: ${executionId} - ${(error as Error).message}`);
      
      return errorResult;
    }
  }

  /**
   * Update workflow progress
   */
  protected updateProgress(
    context: WorkflowContext,
    stage: string,
    current: number,
    total: number,
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    if (context.progressCallback) {
      context.progressCallback({
        stage,
        current,
        total,
        message,
        metadata
      });
    }

    // Broadcast via SSE if session exists
    if (context.sseSessionId) {
      // Import SSEManager dynamically to avoid circular dependencies
      import('../../sse/sseManager').then(({ SSEManager }) => {
        SSEManager.broadcastToSession(context.sseSessionId!, {
          type: 'agent-progress',
          data: {
            agentType: this.agentType,
            stage,
            current,
            total,
            message,
            metadata,
            timestamp: new Date().toISOString()
          }
        });
      }).catch(error => {
        console.warn('Failed to broadcast agent progress:', error);
      });
    }
  }

  /**
   * Request human interaction
   */
  protected requestHumanInteraction(
    type: HumanInteractionRequest['type'],
    prompt: string,
    options?: HumanInteractionRequest['options'],
    data: Record<string, unknown> = {},
    required: boolean = true
  ): HumanInteractionRequest {
    return {
      type,
      prompt,
      options,
      data,
      required,
      timeout: 300000 // 5 minutes default
    };
  }

  /**
   * Create successful output
   */
  protected createSuccessOutput(
    data: Record<string, unknown>,
    nextStep?: string,
    metadata?: Record<string, unknown>
  ): AgentOutput {
    return {
      success: true,
      data,
      nextStep,
      metadata: metadata ? {
        executionTime: 0,
        ...metadata
      } : undefined
    };
  }

  /**
   * Create error output
   */
  protected createErrorOutput(
    error: Error,
    data: Record<string, unknown> = {},
    metadata?: Record<string, unknown>
  ): AgentOutput {
    return {
      success: false,
      data,
      error,
      metadata: metadata ? {
        executionTime: 0,
        ...metadata
      } : undefined
    };
  }

  /**
   * Broadcast agent completion via SSE
   */
  protected broadcastCompletion(
    context: WorkflowContext | undefined,
    agentData: Record<string, unknown>,
    tokensUsed?: number,
    cost?: number
  ): void {
    if (context?.sseSessionId) {
      // Import SSEManager dynamically to avoid circular dependencies
      import('../../sse/sseManager').then(({ SSEManager }) => {
        SSEManager.broadcastToSession(context.sseSessionId!, {
          type: 'agent-complete',
          data: {
            agentType: this.agentType,
            result: agentData,
            debugInfo: {
              tokensUsed,
              cost
            },
            timestamp: new Date().toISOString()
          }
        });
      }).catch(error => {
        console.warn('Failed to broadcast agent completion:', error);
      });
    }
  }

  /**
   * Broadcast AI debug information in real-time
   */
  protected broadcastAIDebug(
    context: WorkflowContext | undefined,
    prompt?: string,
    response?: string,
    tokensUsed?: number,
    cost?: number,
    stage?: string
  ): void {
    if (context?.sseSessionId) {
      import('../../sse/sseManager').then(({ SSEManager }) => {
        SSEManager.broadcastToSession(context.sseSessionId!, {
          type: 'agent-progress',
          data: {
            agentType: this.agentType,
            agentName: `${this.agentType?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Agent`,
            stage: stage || 'ai-operation',
            message: `AI operation completed${stage ? ` (${stage})` : ''}`,
            debugInfo: {
              prompt,
              response,
              tokensUsed,
              cost
            },
            timestamp: new Date().toISOString()
          }
        });
      }).catch(error => {
        console.warn('Failed to broadcast AI debug info:', error);
      });
    }
  }

  /**
   * Log with agent context and optional SSE broadcasting
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info', context?: WorkflowContext): void {
    const timestamp = new Date().toISOString();
    const agentName = this.agentType?.toUpperCase() || 'AGENT';
    const logMessage = `[${timestamp}] [${agentName}] ${message}`;
    
    switch (level) {
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
        console.error(logMessage);
        break;
      default:
        console.log(logMessage);
    }

    // Broadcast via SSE if session exists
    if (context?.sseSessionId) {
      // Import SSEManager dynamically to avoid circular dependencies
      import('../../sse/sseManager').then(({ SSEManager }) => {
        SSEManager.broadcastToSession(context.sseSessionId!, {
          type: 'agent-progress',
          data: {
            agentType: this.agentType,
            agentName: `${this.agentType?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Agent`,
            stage: 'processing',
            message,
            level,
            timestamp: new Date().toISOString()
          }
        });
      }).catch(error => {
        console.warn('Failed to broadcast agent log:', error);
      });
    }
  }
}

// Schema for agent input validation
export const AgentInputSchema = z.object({
  data: z.record(z.unknown()),
  context: z.object({
    workflowId: z.string(),
    executionId: z.string(),
    userId: z.string().optional(),
    organizationId: z.string().optional(),
    stepHistory: z.array(z.string()),
    sharedData: z.record(z.unknown()),
  }).optional(),
  previousStep: z.object({
    success: z.boolean(),
    data: z.record(z.unknown()),
    nextStep: z.string().optional(),
  }).optional(),
  userInput: z.object({
    type: z.enum(['text', 'file', 'selection', 'approval']),
    content: z.unknown(),
    timestamp: z.date(),
    userId: z.string().optional(),
    sessionId: z.string().optional(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export default BaseAgent; 
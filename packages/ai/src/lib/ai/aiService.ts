import { aiClient } from './aiClient';
import { z } from 'zod';
import { zodTextFormat } from 'openai/helpers/zod';
import { ResponseInput } from 'openai/resources/responses/responses.mjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Types for file input content
 */
export interface FileInputContent {
  type: 'input_file';
  file_id: string;
}

export interface TextInputContent {
  type: 'input_text';
  text: string;
}

export type InputContent = FileInputContent | TextInputContent;

/**
 * Standard error types for AI operations
 */
export enum AIErrorType {
  API_ERROR = 'api_error',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  VALIDATION = 'validation',
  PROCESSING = 'processing',
  NETWORK = 'network',
}

/**
 * Standardized AI error class
 */
export class AIError extends Error {
  constructor(
    public type: AIErrorType,
    message: string,
    public originalError?: Error,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIError';
  }

  static fromOpenAIError(error: unknown): AIError {
    const message = (error as { message?: string })?.message || 'Unknown OpenAI error';
    
    if ((error as { status?: number })?.status === 429) {
      return new AIError(AIErrorType.RATE_LIMIT, message, error as Error, true);
    }
    
    if ((error && typeof error === 'object' && 'status' in error && (error as { status: number })?.status >= 500)) {
      return new AIError(AIErrorType.API_ERROR, message, error as unknown as Error, true);
    }
    
    if ((error as { code?: string })?.code === 'timeout') {
      return new AIError(AIErrorType.TIMEOUT, message, error as Error, true);
    }
    
    return new AIError(AIErrorType.API_ERROR, message, error as Error, false);
  }
}

/**
 * Configuration for AI operations
 */
export interface AIServiceConfig {
  maxRetries?: number;
  timeoutMs?: number;
  backoffMultiplier?: number;
  enableLogging?: boolean;
  logPrefix?: string;
  organizationId?: string;
  sessionId?: string;
  enableDebugLogging?: boolean;
}

/**
 * Result wrapper for AI operations with metadata
 */
export interface AIResult<T> {
  data: T;
  metadata: {
    executionTimeMs: number;
    tokensUsed?: number;
    model?: string;
    retries: number;
    cached?: boolean;
  };
}

/**
 * Base class for all AI services providing common functionality
 */
export abstract class AIService {
  protected config: Required<Omit<AIServiceConfig, 'organizationId' | 'sessionId'>> & Pick<AIServiceConfig, 'organizationId' | 'sessionId'>;
  protected client = aiClient;
  protected sessionId: string;

  constructor(config: AIServiceConfig = {}) {
    // Enable debug logging by default in test mode
    const isTestMode = process.env.NODE_ENV === 'test' || process.env.AI_TEST_MODE === 'true';
    const defaultOrganizationId = isTestMode ? 'test-org-ai-debug' : undefined;
    
    // Use test session ID if available, otherwise generate new one
    const testSessionId = process.env.AI_TEST_SESSION_ID;
    const defaultSessionId = testSessionId || uuidv4();
    
    this.config = {
      maxRetries: 3,
      timeoutMs: 30000,
      backoffMultiplier: 2,
      enableLogging: true,
      logPrefix: this.constructor.name,
      enableDebugLogging: isTestMode, // Enable debug logging in test mode
      organizationId: config.organizationId || defaultOrganizationId,
      ...config,
    };
    this.sessionId = config.sessionId || defaultSessionId;
    
    if (isTestMode) {
      this.log(`🧪 Test mode detected - Debug logging enabled for session: ${this.sessionId}`);
      if (testSessionId) {
        this.log(`🔗 Using test session ID: ${testSessionId}`);
      }
    }
  }

  /**
   * Execute an AI operation with standardized error handling and retries
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    retryable: boolean = true
  ): Promise<AIResult<T>> {
    const startTime = Date.now();
    let lastError: Error = new Error('Unknown error');
    let retries = 0;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        this.log(`Starting ${operationName} (attempt ${attempt + 1}/${this.config.maxRetries + 1})`);
        
        const timeout = this.createTimeoutPromise<T>();
        let result: T;
        
        try {
          result = await Promise.race([
            operation(),
            timeout.promise
          ]);
        } finally {
          // Always clear the timeout to prevent Jest open handles
          timeout.clear();
        }

        const executionTime = Date.now() - startTime;
        this.log(`✅ ${operationName} completed in ${executionTime}ms`);

        return {
          data: result,
          metadata: {
            executionTimeMs: executionTime,
            retries: attempt,
          }
        };

      } catch (error) {
        lastError = error as Error;
        retries = attempt;
        
        const aiError = error instanceof AIError ? error : AIError.fromOpenAIError(error);
        
        this.log(`❌ ${operationName} failed (attempt ${attempt + 1}): ${aiError.message}`);
        
        // Don't retry if not retryable or on final attempt
        if (!retryable || !aiError.retryable || attempt === this.config.maxRetries) {
          break;
        }
        
        // Exponential backoff
        const delay = Math.pow(this.config.backoffMultiplier, attempt) * 1000;
        this.log(`⏳ Retrying in ${delay}ms...`);
        await this.delay(delay);
      }
    }

    const executionTime = Date.now() - startTime;
    this.log(`💥 ${operationName} failed after ${retries + 1} attempts in ${executionTime}ms`);
    
    throw lastError instanceof AIError ? lastError : AIError.fromOpenAIError(lastError);
  }

  /**
   * Validate input using Zod schema
   */
  protected validateInput<T>(data: unknown, schema: z.ZodSchema<T>, operationName: string): T {
    try {
      return schema.parse(data);
    } catch (error) {
      throw new AIError(
        AIErrorType.VALIDATION,
        `Invalid input for ${operationName}: ${error instanceof Error ? error.message : 'Unknown validation error'}`
      );
    }
  }

  /**
   * Create a timeout promise with cleanup capability
   */
  private createTimeoutPromise<T>(): { promise: Promise<T>; clear: () => void } {
    let timeoutId: NodeJS.Timeout | null = null;
    
    const promise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new AIError(AIErrorType.TIMEOUT, `Operation timed out after ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);
    });

    const clear = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    return { promise, clear };
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Standardized logging
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (!this.config.enableLogging) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] ${this.config.logPrefix}:`;
    
    switch (level) {
      case 'warn':
        console.warn(`${prefix} ⚠️  ${message}`);
        break;
      case 'error':
        console.error(`${prefix} ❌ ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Sanitize data to remove null bytes that PostgreSQL can't handle
   */
  private sanitizeForDatabase(obj: unknown): unknown {
    if (typeof obj === 'string') {
      return obj.replace(/\0/g, '\\u0000'); // Replace null bytes with escaped representation
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeForDatabase(item));
    }
    if (obj && typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeForDatabase(value);
      }
      return sanitized;
    }
    return obj;
  }

  /**
   * Log debug information to database
   */
  protected async logDebug(data: {
    operation: string;
    model?: string;
    input?: unknown;
    output?: unknown;
    metadata?: unknown;
    status: 'started' | 'success' | 'error' | 'timeout';
    errorMessage?: string;
    durationMs?: number;
    tokensUsed?: number;
  }): Promise<string | null> {
    if (!this.config.enableDebugLogging) return null;

    try {
      // Only import and use Prisma on server-side
      if (typeof window === 'undefined') {
        const { prisma } = await import('../database/prisma/client');
        
        // For test mode, make organizationId optional to avoid foreign key constraints
        const orgId = this.config.organizationId && this.config.organizationId !== 'test-org-ai-debug' 
          ? this.config.organizationId 
          : null;
        
        const result = await prisma.aIDebugLog.create({
          data: {
            organizationId: orgId,
            sessionId: this.sessionId,
            operation: data.operation,
            model: data.model,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            input: data.input ? this.sanitizeForDatabase(data.input) as any : null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            output: data.output ? this.sanitizeForDatabase(data.output) as any : null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            metadata: data.metadata ? this.sanitizeForDatabase(data.metadata) as any : null,
            status: data.status,
            errorMessage: data.errorMessage ? this.sanitizeForDatabase(data.errorMessage) as string : undefined,
            durationMs: data.durationMs,
            tokensUsed: data.tokensUsed,
          },
        });
        
        return result.id;
      }
    } catch (error) {
      // Don't let debug logging failures break the main operation
      this.log(`Failed to log debug info: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
    }
    
    return null;
  }

  /**
   * Update an existing debug log entry
   */
  protected async updateDebugLog(logId: string, data: {
    output?: unknown;
    status: 'success' | 'error' | 'timeout';
    errorMessage?: string;
    durationMs?: number;
    tokensUsed?: number;
  }): Promise<void> {
    if (!this.config.enableDebugLogging || !logId) return;

    try {
      if (typeof window === 'undefined') {
        const { prisma } = await import('../database/prisma/client');
        
        await prisma.aIDebugLog.update({
          where: { id: logId },
          data: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            output: data.output ? this.sanitizeForDatabase(data.output) as any : null,
            status: data.status,
            errorMessage: data.errorMessage ? this.sanitizeForDatabase(data.errorMessage) as string : undefined,
            durationMs: data.durationMs,
            tokensUsed: data.tokensUsed,
          },
        });
      }
    } catch (error) {
      this.log(`Failed to update debug log: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
    }
  }

  /**
   * Standardized wrapper for OpenAI responses.parse API
   * Provides a simple call(model, input, schema) interface with built-in error handling
   */
  protected async callAI<T>(
    model: string,
    input: ResponseInput,
    responseSchema: z.ZodSchema<T>,
    operationName: string,
    schemaName: string = 'response',
    options: {
      retryable?: boolean;
    } = {}
  ): Promise<T> {
    const { retryable = true } = options;
    const startTime = Date.now();

    // Create initial debug log entry with the prompt
    const logId = await this.logDebug({
      operation: operationName,
      model,
      input,
      status: 'started',
    });

    const operation = async () => {
      const response = await this.client.responses.parse({
        model,
        input,
        text: { format: zodTextFormat(responseSchema, schemaName) },
      });

      return response.output_parsed as T;
    };

    try {
      const result = await this.executeWithRetry(operation, operationName, retryable);
      const durationMs = Date.now() - startTime;
      
      // Update debug log with successful result
      if (logId) {
        await this.updateDebugLog(logId, {
          output: result.data,
          status: 'success',
          durationMs,
          tokensUsed: result.metadata.tokensUsed,
        });
      }

      return result.data;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const aiError = error instanceof AIError ? error : AIError.fromOpenAIError(error);
      
      // Update debug log with error
      if (logId) {
        await this.updateDebugLog(logId, {
          status: aiError.type === AIErrorType.TIMEOUT ? 'timeout' : 'error',
          errorMessage: aiError.message,
          durationMs,
        });
      }

      throw aiError;
    }
  }

  /**
   * Enhanced wrapper for OpenAI responses.parse API with file support
   * Handles file uploads and mixed content (files + text) inputs
   */
  protected async callAIWithFiles<T>(
    model: string,
    systemMessage: string,
    userContent: InputContent[],
    responseSchema: z.ZodSchema<T>,
    operationName: string,
    schemaName: string = 'response',
    options: {
      retryable?: boolean;
    } = {}
  ): Promise<T> {
    // Construct the proper input format for OpenAI responses.parse with files
    const input: ResponseInput = [
      {
        role: 'system',
        content: systemMessage,
      },
      {
        role: 'user',
        content: userContent,
      },
    ];

    return this.callAI(model, input, responseSchema, operationName, schemaName, options);
  }

  /**
   * Helper method to create file input content
   */
  protected createFileInput(fileId: string): FileInputContent {
    return {
      type: 'input_file',
      file_id: fileId,
    };
  }

  /**
   * Helper method to create text input content
   */
  protected createTextInput(text: string): TextInputContent {
    return {
      type: 'input_text',
      text,
    };
  }

  /**
   * Extract token usage from OpenAI response
   */
  protected extractTokenUsage(response: unknown): number | undefined {
    return (response as { usage?: { total_tokens?: number } })?.usage?.total_tokens;
  }

  /**
   * Extract model from OpenAI response
   */
  protected extractModel(response: unknown): string | undefined {
    return (response as { model?: string })?.model;
  }
}

/**
 * Common input validation schemas
 */
export const CommonSchemas = {
  nonEmptyString: z.string().min(1, 'String cannot be empty'),
  positiveNumber: z.number().positive('Number must be positive'),
  entityId: z.string().uuid('Invalid entity ID format'),
  entityType: z.enum(['opportunity', 'proposal', 'organization']),
  fileContent: z.object({
    content: z.string().min(1),
    metadata: z.record(z.unknown()).optional(),
  }),
} as const;

export default AIService; 
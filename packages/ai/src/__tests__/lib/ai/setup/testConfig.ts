import { PrismaClient } from '@prisma/client';
import { MODELS } from '../../../../lib/ai/models';

// Test configuration and environment setup
export const TEST_CONFIG = {
  // AI Model settings for testing
  models: {
    fast: MODELS.fast,
    default: MODELS.default,
    embedding: MODELS.embedding,
  },
  
  // API timeouts for testing
  timeouts: {
    embedding: 30000,      // 30 seconds for embedding generation
    completion: 60000,     // 60 seconds for text generation
    document: 120000,      // 2 minutes for document processing
    search: 15000,         // 15 seconds for search operations
  },
  
  // Test thresholds
  thresholds: {
    embeddingSimilarity: 0.7,    // Minimum cosine similarity for related content
    responseTime: 10000,         // Maximum acceptable response time (ms)
    qualityScore: 0.8,          // Minimum quality score for AI responses
  },
  
  // Test data limits
  limits: {
    maxTestDocs: 10,           // Maximum documents per test
    maxChunkSize: 1000,        // Maximum chunk size for testing
    batchSize: 5,              // Batch size for bulk operations
  },
  
  // Retry configuration for flaky AI API calls
  retry: {
    maxAttempts: 3,
    delayMs: 1000,
    backoffFactor: 2,
  },
};

// Environment validation
export function validateTestEnvironment(): void {
  const required = [
    'OPENAI_API_KEY',
    'DATABASE_URL',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate API key format
  if (!process.env.OPENAI_API_KEY?.startsWith('sk-')) {
    throw new Error('Invalid OpenAI API key format');
  }
}

// Test database setup
export async function setupTestDatabase(): Promise<PrismaClient> {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
    log: process.env.NODE_ENV === 'test' ? [] : ['query', 'error'],
  });
  
  await prisma.$connect();
  return prisma;
}

// Cleanup test database
export async function cleanupTestDatabase(prisma: PrismaClient): Promise<void> {
  // Clean up test data by ID pattern - safer approach
  const testFiles = await prisma.fileData.findMany({
    where: {
      id: {
        contains: 'test_',
      },
    },
  });
  
  if (testFiles.length > 0) {
    await prisma.fileData.deleteMany({
      where: {
        id: {
          in: testFiles.map(f => f.id),
        },
      },
    });
  }
  
  await prisma.$disconnect();
}

// Utility for retrying flaky AI operations
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number = TEST_CONFIG.retry.maxAttempts
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        break;
      }
      
      // Wait before retry with exponential backoff
      const delay = TEST_CONFIG.retry.delayMs * Math.pow(TEST_CONFIG.retry.backoffFactor, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error);
    }
  }
  
  throw new Error(`Operation failed after ${maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`);
}

// Generate test identifiers
export function generateTestId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Global test session management
let currentTestSessionId: string | null = null;

export function setTestSessionId(sessionId: string): void {
  currentTestSessionId = sessionId;
  process.env.AI_TEST_SESSION_ID = sessionId;
}

export function getTestSessionId(): string | null {
  return currentTestSessionId || process.env.AI_TEST_SESSION_ID || null;
}

export function clearTestSessionId(): void {
  currentTestSessionId = null;
  delete process.env.AI_TEST_SESSION_ID;
}

// Mock progress callback for testing
interface ProgressCallbackWithHistory {
  (progress: number): void;
  getProgress(): number[];
}

export function createMockProgressCallback(): ProgressCallbackWithHistory {
  const progress: number[] = [];
  
  const callback = (value: number) => {
    progress.push(value);
  };
  
  // Add method to get progress history
  (callback as ProgressCallbackWithHistory).getProgress = () => progress;
  
  return callback as ProgressCallbackWithHistory;
}

// Test assertion helpers
export const assertions = {
  isValidEmbedding: (embedding: number[]): boolean => {
    return Array.isArray(embedding) && 
           embedding.length > 0 && 
           embedding.every(n => typeof n === 'number' && !isNaN(n));
  },
  
  isValidResponse: (response: string): boolean => {
    return typeof response === 'string' && 
           response.trim().length > 0 && 
           response.length < 10000; // Reasonable upper bound
  },
  
  calculateCosineSimilarity: (a: number[], b: number[]): number => {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }
    
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    return dotProduct / (magnitudeA * magnitudeB);
  },
};

// Performance measurement
export class PerformanceTracker {
  private startTime: number = 0;
  private measurements: { [key: string]: number } = {};
  
  start(label: string = 'default'): void {
    this.startTime = Date.now();
    this.measurements[label] = this.startTime;
  }
  
  end(label: string = 'default'): number {
    const duration = Date.now() - this.measurements[label];
    delete this.measurements[label];
    return duration;
  }
  
  measure<T>(label: string, operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    this.start(label);
    return operation().then(result => ({
      result,
      duration: this.end(label),
    }));
  }
}

export default TEST_CONFIG; 
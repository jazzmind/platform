/* eslint-disable @typescript-eslint/no-namespace */

import { validateTestEnvironment } from './testConfig';

// Validate environment before running any tests
beforeAll(() => {
  validateTestEnvironment();
});

// Global test configuration
jest.setTimeout(300000); // 5 minutes for AI operations

// Custom Jest matchers for AI testing
expect.extend({
  toBeValidAIResponse(received: string) {
    const pass = typeof received === 'string' && 
                 received.trim().length > 0 && 
                 received.length < 10000;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid AI response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid AI response (non-empty string < 10000 chars)`,
        pass: false,
      };
    }
  },

  toHaveQualityScore(received: number, threshold: number) {
    const pass = received >= threshold;
    if (pass) {
      return {
        message: () => `expected quality score ${received} to be below ${threshold}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected quality score ${received} to be at least ${threshold}`,
        pass: false,
      };
    }
  },

  toHaveValidPerformance(received: number, threshold: number = 30000) {
    const pass = received <= threshold;
    if (pass) {
      return {
        message: () => `expected ${received}ms to exceed ${threshold}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received}ms to be under ${threshold}ms`,
        pass: false,
      };
    }
  },

  toHaveHighQualityScore(received: number, threshold: number = 0.7) {
    const pass = received >= threshold;
    if (pass) {
      return {
        message: () => `expected quality score ${received} to be below ${threshold}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected quality score ${received} to be at least ${threshold}`,
        pass: false,
      };
    }
  },
});

// Add types for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidAIResponse(): R;
      toHaveQualityScore(threshold: number): R;
      toHaveValidPerformance(threshold?: number): R;
      toHaveHighQualityScore(threshold?: number): R;
    }
  }
} 
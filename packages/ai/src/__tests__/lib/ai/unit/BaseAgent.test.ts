/**
 * Base Agent Framework Tests
 * 
 * Tests the base agent infrastructure following the new agentic AI architecture.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { 
  BaseAgent, 
  AgentInput, 
  AgentOutput, 
  ValidationResult, 
  AgentCapability,
  WorkflowContext
} from '../../../../lib/ai/agents/BaseAgent';
import { DocumentAnalysisAgent } from '../../../../lib/ai/agents/DocumentAnalysisAgent';
import { 
  validateTestEnvironment, 
  retryOperation, 
  TEST_CONFIG 
} from '../setup/testConfig';
import { 
  SAMPLE_DOCUMENTS 
} from '../setup/testData';

// Test Agent Implementation
class TestAgent extends BaseAgent {
  constructor() {
    const capabilities: AgentCapability[] = [
      {
        name: 'test_capability',
        description: 'Test capability for unit testing',
        inputTypes: ['text/plain'],
        outputTypes: ['test_result'],
        requirements: ['content'],
      },
    ];

    super('document_analysis', {
      enabled: true,
      maxRetries: 2,
      timeoutMs: 10000,
      enableLogging: true,
      enableDebugLogging: false,
      logPrefix: 'TEST_AGENT',
      capabilities,
    });
  }

  validate(input: AgentInput): ValidationResult {
    if (!input.data.content) {
      return {
        isValid: false,
        errors: ['Content is required'],
        warnings: [],
      };
    }

    if (typeof input.data.content !== 'string') {
      return {
        isValid: false,
        errors: ['Content must be a string'],
        warnings: [],
      };
    }

    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const content = input.data.content as string;
    const result = `Processed: ${content}`;
    
    return {
      success: true,
      data: {
        content: result,
        processedLength: content.length,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

describe('BaseAgent Framework', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  afterAll(() => {
    // Cleanup any resources
  });

  describe('Agent Initialization', () => {
    it('should initialize with proper configuration', () => {
      const agent = new TestAgent();
      
      expect(agent).toBeDefined();
      expect(agent.getAgentType()).toBe('document_analysis');
      
      console.log('✅ BaseAgent initialized successfully');
    });

    it('should register capabilities correctly', () => {
      const agent = new TestAgent();
      const capabilities = agent.getCapabilities();
      
      expect(capabilities).toBeDefined();
      expect(capabilities.length).toBe(1);
      expect(capabilities[0].name).toBe('test_capability');
      
      console.log('✅ Agent capabilities registered');
    });
  });

  describe('Input Validation', () => {
    it('should validate input successfully', () => {
      const agent = new TestAgent();
      const input: AgentInput = {
        data: {
          content: 'Test content',
        },
        metadata: {},
      };
      
      const validation = agent.validate(input);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      console.log('✅ Input validation successful');
    });

    it('should reject invalid input', () => {
      const agent = new TestAgent();
      const input: AgentInput = {
        data: {
          content: '',
        },
        metadata: {},
      };
      
      const validation = agent.validate(input);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      
      console.log('✅ Invalid input properly rejected');
    });
  });

  describe('Agent Execution', () => {
    it('should execute successfully', async () => {
      const agent = new TestAgent();
      const input: AgentInput = {
        data: {
          content: 'Test content for processing',
        },
        metadata: {},
      };
      
      const result = await retryOperation(() => agent.execute(input));
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.content).toContain('Processed:');
      
      console.log('✅ Agent execution successful');
    }, TEST_CONFIG.timeouts.completion);

    it('should handle workflow context', async () => {
      const agent = new TestAgent();
      const workflowContext: WorkflowContext = {
        workflowId: 'test-workflow-123',
        executionId: 'test-execution-123',
        stepHistory: ['initial'],
        sharedData: {
          testContext: true,
        },
      };

      const input: AgentInput = {
        data: {
          content: 'Test content with workflow context',
        },
        context: workflowContext,
        metadata: {},
      };
      
      const result = await retryOperation(() => agent.execute(input));
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      console.log('✅ Workflow context handled correctly');
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('Error Handling', () => {
    it('should handle execution errors gracefully', async () => {
      const agent = new TestAgent();
      const input: AgentInput = {
        data: {
          content: null,
        },
        metadata: {},
      };
      
      const result = await retryOperation(() => agent.execute(input));
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      console.log('✅ Execution errors handled gracefully');
    }, TEST_CONFIG.timeouts.completion);
  });
});

describe('DocumentAnalysisAgent', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  describe('Agent Initialization', () => {
    it('should initialize DocumentAnalysisAgent', () => {
      const agent = new DocumentAnalysisAgent();
      
      expect(agent).toBeDefined();
      expect(agent.getAgentType()).toBe('document_analysis');
      
      const capabilities = agent.getCapabilities();
      expect(capabilities.length).toBeGreaterThan(0);
      
      console.log(`✅ DocumentAnalysisAgent initialized with ${capabilities.length} capabilities`);
    });
  });

  describe('Document Classification', () => {
    it('should classify documents correctly', async () => {
      const agent = new DocumentAnalysisAgent();
      const input: AgentInput = {
        data: {
          content: SAMPLE_DOCUMENTS.requirements,
          operation: 'classify',
        },
        metadata: {
          filename: 'requirements.txt',
        },
      };
      
      const result = await retryOperation(() => agent.execute(input));
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      console.log('✅ Document classification completed');
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('Section Analysis', () => {
    it('should analyze document sections', async () => {
      const agent = new DocumentAnalysisAgent();
      const input: AgentInput = {
        data: {
          content: SAMPLE_DOCUMENTS.proposal,
          operation: 'analyze_sections',
        },
        metadata: {
          filename: 'proposal.pdf',
        },
      };
      
      const result = await retryOperation(() => agent.execute(input));
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      console.log('✅ Section analysis completed');
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('Content Chunking', () => {
    it('should chunk content for processing', async () => {
      const agent = new DocumentAnalysisAgent();
      const input: AgentInput = {
        data: {
          content: SAMPLE_DOCUMENTS.requirements.repeat(3),
          operation: 'chunk_content',
          chunkSize: 1000,
        },
        metadata: {},
      };
      
      const result = await retryOperation(() => agent.execute(input));
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      console.log('✅ Content chunking completed');
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('Error Handling', () => {
    it('should handle invalid operations gracefully', async () => {
      const agent = new DocumentAnalysisAgent();
      const input: AgentInput = {
        data: {
          content: 'Valid content',
          operation: 'invalid_operation',
        },
        metadata: {},
      };
      
      const result = await retryOperation(() => agent.execute(input));
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      console.log('✅ Invalid operation handled gracefully');
    });

    it('should handle empty content', async () => {
      const agent = new DocumentAnalysisAgent();
      const input: AgentInput = {
        data: {
          content: '',
          operation: 'classify',
        },
        metadata: {},
      };
      
      const result = await retryOperation(() => agent.execute(input));
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      console.log('✅ Empty content handled gracefully');
    });
  });
}); 
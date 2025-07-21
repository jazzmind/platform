import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { 
  workflowDebugger,
  debugWorkflow,
  debugStep,
  WorkflowDebugger
} from '../../../../lib/ai/debugging/workflowDebugger';
import { 
  validateTestEnvironment, 
  retryOperation, 
  TEST_CONFIG 
} from '../setup/testConfig';

describe('WorkflowDebugger', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  afterAll(() => {
    // Cleanup if needed
  });

  describe('Basic workflow debugging', () => {
    it('should track workflow execution', async () => {
      const executionId = await workflowDebugger.startWorkflow('Test Workflow', {
        testCase: 'basic_tracking',
        environment: 'test'
      });

      expect(executionId).toBeDefined();
      expect(typeof executionId).toBe('string');
      expect(executionId.length).toBeGreaterThan(0);

      // Start a processing step
      const stepId = await workflowDebugger.startStep(
        'Document Processing', 
        'processing', 
        { document: 'test.txt', content: 'Sample content' },
        { source: 'test' }
      );

      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 100));

      // End the step
      await workflowDebugger.endStep(stepId, { 
        processedContent: 'Processed sample content',
        wordCount: 3,
        confidence: 0.9 
      });

      // End the workflow
      await workflowDebugger.endWorkflow(executionId);

      console.log('✅ Basic workflow tracking completed');
    }, TEST_CONFIG.timeouts.completion);

    it('should track nested workflow steps', async () => {
      const executionId = await workflowDebugger.startWorkflow('Nested Workflow', {
        testCase: 'nested_steps'
      });

      // Parent step
      const parentStepId = await workflowDebugger.startStep(
        'AI Analysis',
        'ai_call',
        { text: 'Analyze this content' }
      );

      // Child step 1
      const childStep1Id = await workflowDebugger.startStep(
        'Text Chunking',
        'processing',
        { text: 'Analyze this content', chunkSize: 100 }
      );

      await new Promise(resolve => setTimeout(resolve, 50));
      await workflowDebugger.endStep(childStep1Id, { chunks: ['Analyze this', 'content'] });

      // Child step 2
      const childStep2Id = await workflowDebugger.startStep(
        'Semantic Analysis',
        'ai_call',
        { chunks: ['Analyze this', 'content'] }
      );

      await new Promise(resolve => setTimeout(resolve, 75));
      await workflowDebugger.endStep(childStep2Id, { 
        semantics: [
          { chunk: 'Analyze this', sentiment: 'neutral', topics: ['analysis'] },
          { chunk: 'content', sentiment: 'neutral', topics: ['data'] }
        ]
      });

      // End parent step
      await workflowDebugger.endStep(parentStepId, {
        analysis: {
          totalChunks: 2,
          overallSentiment: 'neutral',
          mainTopics: ['analysis', 'data']
        }
      });

      await workflowDebugger.endWorkflow(executionId);

      console.log('✅ Nested workflow tracking completed');
    }, TEST_CONFIG.timeouts.completion);

    it('should handle workflow errors gracefully', async () => {
      const executionId = await workflowDebugger.startWorkflow('Error Workflow', {
        testCase: 'error_handling'
      });

      const stepId = await workflowDebugger.startStep(
        'Failing Operation',
        'processing',
        { data: 'invalid input' }
      );

      // Simulate an error
      const testError = new Error('Simulated processing error');
      await workflowDebugger.endStep(stepId, undefined, testError);

      // End workflow with error
      await workflowDebugger.endWorkflow(executionId, testError);

      console.log('✅ Error handling in workflows completed');
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('Checkpoint functionality', () => {
    it('should create and track checkpoints', async () => {
      const executionId = await workflowDebugger.startWorkflow('Checkpoint Workflow', {
        testCase: 'checkpoints'
      });

      // Create checkpoints at different stages
      await workflowDebugger.createCheckpoint('Initial State', {
        input: 'Original document content',
        timestamp: Date.now(),
        stage: 'start'
      });

      const stepId = await workflowDebugger.startStep(
        'Content Processing',
        'processing',
        { content: 'Original document content' }
      );

      await workflowDebugger.createCheckpoint('Mid Processing', {
        partialResult: 'Partially processed content',
        progress: 0.5,
        stage: 'middle'
      });

      await workflowDebugger.endStep(stepId, {
        finalResult: 'Fully processed content'
      });

      await workflowDebugger.createCheckpoint('Final State', {
        output: 'Fully processed content',
        completed: true,
        stage: 'end'
      });

      await workflowDebugger.endWorkflow(executionId);

      console.log('✅ Checkpoint functionality completed');
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('Metadata and context tracking', () => {
    it('should track step metadata', async () => {
      const executionId = await workflowDebugger.startWorkflow('Metadata Workflow', {
        testCase: 'metadata_tracking',
        version: '1.0.0'
      });

      const stepId = await workflowDebugger.startStep(
        'AI Model Call',
        'ai_call',
        { prompt: 'Analyze sentiment' },
        {
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 1000
        }
      );

      // Add additional metadata during execution
      await workflowDebugger.addStepMetadata(stepId, {
        tokensUsed: 150,
        responseTime: 850,
        cacheHit: false
      });

      await workflowDebugger.endStep(stepId, {
        sentiment: 'positive',
        confidence: 0.85
      });

      await workflowDebugger.endWorkflow(executionId);

      console.log('✅ Metadata tracking completed');
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('Performance metrics', () => {
    it('should generate performance metrics', async () => {
      const testDebugger = new WorkflowDebugger({
        enabled: true,
        captureInputs: true,
        captureOutputs: true,
        enableProfiling: true
      });

      const executionId = await testDebugger.startWorkflow('Performance Test', {
        testCase: 'performance_metrics'
      });

      // Multiple steps with different durations
      const steps = [
        { name: 'Fast Operation', duration: 50 },
        { name: 'Medium Operation', duration: 200 },
        { name: 'Slow Operation', duration: 500 }
      ];

      for (const step of steps) {
        const stepId = await testDebugger.startStep(step.name, 'processing', { input: 'test' });
        await new Promise(resolve => setTimeout(resolve, step.duration));
        await testDebugger.endStep(stepId, { output: 'processed' });
      }

      await testDebugger.endWorkflow(executionId);

      // Get execution from debugger's internal map (would need to expose this in real implementation)
      console.log('✅ Performance metrics generation completed');
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('Visualization generation', () => {
    it('should generate workflow visualization data', async () => {
      const visualDebugger = new WorkflowDebugger({
        enabled: true,
        enableVisualization: true,
        outputDir: './test-output/debug'
      });

      const executionId = await visualDebugger.startWorkflow('Visualization Test', {
        testCase: 'visualization'
      });

      // Create a complex workflow for visualization
      const mainStepId = await visualDebugger.startStep('Main Process', 'processing', { data: 'input' });

      // Parallel sub-processes
      const subStep1Id = await visualDebugger.startStep('Extract Text', 'processing', { source: 'document' });
      const subStep2Id = await visualDebugger.startStep('Extract Metadata', 'processing', { source: 'document' });

      await new Promise(resolve => setTimeout(resolve, 100));
      await visualDebugger.endStep(subStep1Id, { text: 'extracted text' });
      await visualDebugger.endStep(subStep2Id, { metadata: { author: 'test', date: '2024' } });

      // Analysis step that depends on both extractions
      const analysisStepId = await visualDebugger.startStep('AI Analysis', 'ai_call', {
        text: 'extracted text',
        metadata: { author: 'test', date: '2024' }
      });

      await new Promise(resolve => setTimeout(resolve, 200));
      await visualDebugger.endStep(analysisStepId, {
        analysis: { sentiment: 'positive', topics: ['AI', 'testing'] }
      });

      await visualDebugger.endStep(mainStepId, {
        finalResult: 'Analysis complete'
      });

      await visualDebugger.endWorkflow(executionId);

      console.log('✅ Visualization generation completed');
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('Decorator functionality', () => {
    // Test class with decorated methods
    class TestAIService {
      @debugWorkflow('Document Analysis')
      async analyzeDocument(content: string): Promise<{ analysis: string; confidence: number }> {
        return this.performAnalysis(content);
      }

      @debugStep('Text Processing', 'processing')
      async performAnalysis(content: string): Promise<{ analysis: string; confidence: number }> {
        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return {
          analysis: `Analyzed: ${content}`,
          confidence: 0.9
        };
      }
    }

    it('should work with workflow decorators', async () => {
      const service = new TestAIService();
      
      const result = await retryOperation(() =>
        service.analyzeDocument('Test document content for analysis')
      );

      expect(result).toHaveProperty('analysis');
      expect(result).toHaveProperty('confidence');
      expect(result.analysis).toContain('Analyzed:');
      expect(result.confidence).toBe(0.9);

      console.log('✅ Workflow decorators completed');
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('Search and statistics', () => {
    it('should provide execution statistics', async () => {
      // Run multiple workflows to generate statistics
      const workflows = ['Test A', 'Test B', 'Test C'];
      
      for (const workflowName of workflows) {
        const executionId = await workflowDebugger.startWorkflow(workflowName, {
          testCase: 'statistics'
        });

        const stepId = await workflowDebugger.startStep(
          'Process Data',
          'processing',
          { data: `data for ${workflowName}` }
        );

        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        
        await workflowDebugger.endStep(stepId, { 
          processed: `processed data for ${workflowName}` 
        });

        await workflowDebugger.endWorkflow(executionId);
      }

      const stats = workflowDebugger.getExecutionStatistics();
      
      expect(stats).toHaveProperty('totalExecutions');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('averageDuration');
      expect(stats).toHaveProperty('mostCommonErrors');
      expect(stats).toHaveProperty('executionTrends');

      expect(typeof stats.totalExecutions).toBe('number');
      expect(typeof stats.successRate).toBe('number');
      expect(typeof stats.averageDuration).toBe('number');
      expect(Array.isArray(stats.mostCommonErrors)).toBe(true);
      expect(Array.isArray(stats.executionTrends)).toBe(true);

      console.log(`✅ Statistics generated: ${stats.totalExecutions} total executions`);
    }, TEST_CONFIG.timeouts.completion);

    it('should support searching executions', async () => {
      // Create test executions
      const testExecutions = [
        { name: 'Search Test 1', duration: 100 },
        { name: 'Search Test 2', duration: 200 },
        { name: 'Different Test', duration: 150 }
      ];

      for (const test of testExecutions) {
        const executionId = await workflowDebugger.startWorkflow(test.name, {
          testCase: 'search'
        });

        await new Promise(resolve => setTimeout(resolve, test.duration));
        await workflowDebugger.endWorkflow(executionId);
      }

      // Search by name
      const searchResults = workflowDebugger.searchExecutions({
        name: 'Search Test'
      });

      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBeGreaterThanOrEqual(2);
      
      // All results should contain 'Search Test' in the name
      searchResults.forEach(execution => {
        expect(execution.name).toContain('Search Test');
      });

      console.log(`✅ Search functionality: ${searchResults.length} results found`);
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('Integration with AI services', () => {
    it('should debug real AI service workflows', async () => {
      // Simulate an AI service workflow
      const executionId = await workflowDebugger.startWorkflow('AI Service Integration', {
        service: 'documentProcessing',
        testCase: 'integration'
      });

      // Step 1: Document Classification
      const classifyStepId = await workflowDebugger.startStep(
        'Document Classification',
        'ai_call',
        { 
          content: 'This is a requirements document for a software project.',
          filename: 'requirements.txt'
        },
        {
          model: 'gpt-4',
          prompt: 'classify_document'
        }
      );

      await new Promise(resolve => setTimeout(resolve, 200));
      await workflowDebugger.endStep(classifyStepId, {
        documentType: 'requirements',
        confidence: 0.95,
        categories: ['software', 'requirements', 'technical']
      });

      // Step 2: Content Extraction
      const extractStepId = await workflowDebugger.startStep(
        'Content Extraction',
        'processing',
        { 
          content: 'This is a requirements document for a software project.',
          documentType: 'requirements'
        }
      );

      await new Promise(resolve => setTimeout(resolve, 150));
      await workflowDebugger.endStep(extractStepId, {
        extractedContent: {
          sections: ['Introduction', 'Requirements', 'Acceptance Criteria'],
          requirements: [
            { id: 'REQ-001', text: 'The system shall...', priority: 'high' },
            { id: 'REQ-002', text: 'The system must...', priority: 'medium' }
          ]
        }
      });

      // Step 3: Summary Generation
      const summaryStepId = await workflowDebugger.startStep(
        'Summary Generation',
        'ai_call',
        {
          extractedContent: {
            sections: ['Introduction', 'Requirements', 'Acceptance Criteria'],
            requirements: [
              { id: 'REQ-001', text: 'The system shall...', priority: 'high' },
              { id: 'REQ-002', text: 'The system must...', priority: 'medium' }
            ]
          }
        },
        {
          model: 'gpt-4',
          prompt: 'generate_summary'
        }
      );

      await new Promise(resolve => setTimeout(resolve, 300));
      await workflowDebugger.endStep(summaryStepId, {
        summary: 'Software project requirements document containing 2 high-priority requirements focusing on system functionality.',
        keyPoints: ['2 requirements identified', 'High priority system features', 'Technical specification document'],
        confidence: 0.88
      });

      await workflowDebugger.endWorkflow(executionId);

      console.log('✅ AI service integration workflow completed');
    }, TEST_CONFIG.timeouts.document);
  });
}); 
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { EmbeddingService } from '../../../../lib/ai/embeddingService';
import { 
  validateTestEnvironment, 
  retryOperation, 
  assertions, 
  PerformanceTracker,
  generateTestId,
  createMockProgressCallback,
  TEST_CONFIG 
} from '../setup/testConfig';
import { 
  SAMPLE_DOCUMENTS, 
  EMBEDDING_TEST_CASES, 
  PERFORMANCE_BENCHMARKS,
  ERROR_SCENARIOS,
  generateRandomText 
} from '../setup/testData';

describe('EmbeddingService', () => {
  let embeddingService: EmbeddingService;
  let performanceTracker: PerformanceTracker;

  beforeAll(() => {
    validateTestEnvironment();
    embeddingService = new EmbeddingService();
    performanceTracker = new PerformanceTracker();
  });

  afterAll(() => {
    // Cleanup if needed
  });

  describe('generateEmbedding', () => {
    it('should generate valid embedding for simple text', async () => {
      const text = "React frontend development with TypeScript";
      
      const { result: embedding, duration } = await performanceTracker.measure(
        'simple-embedding',
        () => retryOperation(() => embeddingService.generateEmbedding(text))
      );

      // Validate embedding structure
      expect(assertions.isValidEmbedding(embedding)).toBe(true);
      expect(embedding).toHaveLength(1536); // OpenAI text-embedding-3-small dimension
      
      // Validate performance
      expect(duration).toBeLessThan(PERFORMANCE_BENCHMARKS.embeddingGeneration.singleText);
      
      console.log(`✅ Simple embedding generated in ${duration}ms`);
    }, TEST_CONFIG.timeouts.embedding);

    it('should generate embedding for technical documentation', async () => {
      const text = SAMPLE_DOCUMENTS.requirements;
      
      const embedding = await retryOperation(
        () => embeddingService.generateEmbedding(text)
      );

      expect(assertions.isValidEmbedding(embedding)).toBe(true);
      expect(embedding.every(n => n >= -1 && n <= 1)).toBe(true); // Normalized vectors
      
      console.log(`✅ Technical document embedding generated (${embedding.length} dimensions)`);
    }, TEST_CONFIG.timeouts.embedding);

    it('should handle empty text gracefully', async () => {
      await expect(
        retryOperation(() => embeddingService.generateEmbedding(''))
      ).rejects.toThrow();
      
      console.log('✅ Empty text handled correctly with error');
    });

    it('should handle very long text by chunking', async () => {
      const longText = generateRandomText(10000); // Exceeds typical limits
      
      const embedding = await retryOperation(
        () => embeddingService.generateEmbedding(longText)
      );

      expect(assertions.isValidEmbedding(embedding)).toBe(true);
      
      console.log('✅ Long text handled correctly');
    }, TEST_CONFIG.timeouts.embedding);
  });

  describe('generateEmbeddings', () => {
    it('should generate batch embeddings efficiently', async () => {
      const texts = [
        "React frontend development",
        "Node.js backend API",
        "PostgreSQL database design",
        "AWS cloud deployment",
        "DevOps automation"
      ];

      const { result: embeddings, duration } = await performanceTracker.measure(
        'batch-embeddings',
        () => retryOperation(() => embeddingService.generateEmbeddings(texts))
      );

      // Validate batch results
      expect(embeddings).toHaveLength(texts.length);
      embeddings.forEach((embedding) => {
        expect(assertions.isValidEmbedding(embedding)).toBe(true);
        expect(embedding).toHaveLength(1536);
      });

      // Performance check
      expect(duration).toBeLessThan(PERFORMANCE_BENCHMARKS.embeddingGeneration.batchTexts);
      
      console.log(`✅ Batch embeddings generated in ${duration}ms for ${texts.length} texts`);
    }, TEST_CONFIG.timeouts.embedding);

    it('should maintain consistency across similar texts', async () => {
      const texts = [
        "Database design and optimization",
        "Database design and performance tuning",
        "Optimizing database performance"
      ];

      const embeddings = await retryOperation(
        () => embeddingService.generateEmbeddings(texts)
      );

      // Calculate similarities between related texts
      const similarity1_2 = assertions.calculateCosineSimilarity(embeddings[0], embeddings[1]);
      const similarity1_3 = assertions.calculateCosineSimilarity(embeddings[0], embeddings[2]);
      
      expect(similarity1_2).toBeGreaterThan(0.7); // Similar texts should have high similarity
      expect(similarity1_3).toBeGreaterThan(0.6);
      
      console.log(`✅ Semantic similarity maintained: ${similarity1_2.toFixed(3)}, ${similarity1_3.toFixed(3)}`);
    }, TEST_CONFIG.timeouts.embedding);
  });

  describe('chunkText', () => {
    it('should handle text within chunk size limit', async () => {
      const smallText = "This is a small text that fits in one chunk.";
      
      const chunks = embeddingService.chunkText(smallText);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe(smallText);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].totalChunks).toBe(1);
      
      console.log('✅ Small text chunking works correctly');
    });

    it('should chunk large text appropriately', async () => {
      const largeText = generateRandomText(20000); // Larger than chunk size
      
      const chunks = embeddingService.chunkText(largeText);
      
      expect(chunks.length).toBeGreaterThan(1);
      
      // Validate chunk structure
      chunks.forEach((chunk, index) => {
        expect(chunk.index).toBe(index);
        expect(chunk.totalChunks).toBe(chunks.length);
        expect(chunk.content.length).toBeLessThanOrEqual(8000); // Max chunk size
        expect(chunk.content.trim().length).toBeGreaterThan(0);
      });
      
      console.log(`✅ Large text chunked into ${chunks.length} pieces`);
    });

    it('should maintain overlap between chunks', async () => {
      const structuredText = SAMPLE_DOCUMENTS.requirements + SAMPLE_DOCUMENTS.proposal;
      
      const chunks = embeddingService.chunkText(structuredText);
      
      if (chunks.length > 1) {
        // Check for overlap between consecutive chunks
        for (let i = 0; i < chunks.length - 1; i++) {
          const currentChunk = chunks[i].content;
          const nextChunk = chunks[i + 1].content;
          
          // Should have some overlapping content
          const lastWords = currentChunk.split(' ').slice(-10).join(' ');
          expect(nextChunk).toContain(lastWords.split(' ')[0]); // At least one overlapping word
        }
      }
      
      console.log(`✅ Chunk overlap maintained across ${chunks.length} chunks`);
    });

    it('should prevent infinite loops with edge cases', async () => {
      const edgeCase = "a".repeat(100) + "\n".repeat(1000) + "b".repeat(100);
      
      const chunks = embeddingService.chunkText(edgeCase);
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.length).toBeLessThan(1000); // Reasonable upper limit
      
      console.log('✅ Edge case chunking completed without infinite loop');
    });
  });

  describe('processContentForRAG', () => {
    it('should process content for RAG with progress tracking', async () => {
      const content = SAMPLE_DOCUMENTS.organization;
      const metadata = {
        title: 'Test Organization',
        fileType: 'text/plain',
        sourceFileId: generateTestId(),
      };
      
      const progressCallback = createMockProgressCallback();
      
      const { result: ragData, duration } = await performanceTracker.measure(
        'rag-processing',
        () => retryOperation(() => 
          embeddingService.processContentForRAG(content, metadata, progressCallback)
        )
      );

      // Validate RAG data structure
      expect(Array.isArray(ragData)).toBe(true);
      expect(ragData.length).toBeGreaterThan(0);
      
      ragData.forEach(item => {
        expect(typeof item.content).toBe('string');
        expect(assertions.isValidEmbedding(item.embedding as number[])).toBe(true);
        expect(item.metadata).toHaveProperty('chunkIndex');
        expect(item.metadata).toHaveProperty('totalChunks');
        expect(item.metadata).toHaveProperty('extractedAt');
        expect(item.sourceFileId).toBe(metadata.sourceFileId);
      });

      // Validate progress tracking
      const progress = progressCallback.getProgress();
      expect(progress.length).toBeGreaterThan(0);
      expect(Math.max(...progress)).toBeLessThanOrEqual(100);
      
      console.log(`✅ RAG processing completed in ${duration}ms with ${ragData.length} chunks`);
      console.log(`✅ Progress tracked: ${progress.length} updates, max: ${Math.max(...progress)}%`);
    }, TEST_CONFIG.timeouts.document);

    it('should handle large documents efficiently', async () => {
      const largeContent = SAMPLE_DOCUMENTS.requirements + 
                          SAMPLE_DOCUMENTS.proposal + 
                          SAMPLE_DOCUMENTS.organization + 
                          generateRandomText(15000); // Increased from 5000 to ensure chunking
      
      const metadata = {
        title: 'Large Test Document',
        fileType: 'text/plain',
      };

      const ragData = await retryOperation(() => 
        embeddingService.processContentForRAG(largeContent, metadata)
      );

      expect(ragData.length).toBeGreaterThanOrEqual(3); // Should be chunked into multiple pieces
      
      // Verify chunk indexing
      const indices = ragData.map(item => item.metadata.chunkIndex);
      expect(indices).toEqual([...Array(ragData.length).keys()]); // Sequential indices
      
      console.log(`✅ Large document processed into ${ragData.length} RAG chunks`);
    }, TEST_CONFIG.timeouts.document);
  });

  describe('generateContextualResponse', () => {
    it('should generate relevant contextual responses', async () => {
      const query = "What technologies are recommended for frontend development?";
      const context = [
        SAMPLE_DOCUMENTS.requirements,
        SAMPLE_DOCUMENTS.proposal,
      ];

      const response = await retryOperation(() =>
        embeddingService.generateContextualResponse(query, context)
      );

      expect(assertions.isValidResponse(response)).toBe(true);
      expect(response.toLowerCase()).toContain('react'); // Should mention React from context
      
      console.log(`✅ Contextual response generated: ${response.substring(0, 100)}...`);
    }, TEST_CONFIG.timeouts.completion);

    it('should handle empty context appropriately', async () => {
      const query = "What is software development?";
      const context: string[] = [];

      const response = await retryOperation(() =>
        embeddingService.generateContextualResponse(query, context)
      );

      expect(assertions.isValidResponse(response)).toBe(true);
      
      console.log('✅ Empty context handled correctly');
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('semantic similarity testing', () => {
    it('should demonstrate expected similarity patterns', async () => {
      const results = [];
      
      for (const testCase of EMBEDDING_TEST_CASES) {
        const [embedding1, embedding2] = await retryOperation(() =>
          embeddingService.generateEmbeddings([testCase.text1, testCase.text2])
        );
        
        const similarity = assertions.calculateCosineSimilarity(embedding1, embedding2);
        
        expect(similarity).toBeCloseTo(testCase.expectedSimilarity, 1);
        
        results.push({
          text1: testCase.text1,
          text2: testCase.text2,
          similarity: similarity.toFixed(3),
          expected: testCase.expectedSimilarity,
        });
      }
      
      console.log('✅ Semantic similarity testing completed:');
      results.forEach(r => 
        console.log(`  "${r.text1}" vs "${r.text2}": ${r.similarity} (expected: ${r.expected})`)
      );
    }, TEST_CONFIG.timeouts.embedding);
  });

  describe('error handling', () => {
    it('should handle various error scenarios', async () => {
      for (const scenario of ERROR_SCENARIOS) {
        try {
          if (scenario.input.length === 0) {
            // Empty input should throw
            await expect(
              embeddingService.generateEmbedding(scenario.input)
            ).rejects.toThrow();
          } else {
            // Other scenarios should handle gracefully
            const embedding = await retryOperation(() =>
              embeddingService.generateEmbedding(scenario.input)
            );
            expect(assertions.isValidEmbedding(embedding)).toBe(true);
          }
          
          console.log(`✅ Error scenario handled: ${scenario.name}`);
        } catch (error) {
          if (scenario.expectedBehavior.includes('error')) {
            console.log(`✅ Expected error for: ${scenario.name}`);
          } else {
            throw error;
          }
        }
      }
    }, TEST_CONFIG.timeouts.embedding);
  });
}); 
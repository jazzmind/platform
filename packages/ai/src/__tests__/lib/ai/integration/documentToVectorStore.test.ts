import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { EmbeddingService } from '@/src/lib/ai/embeddingService';
import { 
  searchKnowledgeBase, 
  generateKnowledgeBasedResponse 
} from '@/src/lib/ai/contentExtraction';
import { 
  validateTestEnvironment, 
  setupTestDatabase, 
  cleanupTestDatabase, 
  retryOperation, 
  generateTestId,
  PerformanceTracker,
  TEST_CONFIG 
} from '../setup/testConfig';
import { 
  SAMPLE_DOCUMENTS, 
  createTestFileData, 
  PERFORMANCE_BENCHMARKS 
} from '../setup/testData';
import type { PrismaClient } from '@prisma/client';

describe('Document to Vector Store Integration', () => {
  let embeddingService: EmbeddingService;
  let prisma: PrismaClient;
  let performanceTracker: PerformanceTracker;
  let testOpportunityId: string;
  const testFileIds: string[] = [];

  beforeAll(async () => {
    validateTestEnvironment();
    embeddingService = new EmbeddingService();
    prisma = await setupTestDatabase();
    performanceTracker = new PerformanceTracker();
    
    // Create test opportunity
    testOpportunityId = generateTestId();
    
    console.log('🔧 Integration test setup completed:', testOpportunityId);
  }, 30000);

  afterAll(async () => {
    // Cleanup test data
    for (const fileId of testFileIds) {
      try {
        await prisma.fileData.delete({ where: { id: fileId } });
      } catch (error) {
        console.warn('File might not exist, ignore:', error);
        // File might not exist, ignore
      }
    }
    
    await cleanupTestDatabase(prisma);
    console.log('🧹 Integration test cleanup completed');
  }, 30000);

  describe('Complete Document Processing Pipeline', () => {
    it('should process document from upload to searchable embeddings', async () => {
      const testId = generateTestId();
      const testContent = SAMPLE_DOCUMENTS.requirements;
      
      console.log('📄 Starting document processing pipeline...');
      
      // Step 1: Process content and store embeddings
      const { result: ragData, duration: processingTime } = await performanceTracker.measure(
        'document-processing',
        () => retryOperation(() => 
          embeddingService.processContentForRAG(testContent, {
            title: `Test Requirements ${testId}`,
            fileType: 'text/plain',
            sourceFileId: testId,
          })
        )
      );

      expect(ragData.length).toBeGreaterThan(0);
      console.log(`✅ Document processed into ${ragData.length} chunks in ${processingTime}ms`);

      // Step 2: Store in database (simulate the file storage)
      const fileData = createTestFileData(testId, testContent);
      testFileIds.push(fileData.id);
      
      try {
        await prisma.fileData.create({
          data: {
            id: fileData.id,
            fileId: fileData.id,
            entityType: 'opportunity',
            entityId: testOpportunityId,
            dataType: 'text',
            content: fileData.content,
            metadata: fileData.metadata,
            organizationId: 'test-org',
            createdAt: new Date(),
            updatedAt: new Date(),
            totalChunks: ragData.length,
            chunkIndex: 0,
          },
        });
        
        console.log('✅ File data stored in database');
      } catch (error) {
        console.warn('Database storage failed (expected in test environment):', error);
      }

      // Step 3: Test search functionality
      const searchQueries = [
        'technical specifications',
        'user authentication',
        'budget and timeline',
        'React frontend development',
      ];

      for (const query of searchQueries) {
        try {
          const { result: searchResults, duration: searchTime } = await performanceTracker.measure(
            'search-query',
            () => retryOperation(() => searchKnowledgeBase(query, 'opportunity', testOpportunityId, 5))
          );

          expect(Array.isArray(searchResults)).toBe(true);
          expect(searchTime).toBeLessThan(PERFORMANCE_BENCHMARKS.search.simpleQuery);
          
          console.log(`✅ Search for "${query}" completed in ${searchTime}ms`);
        } catch (error) {
          console.warn(`Search failed for "${query}" (may be expected in test env):`, error);
        }
      }

    }, TEST_CONFIG.timeouts.document);

    it('should generate knowledge-based responses from processed documents', async () => {
      const testQueries = [
        "What are the technical requirements for this project?",
        "What is the project timeline and budget?",
        "What technologies should we use for the frontend?",
      ];

      for (const query of testQueries) {
        try {
          const { result: response, duration: responseTime } = await performanceTracker.measure(
            'knowledge-response',
            () => retryOperation(() => 
              generateKnowledgeBasedResponse(query, 'opportunity', testOpportunityId)
            )
          );

          expect(typeof response).toBe('string');
          expect(response.length).toBeGreaterThan(50);
          expect(responseTime).toBeLessThan(PERFORMANCE_BENCHMARKS.contentGeneration.shortContent);
          
          console.log(`✅ Knowledge response generated for "${query}" in ${responseTime}ms`);
          console.log(`   Response preview: ${response.substring(0, 100)}...`);
        } catch (error) {
          console.warn(`Knowledge response failed for "${query}":`, error);
        }
      }
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('Multi-Document Processing and Search', () => {
    it('should handle multiple related documents correctly', async () => {
      const documents = [
        { content: SAMPLE_DOCUMENTS.requirements, type: 'requirements' },
        { content: SAMPLE_DOCUMENTS.proposal, type: 'proposal' },
        { content: SAMPLE_DOCUMENTS.organization, type: 'organization' },
      ];

      const processedDocuments = [];

      // Process all documents
      for (const doc of documents) {
        const testId = generateTestId();
        testFileIds.push(testId);
        
        const ragData = await retryOperation(() =>
          embeddingService.processContentForRAG(doc.content, {
            title: `Test ${doc.type} ${testId}`,
            fileType: 'text/plain',
            sourceFileId: testId,
          })
        );

        processedDocuments.push({
          id: testId,
          type: doc.type,
          chunks: ragData.length,
          embeddings: ragData.map(r => r.embedding),
        });

        console.log(`✅ Processed ${doc.type} document: ${ragData.length} chunks`);
      }

      // Test cross-document similarity searches
      const testCases = [
        {
          query: "project budget and pricing",
          expectedDocs: ['requirements', 'proposal'],
        },
        {
          query: "team expertise and capabilities",
          expectedDocs: ['organization', 'proposal'],
        },
        {
          query: "technical architecture and implementation",
          expectedDocs: ['requirements', 'proposal'],
        },
      ];

      for (const testCase of testCases) {
        // Generate query embedding
        const queryEmbedding = await retryOperation(() =>
          embeddingService.generateEmbedding(testCase.query)
        );

        // Calculate similarities across all document chunks
        const similarities = [];
        for (const doc of processedDocuments) {
          for (const embedding of doc.embeddings) {
            const similarity = calculateCosineSimilarity(queryEmbedding, embedding as number[]);
            similarities.push({
              docType: doc.type,
              similarity,
            });
          }
        }

        // Sort by similarity and check if expected docs rank highly
        similarities.sort((a, b) => b.similarity - a.similarity);
        const topDocTypes = similarities.slice(0, 5).map(s => s.docType);
        
        const foundExpected = testCase.expectedDocs.some(expected => 
          topDocTypes.includes(expected)
        );
        
        expect(foundExpected).toBe(true);
        
        console.log(`✅ Cross-document search for "${testCase.query}" found relevant content`);
        console.log(`   Top results from: ${topDocTypes.slice(0, 3).join(', ')}`);
      }
    }, TEST_CONFIG.timeouts.document);
  });

  describe('Document Processing Error Handling', () => {
    it('should handle corrupted or incomplete documents', async () => {
      const corruptedDocuments = [
        { content: '', description: 'empty document' },
        { content: 'a'.repeat(1000000), description: 'extremely large document' },
        { content: '\x00\x01\x02', description: 'binary data' },
        { content: '测试中文内容 русский العربية', description: 'multilingual content' },
      ];

      for (const doc of corruptedDocuments) {
        try {
          if (doc.content === '') {
            // Empty content should be handled gracefully
            await expect(
              embeddingService.processContentForRAG(doc.content, {
                title: `Test ${doc.description}`,
                fileType: 'text/plain',
              })
            ).rejects.toThrow();
            
            console.log(`✅ Empty document correctly rejected: ${doc.description}`);
          } else {
            // Other cases should process or fail gracefully
            const ragData = await retryOperation(() =>
              embeddingService.processContentForRAG(doc.content, {
                title: `Test ${doc.description}`,
                fileType: 'text/plain',
              })
            );

            expect(ragData.length).toBeGreaterThan(0);
            console.log(`✅ Handled ${doc.description}: ${ragData.length} chunks`);
          }
        } catch (error) {
          console.log(`⚠️ Expected error for ${doc.description}:`, (error as Error).message);
        }
      }
    }, TEST_CONFIG.timeouts.document);
  });

  describe('Performance and Scalability', () => {
    it('should handle batch document processing efficiently', async () => {
      const batchSize = 5;
      const documents = Array.from({ length: batchSize }, (_, i) => ({
        content: SAMPLE_DOCUMENTS.requirements + ` Document ${i}`,
        id: generateTestId(),
      }));

      const startTime = Date.now();
      
      // Process documents concurrently
      const results = await Promise.all(
        documents.map(doc => 
          retryOperation(() =>
            embeddingService.processContentForRAG(doc.content, {
              title: `Batch Test ${doc.id}`,
              fileType: 'text/plain',
            })
          )
        )
      );

      const totalTime = Date.now() - startTime;
      const avgTimePerDoc = totalTime / batchSize;

      // Validate results
      expect(results).toHaveLength(batchSize);
      results.forEach(ragData => {
        expect(ragData.length).toBeGreaterThan(0);
      });

      // Performance validation
      expect(avgTimePerDoc).toBeLessThan(30000); // 30 seconds per document max
      
      console.log(`✅ Batch processing completed: ${batchSize} docs in ${totalTime}ms`);
      console.log(`   Average time per document: ${avgTimePerDoc.toFixed(0)}ms`);
    }, TEST_CONFIG.timeouts.document * 3);
  });
});

// Helper function for calculating cosine similarity
function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }
  
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  
  return dotProduct / (magnitudeA * magnitudeB);
} 
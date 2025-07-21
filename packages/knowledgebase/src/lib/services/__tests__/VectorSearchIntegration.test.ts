import { EmbeddingService } from '../EmbeddingService';
import { SearchService } from '../SearchService';
import { TextExtractionService } from '../TextExtractionService';
import { ChunkingService } from '../ChunkingService';
import { ProcessingService } from '../ProcessingService';
import { prisma } from '../../db';
import type { ContentChunk, EntityType } from '../../types';


// Mock OpenAI
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [
          {
            embedding: Array.from({ length: 1536 }, (_, i) => Math.random() * 2 - 1), // Random embedding
          },
        ],
      }),
    },
  })),
}));

describe('Vector Search Integration Tests', () => {
  let embeddingService: EmbeddingService;
  let searchService: SearchService;
  let textExtractionService: TextExtractionService;
  let chunkingService: ChunkingService;
  let processingService: ProcessingService;

  const testEntityType: EntityType = 'knowledgebase';
  const testEntityId = 'test-entity-123';
  const testOrgId = 'test-org-456';

  beforeAll(async () => {
    // Initialize services
    embeddingService = new EmbeddingService(prisma);
    searchService = new SearchService(prisma, embeddingService);
    textExtractionService = new TextExtractionService();
    chunkingService = new ChunkingService();
    processingService = new ProcessingService();

    // Clean up any existing test data
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Full Pipeline Integration', () => {
    test('should process document and make it searchable', async () => {
      console.log('🧪 Starting full pipeline integration test');

      // Step 1: Create test document content
      const testContent = `# Test Document

This is a test document for vector search integration.

## Section 1: Introduction
Vector search allows us to find semantically similar content using embeddings.

## Section 2: Implementation
We use pgvector with OpenAI embeddings for fast similarity search.

The knowledgebase system processes documents by:
1. Extracting text content
2. Splitting into chunks
3. Generating embeddings
4. Storing in database with pgvector`;

      const testBuffer = Buffer.from(testContent, 'utf-8');

      // Step 2: Process document through full pipeline
      console.log('📝 Processing test document...');
      const result = await processingService.processDocument(
        testBuffer,
        'test-document.txt',
        testEntityType,
        testEntityId,
        testOrgId
      );

      console.log('✅ Processing result:', result);
      expect(result.success).toBe(true);
      expect(result.chunksCreated).toBeGreaterThan(0);
      expect(result.embeddingsGenerated).toBeGreaterThan(0);

      // Step 3: Verify chunks were stored
      const storedChunks = await prisma.fileData.findMany({
        where: {
          entityType: testEntityType,
          entityId: testEntityId,
          organizationId: testOrgId,
          dataType: 'chunk',
        },
      });

      console.log(`📊 Found ${storedChunks.length} stored chunks`);
      expect(storedChunks.length).toBeGreaterThan(0);

      // Step 4: Verify embeddings were stored
      const storedVectors = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM vectors 
        WHERE "entityType" = ${testEntityType} 
          AND "entityId" = ${testEntityId}
      `;

      console.log(`🔢 Found ${storedVectors.length} stored vectors`);
      expect(storedVectors.length).toBeGreaterThan(0);
      expect(storedVectors.length).toBe(storedChunks.length);

      // Step 5: Test search functionality
      console.log('🔍 Testing search functionality...');
      const searchResults = await searchService.search(
        'vector search embeddings',
        testEntityType,
        testEntityId,
        {
          limit: 5,
          threshold: 0.1, // Lower threshold for testing
          includeMetadata: true,
        }
      );

      console.log(`🎯 Search returned ${searchResults.length} results`);
      console.log('Search results:', searchResults.map(r => ({
        id: r.id,
        similarity: r.similarity,
        content: r.content.substring(0, 100) + '...',
      })));

      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0].similarity).toBeGreaterThan(0);

    }, 30000); // 30 second timeout for this integration test

    test('should find semantically similar content', async () => {
      console.log('🔍 Testing semantic similarity search');

      // Search for content related to what we stored
      const testQueries = [
        'document processing',
        'pgvector database',
        'OpenAI embeddings',
        'chunking text content',
      ];

      for (const query of testQueries) {
        console.log(`🔎 Searching for: "${query}"`);
        
        const results = await searchService.search(
          query,
          testEntityType,
          testEntityId,
          {
            limit: 3,
            threshold: 0.1,
          }
        );

        console.log(`📊 Query "${query}" returned ${results.length} results`);
        
        if (results.length > 0) {
          console.log(`🎯 Top result similarity: ${results[0].similarity}`);
          expect(results[0].similarity).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Individual Service Tests', () => {
    test('should extract text with proper formatting', async () => {
      const testContent = `Line 1

Line 3 after blank line

Another paragraph with content.`;
      
      const buffer = Buffer.from(testContent, 'utf-8');
      const extracted = await textExtractionService.extractText(buffer, 'txt', 'test.txt');
      
      console.log('📝 Extracted text:');
      console.log(JSON.stringify(extracted.text, null, 2));
      
      expect(extracted.text).toContain('\n');
      expect(extracted.text.split('\n\n')).toHaveLength(3); // Should preserve paragraph breaks
    });

    test('should create chunks with preserved formatting', async () => {
      const testContent = `# Header 1

This is paragraph 1.

This is paragraph 2 with more content.

## Header 2

Final paragraph here.`;

      const extractedContent = {
        text: testContent,
        metadata: {
          title: 'Test',
          wordCount: 20,
          extractedAt: new Date().toISOString(),
          processingVersion: '1.0',
        },
      };

      const chunks = await chunkingService.createChunks(
        extractedContent,
        'test-file',
        testEntityType,
        testEntityId
      );

      console.log('📊 Created chunks:');
      chunks.forEach((chunk, i) => {
        console.log(`Chunk ${i}:`);
        console.log(JSON.stringify(chunk.content, null, 2));
        console.log('---');
      });

      expect(chunks.length).toBeGreaterThan(0);
      // Verify newlines are preserved in chunks
      expect(chunks.some(chunk => chunk.content.includes('\n'))).toBe(true);
    });

    test('should generate and store embeddings', async () => {
      const testChunks: ContentChunk[] = [
        {
          id: 'test-chunk-1',
          content: 'This is test content for embedding generation.',
          chunkIndex: 0,
          totalChunks: 1,
          startOffset: 0,
          endOffset: 45,
          contentHash: 'test-hash-1',
          metadata: {
            fileId: 'test-file',
            entityType: testEntityType,
            entityId: testEntityId,
          },
        },
      ];

      const embeddingIds = await embeddingService.generateEmbeddings(
        testChunks,
        testEntityType,
        testEntityId,
        testOrgId
      );

      console.log('🔢 Generated embedding IDs:', embeddingIds);
      expect(embeddingIds).toHaveLength(1);

      // Verify embedding was stored in database
      const storedVector = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM vectors 
        WHERE "sourceEntityId" = ${testChunks[0].id}
      `;

      expect(storedVector).toHaveLength(1);
    });

    test('should perform vector similarity search', async () => {
      // Use the embedding service to generate a test query embedding
      const queryEmbedding = await embeddingService.generateSingleEmbedding(
        'test content for searching'
      );

      console.log('🔍 Generated query embedding length:', queryEmbedding.length);

      const similarVectors = await embeddingService.findSimilarEmbeddings(
        queryEmbedding,
        testEntityType,
        testEntityId,
        {
          limit: 5,
          threshold: 0.0, // Very low threshold for testing
        }
      );

      console.log('🎯 Found similar vectors:', similarVectors.length);
      console.log('Vector results:', similarVectors.map(v => ({
        id: v.id,
        similarity: v.similarity,
        sourceEntityId: v.sourceEntityId,
      })));

      expect(similarVectors.length).toBeGreaterThan(0);
    });
  });

  describe('Database Queries Debug', () => {
    test('should verify pgvector extension is enabled', async () => {
      const result = await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT extname as name FROM pg_extension WHERE extname = 'vector'
      `;

      console.log('🔧 pgvector extension status:', result);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('vector');
    });

    test('should check vector table structure', async () => {
      const result = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'vectors' AND column_name = 'embedding'
      `;

      console.log('📊 Vector table embedding column:', result);
      expect(result).toHaveLength(1);
      expect(result[0].data_type).toBe('USER-DEFINED'); // pgvector type
    });

    test('should verify HNSW index exists', async () => {
      const result = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'vectors' AND indexname LIKE '%cosine%'
      `;

      console.log('📈 HNSW indexes found:', result);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should test raw pgvector operations', async () => {
      // Insert a test vector directly
      const testVector = Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
      const vectorString = `[${testVector.join(',')}]`;

      await prisma.$executeRaw`
        INSERT INTO vectors (
          id, "entityType", "entityId", "sourceEntityType", "sourceEntityId", 
          "contentHash", embedding, metadata, "createdAt", "updatedAt"
        ) VALUES (
          'test-raw-vector', ${testEntityType}, ${testEntityId}, 'chunk', 'test-chunk-raw',
          'test-hash-raw', CAST(${vectorString} AS vector), 
          CAST('{"test": true}' AS jsonb), NOW(), NOW()
        )
      `;

      // Query for similar vectors
      const queryVector = `[${testVector.map(v => v * 0.9).join(',')}]`; // Similar vector
      const results = await prisma.$queryRaw<Array<{ id: string; similarity: number }>>`
        SELECT 
          id,
          1 - (embedding <=> ${queryVector}::vector) AS similarity
        FROM vectors 
        WHERE "entityType" = ${testEntityType} 
          AND "entityId" = ${testEntityId}
        ORDER BY embedding <=> ${queryVector}::vector
        LIMIT 5
      `;

      console.log('🔬 Raw pgvector query results:', results);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBeGreaterThan(0);

      // Clean up test vector
      await prisma.$executeRaw`
        DELETE FROM vectors WHERE id = 'test-raw-vector'
      `;
    });
  });

  async function cleanupTestData() {
    try {
      console.log('🧹 Cleaning up test data...');
      
      // Delete vectors first (foreign key constraints)
      await prisma.$executeRaw`
        DELETE FROM vectors 
        WHERE "entityType" = ${testEntityType} AND "entityId" = ${testEntityId}
      `;

      // Delete file data
      await prisma.fileData.deleteMany({
        where: {
          entityType: testEntityType,
          entityId: testEntityId,
          organizationId: testOrgId,
        },
      });

      console.log('✅ Test data cleanup completed');
    } catch (error) {
      console.warn('⚠️ Error during cleanup:', error);
    }
  }
}); 
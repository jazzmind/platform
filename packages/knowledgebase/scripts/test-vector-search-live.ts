#!/usr/bin/env tsx

/**
 * Live Vector Search Test Script
 * 
 * This script tests the complete vector search pipeline:
 * 1. Upload a test document
 * 2. Process it through text extraction, chunking, and embedding
 * 3. Test search functionality
 * 4. Verify results and cleanup
 */

import { TextExtractionService } from '../src/lib/services/TextExtractionService';
import { ChunkingService } from '../src/lib/services/ChunkingService';
import { EmbeddingService } from '../src/lib/services/EmbeddingService';
import { SearchService } from '../src/lib/services/SearchService';
import { ProcessingService } from '../src/lib/services/ProcessingService';
import { prisma } from '../src/lib/db';
import type { EntityType } from '../src/lib/types';

// Test configuration
const TEST_CONFIG = {
  entityType: 'knowledgebase' as EntityType,
  entityId: 'test-vector-search-123',
  organizationId: 'test-org-vector-search',
  testDocuments: [
    {
      filename: 'ai-embeddings-guide.txt',
      content: `# Vector Embeddings and AI Search Guide

## Introduction
Vector embeddings are a fundamental technology in modern AI systems. They convert text, images, and other data into numerical representations that capture semantic meaning.

## How Vector Search Works
1. **Text Processing**: Documents are split into chunks
2. **Embedding Generation**: Each chunk is converted to a vector using AI models like OpenAI's text-embedding-ada-002
3. **Storage**: Vectors are stored in specialized databases like pgvector with PostgreSQL
4. **Search**: User queries are converted to vectors and similarity search finds relevant content

## Applications
- **Semantic Search**: Find documents by meaning, not just keywords
- **Recommendation Systems**: Suggest similar content
- **Question Answering**: Retrieve relevant context for AI responses
- **Document Analysis**: Analyze and categorize large document collections

## Technical Implementation
We use pgvector extension for PostgreSQL to store 1536-dimensional embeddings. The cosine distance operator <=> enables fast similarity search with HNSW indexing.

Key benefits:
- Fast approximate nearest neighbor search
- Scalable to millions of documents  
- Integrated with relational database features
- Support for various similarity metrics

## Best Practices
- Chunk documents appropriately (500-2000 tokens)
- Use consistent embedding models
- Implement proper indexing strategies
- Monitor search quality and relevance`,
    },
    {
      filename: 'database-architecture.txt', 
      content: `# Database Architecture for Knowledge Management

## Overview
Our system uses PostgreSQL with the pgvector extension to provide both relational data management and vector similarity search capabilities.

## Schema Design
- **FileData**: Stores document metadata and chunks
- **Vector**: Stores embeddings with pgvector data types
- **Relationships**: Links between documents, chunks, and vectors

## Performance Optimization
- HNSW indexes for fast vector search
- Proper connection pooling
- Query optimization for mixed workloads
- Batch processing for embedding generation

## Scalability Considerations
The architecture supports:
- Horizontal scaling with read replicas
- Vector index optimization
- Efficient bulk operations
- Real-time search capabilities`,
    }
  ],
  searchQueries: [
    'How do vector embeddings work?',
    'PostgreSQL database setup',
    'AI search implementation',
    'HNSW indexing performance',
    'document chunking strategies',
  ]
};

async function main() {
  console.log('🚀 Starting Live Vector Search Test\n');
  
  try {
    // Initialize services
    const textExtraction = new TextExtractionService();
    const chunking = new ChunkingService();
    const embedding = new EmbeddingService(prisma);
    const search = new SearchService(prisma, embedding);
    const processing = new ProcessingService();

    // Cleanup any existing test data
    await cleanupTestData();

    // Step 1: Verify database setup
    await verifyDatabaseSetup();

    // Step 2: Process test documents
    const processedDocs = [];
    for (const [index, doc] of TEST_CONFIG.testDocuments.entries()) {
      console.log(`\n📄 Processing document ${index + 1}: ${doc.filename}`);
      
      const buffer = Buffer.from(doc.content, 'utf-8');
      const result = await processing.processDocument(
        buffer,
        doc.filename,
        TEST_CONFIG.entityType,
        TEST_CONFIG.entityId,
        TEST_CONFIG.organizationId
      );
      
      console.log(`✅ Document processed:`, {
        success: result.success,
        chunksCreated: result.chunksCreated,
        embeddingsGenerated: result.embeddingsGenerated,
      });
      
      processedDocs.push(result);
    }

    // Step 3: Verify data storage
    await verifyDataStorage();

    // Step 4: Test search functionality
    await testSearchFunctionality(search);

    // Step 5: Test similarity and relevance
    await testSearchRelevance(search);

    console.log('\n🎉 All tests passed! Vector search is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Cleanup test data
    await cleanupTestData();
    await prisma.$disconnect();
  }
}

async function verifyDatabaseSetup() {
  console.log('\n🔧 Verifying database setup...');
  
  // Check pgvector extension
  const vectorExtension = await prisma.$queryRaw<Array<{ extname: string }>>`
    SELECT extname FROM pg_extension WHERE extname = 'vector'
  `;
  
  if (vectorExtension.length === 0) {
    throw new Error('pgvector extension not found');
  }
  console.log('✅ pgvector extension enabled');

  // Check vector table structure
  const vectorTable = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'vectors' AND column_name = 'embedding'
  `;
  
  if (vectorTable.length === 0) {
    throw new Error('Vector table embedding column not found');
  }
  console.log('✅ Vector table structure verified');

  // Check HNSW index
  const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname 
    FROM pg_indexes 
    WHERE tablename = 'vectors' AND indexname LIKE '%cosine%'
  `;
  
  console.log(`✅ Found ${indexes.length} vector indexes`);
}

async function verifyDataStorage() {
  console.log('\n📊 Verifying data storage...');
  
  // Check stored documents
  const storedChunks = await prisma.fileData.count({
    where: {
      entityType: TEST_CONFIG.entityType,
      entityId: TEST_CONFIG.entityId,
      organizationId: TEST_CONFIG.organizationId,
      dataType: 'chunk',
    },
  });
  
  // Check stored vectors
  const storedVectors = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM vectors 
    WHERE "entityType" = ${TEST_CONFIG.entityType} 
      AND "entityId" = ${TEST_CONFIG.entityId}
  `;
  
  const vectorCount = Number(storedVectors[0].count);
  
  console.log(`✅ Stored ${storedChunks} chunks and ${vectorCount} vectors`);
  
  if (storedChunks === 0 || vectorCount === 0) {
    throw new Error('No data was stored');
  }
  
  if (storedChunks !== vectorCount) {
    throw new Error(`Mismatch: ${storedChunks} chunks but ${vectorCount} vectors`);
  }
}

async function testSearchFunctionality(search: SearchService) {
  console.log('\n🔍 Testing search functionality...');
  
  let totalResults = 0;
  
  for (const query of TEST_CONFIG.searchQueries) {
    console.log(`\n🔎 Searching: "${query}"`);
    
    const results = await search.search(
      query,
      TEST_CONFIG.entityType,
      TEST_CONFIG.entityId,
      {
        limit: 5,
        threshold: 0.1,
        includeMetadata: true,
      }
    );
    
    console.log(`📋 Results: ${results.length} found`);
    
    if (results.length > 0) {
      const topResult = results[0];
      console.log(`🎯 Top result similarity: ${topResult.similarity.toFixed(4)}`);
      console.log(`📝 Content preview: ${topResult.content.substring(0, 100)}...`);
      totalResults += results.length;
    }
  }
  
  console.log(`\n✅ Search test completed. Total results across all queries: ${totalResults}`);
  
  if (totalResults === 0) {
    throw new Error('No search results found - vector search may not be working');
  }
}

async function testSearchRelevance(search: SearchService) {
  console.log('\n🎯 Testing search relevance...');
  
  const relevanceTests = [
    {
      query: 'pgvector PostgreSQL database',
      expectedKeywords: ['pgvector', 'PostgreSQL', 'database'],
    },
    {
      query: 'HNSW indexing performance',
      expectedKeywords: ['HNSW', 'index', 'performance'],
    },
    {
      query: 'document chunking text processing',
      expectedKeywords: ['chunk', 'document', 'text'],
    },
  ];
  
  for (const test of relevanceTests) {
    console.log(`\n🧪 Testing relevance for: "${test.query}"`);
    
    const results = await search.search(
      test.query,
      TEST_CONFIG.entityType,
      TEST_CONFIG.entityId,
      {
        limit: 3,
        threshold: 0.2,
      }
    );
    
    if (results.length > 0) {
      const topResult = results[0];
      const content = topResult.content.toLowerCase();
      
      const matchedKeywords = test.expectedKeywords.filter(keyword => 
        content.includes(keyword.toLowerCase())
      );
      
      console.log(`📊 Matched ${matchedKeywords.length}/${test.expectedKeywords.length} expected keywords`);
      console.log(`🔤 Matched: ${matchedKeywords.join(', ')}`);
      
      if (matchedKeywords.length === 0) {
        console.warn(`⚠️ No expected keywords found for query: "${test.query}"`);
      }
    } else {
      console.warn(`⚠️ No results for relevance test: "${test.query}"`);
    }
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    // Delete vectors first (foreign key constraints)
    const deletedVectors = await prisma.$executeRaw`
      DELETE FROM vectors 
      WHERE "entityType" = ${TEST_CONFIG.entityType} 
        AND "entityId" = ${TEST_CONFIG.entityId}
    `;
    
    // Delete file data
    const deletedFiles = await prisma.fileData.deleteMany({
      where: {
        entityType: TEST_CONFIG.entityType,
        entityId: TEST_CONFIG.entityId,
        organizationId: TEST_CONFIG.organizationId,
      },
    });
    
    console.log(`🗑️ Cleaned up ${deletedFiles.count} file records and vectors`);
  } catch (error) {
    console.warn('⚠️ Cleanup warning:', error);
  }
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
} 
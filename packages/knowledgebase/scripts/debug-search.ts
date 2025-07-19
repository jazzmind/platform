#!/usr/bin/env tsx

/**
 * Debug Search Script
 * 
 * This script debugs the actual search issue by:
 * 1. Checking what documents are in the database
 * 2. Testing the specific failing query
 * 3. Debugging the search pipeline step by step
 */

import { SearchService } from '../src/lib/services/SearchService';
import { EmbeddingService } from '../src/lib/services/EmbeddingService';
import { prisma } from '../src/lib/db';

async function main() {
  console.log('🔍 Starting Search Debug Session\n');
  
  try {
    // Step 1: Check what documents are actually in the database
    console.log('📊 Checking database contents...');
    
    const fileDataRecords = await prisma.fileData.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    
    console.log(`📄 Found ${fileDataRecords.length} file data records:`);
    fileDataRecords.forEach((record, i) => {
      console.log(`${i + 1}. ${record.dataType} | FileID: ${record.fileId} | Entity: ${record.entityType}/${record.entityId}`);
      if (record.content) {
        console.log(`   Content preview: ${record.content.substring(0, 100)}...`);
      }
    });

    // Step 2: Check vectors
    console.log('\n🔢 Checking vector records...');
    const vectorRecords = await prisma.$queryRaw<Array<{
      id: string;
      entityType: string;
      entityId: string;
      sourceEntityType: string;
      sourceEntityId: string;
    }>>`
      SELECT id, "entityType", "entityId", "sourceEntityType", "sourceEntityId"
      FROM vectors 
      ORDER BY "createdAt" DESC 
      LIMIT 20
    `;
    
    console.log(`🔢 Found ${vectorRecords.length} vector records:`);
    vectorRecords.forEach((record, i) => {
      console.log(`${i + 1}. Vector ${record.id} | Entity: ${record.entityType}/${record.entityId} | Source: ${record.sourceEntityType}/${record.sourceEntityId}`);
    });

    // Step 3: Test the specific failing query
    console.log('\n🔎 Testing the failing query...');
    
    const searchQuery = 'This document describes the issues identified during the scan conducted Jan 8th 2024 and links to JIRA stories associated with remediation steps.';
    console.log(`Query: "${searchQuery}"`);
    
    // Initialize services
    const embeddingService = new EmbeddingService(prisma);
    const searchService = new SearchService(prisma, embeddingService);
    
    // Try to find any knowledgebase entities
    const knowledgebaseRecords = fileDataRecords.filter(r => r.entityType === 'knowledgebase');
    console.log(`\n📋 Found ${knowledgebaseRecords.length} knowledgebase records`);
    
    if (knowledgebaseRecords.length === 0) {
      console.log('❌ No knowledgebase records found! This might be the issue.');
      
      // Check what entity types exist
      const entityTypes = [...new Set(fileDataRecords.map(r => r.entityType))];
      console.log(`Available entity types: ${entityTypes.join(', ')}`);
      
      // If there are other entities, test with one of them
      if (entityTypes.length > 0) {
        const testEntityType = entityTypes[0] as any;
        const testRecords = fileDataRecords.filter(r => r.entityType === testEntityType);
        const testEntityId = testRecords[0]?.entityId;
        
        if (testEntityId) {
          console.log(`\n🧪 Testing search with available entity: ${testEntityType}/${testEntityId}`);
          
          const testResults = await searchService.search(
            searchQuery,
            testEntityType,
            testEntityId,
            {
              limit: 5,
              threshold: 0.1,
              includeMetadata: true,
            }
          );
          
          console.log(`📊 Search results: ${testResults.length} found`);
          testResults.forEach((result, i) => {
            console.log(`${i + 1}. Similarity: ${result.similarity.toFixed(4)}`);
            console.log(`   Content: ${result.content.substring(0, 150)}...`);
          });
        }
      }
    } else {
      // Test with knowledgebase entities
      const testEntityId = knowledgebaseRecords[0].entityId;
      console.log(`\n🧪 Testing search with knowledgebase entity: ${testEntityId}`);
      
      const searchResults = await searchService.search(
        searchQuery,
        'knowledgebase',
        testEntityId,
        {
          limit: 5,
          threshold: 0.1,
          includeMetadata: true,
        }
      );
      
      console.log(`📊 Search results: ${searchResults.length} found`);
      searchResults.forEach((result, i) => {
        console.log(`${i + 1}. Similarity: ${result.similarity.toFixed(4)}`);
        console.log(`   Content: ${result.content.substring(0, 150)}...`);
      });
    }

    // Step 4: Debug embedding generation for the query
    console.log('\n🔧 Testing query embedding generation...');
    try {
      const queryEmbedding = await embeddingService.generateSingleEmbedding(searchQuery);
      console.log(`✅ Generated query embedding with ${queryEmbedding.length} dimensions`);
      
      // Test direct vector similarity search
      console.log('\n🔍 Testing direct vector similarity...');
      const similarVectors = await embeddingService.findSimilarEmbeddings(
        queryEmbedding,
        'knowledgebase',
        knowledgebaseRecords[0]?.entityId || 'any',
        {
          limit: 5,
          threshold: 0.0, // Very low threshold
        }
      );
      
      console.log(`📊 Direct vector search results: ${similarVectors.length} found`);
      similarVectors.forEach((result, i) => {
        console.log(`${i + 1}. Vector ${result.id} | Similarity: ${result.similarity.toFixed(4)} | Source: ${result.sourceEntityId}`);
      });
      
    } catch (error) {
      console.error('❌ Error generating query embedding:', error);
    }

    // Step 5: Check for any document content that might match
    console.log('\n🔍 Searching for content containing "scan" or "JIRA"...');
    const matchingContent = fileDataRecords.filter(record => 
      record.content && (
        record.content.toLowerCase().includes('scan') ||
        record.content.toLowerCase().includes('jira') ||
        record.content.toLowerCase().includes('jan 8') ||
        record.content.toLowerCase().includes('2024')
      )
    );
    
    console.log(`📄 Found ${matchingContent.length} records with matching keywords:`);
    matchingContent.forEach((record, i) => {
      console.log(`${i + 1}. FileID: ${record.fileId} | Type: ${record.dataType}`);
      console.log(`   Content preview: ${record.content?.substring(0, 200)}...`);
    });

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
if (require.main === module) {
  main().catch(console.error);
} 
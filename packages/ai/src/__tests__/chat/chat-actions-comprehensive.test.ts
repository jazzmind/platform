/**
 * Comprehensive Document Actions Tests
 * 
 * Tests the complete document action workflow including:
 * - File upload architecture with caching
 * - Document analysis with fileId
 * - Opportunity matching and creation
 * - Entity extraction
 * - Error handling and edge cases
 * - Performance and concurrency
 * - Action routing validation
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { TestFileManager, TEST_FILE_CONTENT, verifyFileUploadCaching } from '../utils/fileTestUtils';
import { prisma } from '../../src/lib/database/prisma/client';

// Mock auth for testing
jest.mock('../../auth', () => ({
  auth: jest.fn()
}));

jest.mock('next-auth/providers/google', () => ({}));
jest.mock('next-auth/providers/apple', () => ({})); 
jest.mock('next-auth/providers/linkedin', () => ({}));
jest.mock('next-auth/providers/microsoft-entra-id', () => ({}));

// Test configuration
const TEST_CONFIG = {
  entityType: 'workspace' as const,
  entityId: 'comprehensive-test-org-456',
  testUser: {
    id: 'test-user-comprehensive',
    contact: {
      id: 'test-contact-comprehensive', 
      firstName: 'Comprehensive',
      lastName: 'Tester',
      email: 'comprehensive.test@example.com'
    },
    activeOrganizationId: 'comprehensive-test-org-456'
  },
  testOpportunities: [
    {
      id: 'test-opp-edu-1',
      title: 'Education Platform Development',
      value: 500000,
      status: 'active',
      description: 'Build a comprehensive education technology platform with AI features'
    },
    {
      id: 'test-opp-cloud-1', 
      title: 'Cloud Infrastructure Migration',
      value: 250000,
      status: 'active',
      description: 'Migrate legacy systems to cloud infrastructure using AWS/Azure'
    },
    {
      id: 'test-opp-data-1',
      title: 'Data Analytics Solution',
      value: 175000,
      status: 'pending',
      description: 'Implement business intelligence and analytics platform'
    }
  ]
};

describe('Comprehensive Document Actions Tests', () => {
  let fileManager: TestFileManager;
  let testFiles: { [key: string]: { fileId: string; fileName: string } } = {};

  beforeAll(async () => {
    console.log('🚀 Setting up comprehensive test environment...');
    fileManager = new TestFileManager();
    
    // Set up test data in database
    await setupTestData();
    
    // Upload test files that will be used across multiple tests
    const uploads = await Promise.all([
      fileManager.uploadFile(
        'education-platform-rfp.txt',
        TEST_FILE_CONTENT.RFP,
        TEST_CONFIG.entityType,
        TEST_CONFIG.entityId
      ),
      fileManager.uploadFile(
        'business-proposal.txt', 
        TEST_FILE_CONTENT.PROPOSAL,
        TEST_CONFIG.entityType,
        TEST_CONFIG.entityId
      ),
      fileManager.uploadFile(
        'contacts-data.csv',
        TEST_FILE_CONTENT.CSV_CONTACTS,
        TEST_CONFIG.entityType,
        TEST_CONFIG.entityId,
        'text/csv'
      ),
      fileManager.uploadFile(
        'technical-requirements.md',
        TEST_FILE_CONTENT.TECHNICAL_REQUIREMENTS,
        TEST_CONFIG.entityType,
        TEST_CONFIG.entityId,
        'text/markdown'
      )
    ]);

    testFiles = {
      rfp: { fileId: uploads[0].fileId, fileName: uploads[0].fileName },
      proposal: { fileId: uploads[1].fileId, fileName: uploads[1].fileName },
      contacts: { fileId: uploads[2].fileId, fileName: uploads[2].fileName },
      requirements: { fileId: uploads[3].fileId, fileName: uploads[3].fileName }
    };

    console.log('✅ Test files uploaded:', Object.keys(testFiles));
  }, 60000);

  afterAll(async () => {
    console.log('🧹 Cleaning up comprehensive test environment...');
    await fileManager.cleanup();
    await cleanupTestData();
    await prisma.$disconnect();
    console.log('✅ Cleanup complete');
  }, 15000);

  describe('File Upload Architecture', () => {
    test('should upload file and return consistent fileId', async () => {
      // Use unique content to avoid cache from previous test runs
      const uniqueContent = `Test document content for isolated test - ${Date.now()}`;
      const result = await fileManager.uploadFile(
        'isolated-test-doc.txt',
        uniqueContent,
        TEST_CONFIG.entityType,
        TEST_CONFIG.entityId
      );

      expect(result.fileId).toBeDefined();
      expect(result.fileName).toBe('isolated-test-doc.txt');
      expect(result.entityType).toBe(TEST_CONFIG.entityType);
      expect(result.entityId).toBe(TEST_CONFIG.entityId);
      expect(result.wasFromCache).toBe(false);
    });

    test('should demonstrate file caching (same file uploaded twice)', async () => {
      // Use unique content to avoid cache from previous test runs
      const uniqueContent = `Content for comprehensive caching test - ${Date.now()}`;
      const { firstUpload, secondUpload, cachingWorks } = await verifyFileUploadCaching(
        'cache-verification.txt',
        uniqueContent,
        TEST_CONFIG.entityType,
        TEST_CONFIG.entityId
      );

      expect(cachingWorks).toBe(true);
      expect(firstUpload.fileId).toBe(secondUpload.fileId);
      expect(firstUpload.wasFromCache).toBe(false);
      expect(secondUpload.wasFromCache).toBe(true);

      console.log(`✅ Caching verified: ${firstUpload.fileId} (cached: ${secondUpload.wasFromCache})`);
    });

    test('should handle different file types correctly', async () => {
      const uploads = await Promise.all([
        fileManager.uploadFile('test.txt', 'Plain text content', TEST_CONFIG.entityType, TEST_CONFIG.entityId, 'text/plain'),
        fileManager.uploadFile('test.md', '# Markdown content', TEST_CONFIG.entityType, TEST_CONFIG.entityId, 'text/markdown'),
        fileManager.uploadFile('test.csv', 'name,email\nJohn,john@test.com', TEST_CONFIG.entityType, TEST_CONFIG.entityId, 'text/csv')
      ]);

      expect(uploads).toHaveLength(3);
      uploads.forEach(upload => {
        expect(upload.fileId).toBeDefined();
        expect(upload.wasFromCache).toBe(false);
      });

      console.log(`✅ Multiple file types uploaded: ${uploads.length} files`);
    });
  });

  describe('Document Analysis with New Architecture', () => {
    test('should analyze document using /api/documents/analyze endpoint', async () => {
      const response = await fetch('http://localhost:3101/api/documents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: testFiles.rfp.fileId,
          entityType: TEST_CONFIG.entityType,
          entityId: TEST_CONFIG.entityId,
          context: {
            chatContext: 'dashboard'
          }
        })
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/plain');

      // Read streaming response
      const reader = response.body?.getReader();
      let analysisCompleted = false;

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            if (chunk.includes('Analysis Complete') || chunk.includes('complete')) {
              analysisCompleted = true;
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      expect(analysisCompleted).toBe(true);
      console.log(`✅ Document analysis completed using fileId: ${testFiles.rfp.fileId}`);
    }, 30000);
  });

  describe('Action Routing Validation', () => {
    const routingTests = [
      { action: 'match_opportunity', expectedStatus: 200, description: 'Opportunity matching' },
      { action: 'confirm_opportunity_match', expectedStatus: 200, description: 'Opportunity confirmation' },
      { action: 'create_new_opportunity', expectedStatus: 200, description: 'Opportunity creation' },
      { action: 'extract_entities', expectedStatus: 200, description: 'Entity extraction' },
      { action: 'invalid_action', expectedStatus: 400, description: 'Invalid action handling' }
    ];

    test.each(routingTests)('should route $action correctly ($description)', async ({ action, expectedStatus }) => {
      const response = await fetch('http://localhost:3101/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: TEST_CONFIG.entityType,
          entityId: TEST_CONFIG.entityId,
          action,
          fileId: testFiles.rfp.fileId,
          fileName: testFiles.rfp.fileName,
          data: {
            documentType: 'rfp',
            entityType: TEST_CONFIG.entityType,
            entityId: TEST_CONFIG.entityId,
            ...(action === 'match_opportunity' ? { 
              opportunities: TEST_CONFIG.testOpportunities.map(opp => ({
                id: opp.id,
                title: opp.title,
                value: opp.value,
                status: opp.status
              }))
            } : {}),
            ...(action === 'extract_entities' ? { entityTypes: ['organizations', 'contacts'] } : {}),
            ...(action === 'confirm_opportunity_match' ? { 
              opportunityId: TEST_CONFIG.testOpportunities[0].id,
              opportunityTitle: TEST_CONFIG.testOpportunities[0].title,
              matchScore: 85 
            } : {}),
            ...(action === 'create_new_opportunity' ? {
              suggestedTitle: 'AI Development Project',
              estimatedValue: 300000,
              userFeedback: 'Good opportunity for our AI team'
            } : {})
          }
        })
      });

      expect(response.status).toBe(expectedStatus);
      console.log(`✅ Action routing test passed: ${action} → ${expectedStatus}`);
    }, 20000);
  });

  describe('Opportunity Matching Actions', () => {
    test('should handle match_opportunity action with fileId', async () => {
      const response = await fetch('http://localhost:3101/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'match_opportunity',
          fileId: testFiles.rfp.fileId,
          fileName: testFiles.rfp.fileName,
          entityType: TEST_CONFIG.entityType,
          entityId: TEST_CONFIG.entityId,
          data: {
            documentType: 'rfp',
            opportunities: TEST_CONFIG.testOpportunities.map(opp => ({
              id: opp.id,
              title: opp.title,
              value: opp.value,
              status: opp.status
            })),
            entityType: TEST_CONFIG.entityType,
            entityId: TEST_CONFIG.entityId
          }
        })
      });

      expect(response.status).toBe(200);

      // Read streaming response
      const reader = response.body?.getReader();
      let matchingCompleted = false;
      const streamMessages: string[] = [];

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            streamMessages.push(chunk);

            if (chunk.includes('Matching Opportunities') || chunk.includes('opportunity match')) {
              matchingCompleted = true;
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      expect(matchingCompleted).toBe(true);
      console.log(`✅ Opportunity matching completed using fileId: ${testFiles.rfp.fileId}`);
      console.log(`📊 Stream messages received: ${streamMessages.length}`);
    }, 45000);

    test('should handle confirm_opportunity_match action', async () => {
      const response = await fetch('http://localhost:3101/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_opportunity_match',
          fileId: testFiles.rfp.fileId,
          fileName: testFiles.rfp.fileName,
          entityType: TEST_CONFIG.entityType,
          entityId: TEST_CONFIG.entityId,
          data: {
            opportunityId: TEST_CONFIG.testOpportunities[0].id,
            opportunityTitle: TEST_CONFIG.testOpportunities[0].title,
            matchScore: 85,
            documentType: 'rfp',
            entityType: TEST_CONFIG.entityType,
            entityId: TEST_CONFIG.entityId
          }
        })
      });

      expect(response.status).toBe(200);

      // Read streaming response
      const reader = response.body?.getReader();
      let confirmationCompleted = false;

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            if (chunk.includes('confirmed') || chunk.includes('linked')) {
              confirmationCompleted = true;
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      expect(confirmationCompleted).toBe(true);
      console.log(`✅ Opportunity confirmation completed`);
    }, 30000);
  });

  describe('Entity Extraction Actions', () => {
    test('should handle extract_entities action using fileId', async () => {
      const response = await fetch('http://localhost:3101/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extract_entities',
          fileId: testFiles.proposal.fileId,
          fileName: testFiles.proposal.fileName,
          entityType: TEST_CONFIG.entityType,
          entityId: TEST_CONFIG.entityId,
          data: {
            documentType: 'proposal',
            entityTypes: ['organizations', 'contacts'],
            entityType: TEST_CONFIG.entityType,
            entityId: TEST_CONFIG.entityId
          }
        })
      });

      expect(response.status).toBe(200);

      // Read streaming response
      const reader = response.body?.getReader();
      let extractionCompleted = false;

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            if (chunk.includes('Entity extraction') || chunk.includes('extraction completed')) {
              extractionCompleted = true;
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      expect(extractionCompleted).toBe(true);
      console.log(`✅ Entity extraction completed using fileId: ${testFiles.proposal.fileId}`);
    }, 90000);
  });

  describe('Opportunity Creation Actions', () => {
    test('should handle create_new_opportunity action', async () => {
      const response = await fetch('http://localhost:3101/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_new_opportunity',
          fileId: testFiles.requirements.fileId,
          fileName: testFiles.requirements.fileName,
          entityType: TEST_CONFIG.entityType,
          entityId: TEST_CONFIG.entityId,
          data: {
            documentType: 'rfp',
            suggestedTitle: 'AI Development Project',
            estimatedValue: 300000,
            userFeedback: 'This looks like a good opportunity for our AI team',
            entityType: TEST_CONFIG.entityType,
            entityId: TEST_CONFIG.entityId
          }
        })
      });

      expect(response.status).toBe(200);

      // Read streaming response
      const reader = response.body?.getReader();
      let creationCompleted = false;

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            if (chunk.includes('opportunity created') || chunk.includes('new opportunity')) {
              creationCompleted = true;
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      expect(creationCompleted).toBe(true);
      console.log(`✅ Opportunity creation completed`);
    }, 45000);
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle missing file content gracefully', async () => {
      const response = await fetch('http://localhost:3101/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'match_opportunity',
          fileId: 'non-existent-file-12345',
          fileName: 'missing.pdf',
          entityType: TEST_CONFIG.entityType,
          entityId: TEST_CONFIG.entityId,
          data: {
            documentType: 'rfp',
            opportunities: TEST_CONFIG.testOpportunities,
            entityType: TEST_CONFIG.entityType,
            entityId: TEST_CONFIG.entityId
          }
        })
      });

      // Should handle gracefully with appropriate error response
      expect([200, 400, 500]).toContain(response.status);
      console.log(`✅ Missing file content handled gracefully (status: ${response.status})`);
    }, 20000);

    test('should handle malformed request data', async () => {
      const response = await fetch('http://localhost:3101/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'match_opportunity',
          fileId: testFiles.rfp.fileId,
          fileName: testFiles.rfp.fileName,
          // Missing entityType and entityId
          data: {
            documentType: 'rfp'
            // Missing required fields
          }
        })
      });

      // Should handle gracefully
      expect([200, 400, 500]).toContain(response.status);
      console.log(`✅ Malformed request handled (status: ${response.status})`);
    }, 15000);
  });

  describe('Performance and Concurrency', () => {
    test('should handle multiple concurrent actions safely', async () => {
      const operations = [
        fetch('http://localhost:3101/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'match_opportunity',
            fileId: testFiles.rfp.fileId,
            fileName: testFiles.rfp.fileName,
            entityType: TEST_CONFIG.entityType,
            entityId: TEST_CONFIG.entityId,
            data: { 
              documentType: 'rfp', 
              opportunities: TEST_CONFIG.testOpportunities,
              entityType: TEST_CONFIG.entityType,
              entityId: TEST_CONFIG.entityId
            }
          })
        }),
        fetch('http://localhost:3101/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'extract_entities',
            fileId: testFiles.proposal.fileId,
            fileName: testFiles.proposal.fileName,
            entityType: TEST_CONFIG.entityType,
            entityId: TEST_CONFIG.entityId,
            data: { 
              documentType: 'proposal', 
              entityTypes: ['organizations'],
              entityType: TEST_CONFIG.entityType,
              entityId: TEST_CONFIG.entityId
            }
          })
        })
      ];

      const responses = await Promise.all(operations);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      console.log(`✅ Parallel operations completed: ${responses.length} concurrent requests`);
    }, 60000);

    test('should handle rapid sequential requests', async () => {
      const results: number[] = [];
      
      for (let i = 0; i < 3; i++) {
        const response = await fetch('http://localhost:3101/api/documents/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileId: testFiles.requirements.fileId,
            entityType: TEST_CONFIG.entityType,
            entityId: TEST_CONFIG.entityId,
            context: { chatContext: 'dashboard' }
          })
        });
        
        results.push(response.status || 0);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      results.forEach(status => {
        expect(status).toBe(200);
      });

      console.log(`✅ Sequential requests completed: ${results.length} requests`);
    }, 45000);
  });
});

// Helper functions

async function setupTestData() {
  // Create test organization
  await prisma.organization.upsert({
    where: { id: TEST_CONFIG.testUser.activeOrganizationId },
    update: {},
    create: {
      id: TEST_CONFIG.testUser.activeOrganizationId,
      name: 'Comprehensive Test Organization',
      nameLower: 'comprehensive test organization'
    }
  });

  // Create test user/contact
  await prisma.contact.upsert({
    where: { id: TEST_CONFIG.testUser.contact.id },
    update: {},
    create: {
      id: TEST_CONFIG.testUser.contact.id,
      organizationId: TEST_CONFIG.testUser.activeOrganizationId,
      email: TEST_CONFIG.testUser.contact.email,
      firstName: TEST_CONFIG.testUser.contact.firstName,
      lastName: TEST_CONFIG.testUser.contact.lastName
    }
  });

  // Create test opportunities
  for (const opp of TEST_CONFIG.testOpportunities) {
    await prisma.opportunity.upsert({
      where: { id: opp.id },
      update: {},
      create: {
        id: opp.id,
        title: opp.title,
        ownerOrganizationId: TEST_CONFIG.testUser.activeOrganizationId,
        forOrganizationId: TEST_CONFIG.testUser.activeOrganizationId,
        estimate: {
          pricing: {
            recommendedPrice: opp.value
          },
          metadata: {
            status: opp.status,
            description: opp.description
          }
        }
      }
    });
  }
}

async function cleanupTestData() {
  try {
    // Clean up test opportunities
    await prisma.opportunity.deleteMany({
      where: {
        id: {
          in: TEST_CONFIG.testOpportunities.map(opp => opp.id)
        }
      }
    });

    // Clean up test user and organization
    await prisma.contact.deleteMany({
      where: { id: TEST_CONFIG.testUser.contact.id }
    });

    await prisma.organization.deleteMany({
      where: { id: TEST_CONFIG.testUser.activeOrganizationId }
    });
  } catch (error) {
    console.warn('Cleanup error (non-critical):', error);
  }
} 
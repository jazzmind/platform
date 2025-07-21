/**
 * ChatFileManager Integration Tests - New Architecture
 * 
 * Tests the separated file upload/analysis workflow:
 * 1. Upload file → get fileId (with caching)
 * 2. Analyze document using fileId
 * 3. Document actions using fileId
 * 4. File cleanup/deletion
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { prisma } from '../../src/lib/database/prisma/client';
import { TestFileManager, TEST_FILE_CONTENT } from '../utils/fileTestUtils';

// Mock auth before any imports that might use it
jest.mock('../../auth', () => ({
  auth: jest.fn()
}));

// Mock auth providers to avoid ESM issues
jest.mock('next-auth/providers/google', () => ({}));
jest.mock('next-auth/providers/apple', () => ({})); 
jest.mock('next-auth/providers/linkedin', () => ({}));
jest.mock('next-auth/providers/microsoft-entra-id', () => ({}));

import { auth } from '../../auth';
const mockAuth = auth as jest.MockedFunction<typeof auth>;

// Test configuration
const TEST_CONFIG = {
  entityType: 'workspace' as const,
  entityId: 'chat-filemanager-test-org',
  userId: 'chat-test-user-123',
  contactId: 'chat-test-contact-123',
  orgId: 'chat-test-org-123'
};

const TEST_SESSION = {
  user: {
    id: TEST_CONFIG.userId,
    contact: {
      id: TEST_CONFIG.contactId,
      firstName: 'Chat',
      lastName: 'Tester',
      email: 'chat.test@example.com'
    },
    activeOrganizationId: TEST_CONFIG.orgId
  }
};

describe('ChatFileManager Integration Tests - New Architecture', () => {
  let fileManager: TestFileManager;

  beforeAll(async () => {
    // Set up mock auth
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValue(TEST_SESSION as any);
    
    // Create test organization and user
    await prisma.organization.upsert({
      where: { id: TEST_CONFIG.orgId },
      update: {},
      create: {
        id: TEST_CONFIG.orgId,
        name: 'Chat Test Organization',
        nameLower: 'chat test organization'
      }
    });

    await prisma.contact.upsert({
      where: { id: TEST_CONFIG.contactId },
      update: {},
      create: {
        id: TEST_CONFIG.contactId,
        organizationId: TEST_CONFIG.orgId,
        email: 'chat.test@example.com',
        firstName: 'Chat',
        lastName: 'Tester'
      }
    });

    // Initialize test file manager
    fileManager = new TestFileManager();
  });

  afterAll(async () => {
    await fileManager.cleanup();
    await cleanupTestData();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up file-related data before each test
    await cleanupFileData();
  });

  describe('File Upload API', () => {
    test('should upload file and return fileId', async () => {
      const upload = await fileManager.uploadFile(
        'requirements.md',
        TEST_FILE_CONTENT.RFP,
        TEST_CONFIG.entityType,
        TEST_CONFIG.entityId
      );

      expect(upload.fileId).toBeDefined();
      expect(upload.fileName).toBe('requirements.md');
      expect(upload.entityType).toBe(TEST_CONFIG.entityType);
      expect(upload.entityId).toBe(TEST_CONFIG.entityId);
      expect(upload.wasFromCache).toBe(false); // First upload should not be from cache

      console.log(`✅ File uploaded: ${upload.fileId}`);
      console.log(`📦 From cache: ${upload.wasFromCache ? 'Yes' : 'No'}`);
    }, 30000);

    test('should return same fileId for duplicate uploads (caching)', async () => {
      // First upload
      const upload1 = await fileManager.uploadFile(
        'duplicate-test.txt',
        TEST_FILE_CONTENT.PROPOSAL,
        TEST_CONFIG.entityType,
        TEST_CONFIG.entityId
      );

      // Second upload of same content
      const upload2 = await fileManager.uploadFile(
        'duplicate-test.txt',
        TEST_FILE_CONTENT.PROPOSAL,
        TEST_CONFIG.entityType,
        TEST_CONFIG.entityId
      );

      // Verify caching behavior
      expect(upload1.fileId).toBe(upload2.fileId);
      expect(upload1.wasFromCache).toBe(false);
      expect(upload2.wasFromCache).toBe(true);

      console.log(`✅ File caching verified: ${upload1.fileId}`);
      console.log(`📦 First upload cached: ${upload1.wasFromCache}`);
      console.log(`📦 Second upload cached: ${upload2.wasFromCache}`);
    }, 30000);

    test('should handle different file types', async () => {
      const uploads = await Promise.all([
        fileManager.uploadFile('test.md', TEST_FILE_CONTENT.RFP, TEST_CONFIG.entityType, TEST_CONFIG.entityId, 'text/markdown'),
        fileManager.uploadFile('test.txt', TEST_FILE_CONTENT.PROPOSAL, TEST_CONFIG.entityType, TEST_CONFIG.entityId, 'text/plain'),
        fileManager.uploadFile('test.csv', TEST_FILE_CONTENT.CSV_CONTACTS, TEST_CONFIG.entityType, TEST_CONFIG.entityId, 'text/csv')
      ]);

             uploads.forEach((upload) => {
         expect(upload.fileId).toBeDefined();
         expect(upload.wasFromCache).toBe(false);
       });

      console.log(`✅ Multiple file types uploaded: ${uploads.length} files`);
    }, 30000);
  });

  describe('Document Analysis API', () => {
    test('should analyze document using fileId', async () => {
      // First upload a file
      const upload = await fileManager.uploadFile(
        'analysis-test.md',
        TEST_FILE_CONTENT.RFP,
        TEST_CONFIG.entityType,
        TEST_CONFIG.entityId
      );

      // Then analyze using the fileId
      const response = await fetch('http://localhost:3101/api/documents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: upload.fileId,
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
      console.log(`✅ Document analysis completed using fileId: ${upload.fileId}`);
    }, 30000);

    test('should handle document actions with fileId', async () => {
      // First upload a file
      const upload = await fileManager.uploadFile(
        'action-test.md',
        TEST_FILE_CONTENT.PROPOSAL,
        TEST_CONFIG.entityType,
        TEST_CONFIG.entityId
      );

      // Then perform action using the fileId
      const response = await fetch('http://localhost:3101/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extract_entities',
          fileId: upload.fileId,
          fileName: upload.fileName,
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
      let actionCompleted = false;

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            if (chunk.includes('Entity') || chunk.includes('extraction') || chunk.includes('organizations')) {
              actionCompleted = true;
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      expect(actionCompleted).toBe(true);
      console.log(`✅ Document action completed using fileId: ${upload.fileId}`);
    }, 60000);
  });

  describe('File Management and Cleanup', () => {
    test('should retrieve file metadata', async () => {
      // Upload a file
      const upload = await fileManager.uploadFile(
        'metadata-test.txt',
        TEST_FILE_CONTENT.RFP,
        TEST_CONFIG.entityType,
        TEST_CONFIG.entityId
      );

      // Retrieve file metadata
      const response = await fetch(
        `http://localhost:3101/api/files/${upload.fileId}?entityType=${TEST_CONFIG.entityType}&entityId=${TEST_CONFIG.entityId}`
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.fileId).toBe(upload.fileId);

      console.log(`✅ File metadata retrieved for: ${upload.fileId}`);
    }, 90000);

    test('should delete files properly', async () => {
      // Upload a file
      const upload = await fileManager.uploadFile(
        'delete-test.txt',
        'Content to be deleted',
        TEST_CONFIG.entityType,
        TEST_CONFIG.entityId
      );

      // Delete the file
      const deleteResponse = await fetch(`http://localhost:3101/api/files/${upload.fileId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: TEST_CONFIG.entityType,
          entityId: TEST_CONFIG.entityId
        })
      });

      expect(deleteResponse.status).toBe(200);
      const deleteResult = await deleteResponse.json();
      expect(deleteResult.success).toBe(true);

      // Verify file is gone
      const getResponse = await fetch(
        `http://localhost:3101/api/files/${upload.fileId}?entityType=${TEST_CONFIG.entityType}&entityId=${TEST_CONFIG.entityId}`
      );
      expect(getResponse.status).toBe(404);

      console.log(`✅ File deleted successfully: ${upload.fileId}`);
    }, 30000);

    test('should handle invalid file types in upload API', async () => {
      const formData = new FormData();
      const invalidFile = new File(['binary data'], 'test.exe', { type: 'application/octet-stream' });
      formData.append('file', invalidFile);
      formData.append('entityType', TEST_CONFIG.entityType);
      formData.append('entityId', TEST_CONFIG.entityId);

      const response = await fetch('http://localhost:3101/api/files/upload', {
        method: 'POST',
        body: formData
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('Unsupported file type');

      console.log(`✅ Invalid file type properly rejected`);
    }, 30000);
  });
});

// Helper functions for cleanup

async function cleanupFileData() {
  // Clean up any file-related test data using correct FileData schema fields
  await prisma.fileData.deleteMany({
    where: {
      OR: [
        { fileId: { contains: 'requirements.md' } },
        { fileId: { contains: 'test' } },
        { entityId: { contains: 'test' } }
      ]
    }
  });
}

async function cleanupTestData() {
  await cleanupFileData();
  
  await prisma.contact.deleteMany({
    where: { id: TEST_CONFIG.contactId }
  });

  await prisma.organization.deleteMany({
    where: { id: TEST_CONFIG.orgId }
  });
} 
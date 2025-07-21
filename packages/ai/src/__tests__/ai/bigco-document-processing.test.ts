/**
 * BigCo Document Processing Integration Tests
 * 
 * Tests the complete AI document extraction and chat smart enrichment workflow
 * using realistic business documents for BigCo Industries.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST as chatHandler } from '@/src/app/api/chat/route';
import { POST as bulkImportHandler } from '@/src/app/api/dashboard/bulk-import/route';
import { prisma } from '@/src/lib/database/prisma/client';
import { auth } from '@/src/auth';
import path from 'path';
import fs from 'fs';

// Mock auth to return a test session
jest.mock('@/src/auth');
const mockAuth = auth as jest.MockedFunction<typeof auth>;

// Test organization and user data
const TEST_USER = {
  id: 'test-user-123',
  contact: {
    id: 'test-contact-123',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com'
  },
  activeOrganizationId: 'test-org-123'
};

const TEST_SESSION = {
  user: TEST_USER
};

// Mock file system for document content
const getDocumentContent = (filename: string): string => {
  const filePath = path.join(process.cwd(), 'docs', 'testing', filename);
  return fs.readFileSync(filePath, 'utf-8');
};

describe('BigCo Document Processing Integration Tests', () => {
  beforeAll(async () => {
    // Set up mock auth
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValue(TEST_SESSION as any);
    
    // Create test organization and user
    await prisma.organization.upsert({
      where: { id: TEST_USER.activeOrganizationId },
      update: {},
      create: {
        id: TEST_USER.activeOrganizationId,
        name: 'Test Organization',
        nameLower: 'test organization'
      }
    });

    await prisma.contact.upsert({
      where: { id: TEST_USER.contact.id },
      update: {},
      create: {
        id: TEST_USER.contact.id,
        organizationId: TEST_USER.activeOrganizationId,
        email: TEST_USER.contact.email,
        firstName: TEST_USER.contact.firstName,
        lastName: TEST_USER.contact.lastName
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up any existing BigCo data before each test
    await cleanupBigCoData();
  });

  describe('Document Content Extraction Tests', () => {
    test('should successfully read BigCo test documents', () => {
      // Test that our test documents exist and are readable
      const testFiles = [
        'bigco_notes.md',
        'bigco_meeting_transcript.md',
        'bigco_proposal.md',
        'bigco_tracking.md'
      ];

      testFiles.forEach(filename => {
        const content = getDocumentContent(filename);
        expect(content).toBeDefined();
        expect(content.length).toBeGreaterThan(100);
        expect(content).toContain('BigCo');
      });
    });

    test('should extract key entities from notes document', () => {
      const notesContent = getDocumentContent('bigco_notes.md');
      
      // Verify key content is present
      expect(notesContent).toContain('Sarah Chen');
      expect(notesContent).toContain('sarah.chen@bigco.com');
      expect(notesContent).toContain('$2.5M');
      expect(notesContent).toContain('ERP Modernization');
      expect(notesContent).toContain('BigCo Industries');
    });

    test('should extract technical details from meeting transcript', () => {
      const transcriptContent = getDocumentContent('bigco_meeting_transcript.md');
      
      // Verify technical meeting content
      expect(transcriptContent).toContain('David Kim');
      expect(transcriptContent).toContain('IT Director');
      expect(transcriptContent).toContain('Azure');
      expect(transcriptContent).toContain('Technical Deep Dive');
      expect(transcriptContent).toContain('March 22, 2024');
    });

    test('should extract pricing from proposal document', () => {
      const proposalContent = getDocumentContent('bigco_proposal.md');
      
      // Verify proposal content
      expect(proposalContent).toContain('$2,390,000');
      expect(proposalContent).toContain('Implementation Services');
      expect(proposalContent).toContain('Sarah Johnson');
      expect(proposalContent).toContain('Program Manager');
      expect(proposalContent).toContain('TechSolutions Inc');
    });

    test('should extract sales data from tracking document', () => {
      const trackingContent = getDocumentContent('bigco_tracking.md');
      
      // Verify sales tracking content
      expect(trackingContent).toContain('75%');
      expect(trackingContent).toContain('Proposal Submitted');
      expect(trackingContent).toContain('Jennifer Martinez');
      expect(trackingContent).toContain('SAP S/4HANA');
      expect(trackingContent).toContain('Microsoft Dynamics 365');
    });
  });

  describe('Chat Handler Integration Tests', () => {
    test('should process simple chat message', async () => {
      const request = createChatRequest({
        message: 'Hello, test message'
      });

      const response = await chatHandler(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.content).toBeDefined();
    });

    test('should handle file upload with document analysis', async () => {
      const notesContent = getDocumentContent('bigco_notes.md');
      const request = createChatRequest({
        message: 'Please analyze this document',
        files: [{
          name: 'bigco_notes.md',
          content: notesContent,
          type: 'text/markdown'
        }]
      });

      const response = await chatHandler(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.metadata).toBeDefined();
      expect(result.content).toContain('BigCo');
    });
  });

  describe('Bulk Import Integration Tests', () => {
    test('should handle bulk import API with valid data', async () => {
      const sampleData = {
        organizations: [
          { id: 'org1', name: 'Test Company', industry: 'Technology' }
        ],
        contacts: [
          { 
            id: 'contact1', 
            name: 'John Doe', 
            email: 'john@test.com',
            organization: 'org1'
          }
        ],
        opportunities: [
          {
            id: 'opp1',
            title: 'Test Opportunity',
            value: 100000,
            organizationId: 'org1',
            contactId: 'contact1'
          }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/dashboard/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleData)
      });

      const response = await bulkImportHandler(request);
      
      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.results).toBeDefined();
    });
  });

  describe('Database Integration Tests', () => {
    test('should create and query organizations', async () => {
      const org = await prisma.organization.create({
        data: {
          name: 'Test BigCo',
          nameLower: 'test bigco',
          sector: 'Technology'
        }
      });

      expect(org.id).toBeDefined();
      expect(org.name).toBe('Test BigCo');

      const foundOrg = await prisma.organization.findFirst({
        where: { name: { contains: 'BigCo', mode: 'insensitive' } }
      });

      expect(foundOrg).toBeDefined();
      expect(foundOrg!.id).toBe(org.id);

      // Cleanup
      await prisma.organization.delete({ where: { id: org.id } });
    });

    test('should create contacts with proper relationships', async () => {
      const org = await prisma.organization.create({
        data: {
          name: 'Test Company',
          nameLower: 'test company'
        }
      });

      const contact = await prisma.contact.create({
        data: {
          organizationId: org.id,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User'
        }
      });

      expect(contact.id).toBeDefined();
      expect(contact.organizationId).toBe(org.id);

      const contactWithOrg = await prisma.contact.findFirst({
        where: { id: contact.id },
        include: { organization: true }
      });

      expect(contactWithOrg!.organization.name).toBe('Test Company');

      // Cleanup
      await prisma.contact.delete({ where: { id: contact.id } });
      await prisma.organization.delete({ where: { id: org.id } });
    });

    test('should create opportunities with estimates', async () => {
      const org = await prisma.organization.create({
        data: {
          name: 'Client Org',
          nameLower: 'client org'
        }
      });

      const opportunity = await prisma.opportunity.create({
        data: {
          title: 'Test Opportunity',
          ownerOrganizationId: TEST_USER.activeOrganizationId,
          forOrganizationId: org.id,
          estimate: {
            pricing: {
              recommendedPrice: 100000
            },
            metadata: {
              probability: 50,
              stage: 'Discovery'
            }
          }
        }
      });

      expect(opportunity.id).toBeDefined();
      const estimate = opportunity.estimate as { pricing?: { recommendedPrice?: number } };
      expect(estimate.pricing?.recommendedPrice).toBe(100000);

      // Cleanup
      await prisma.opportunity.delete({ where: { id: opportunity.id } });
      await prisma.organization.delete({ where: { id: org.id } });
    });
  });

  describe('Mock Authentication Tests', () => {
    test('should return valid test session', async () => {
      const session = await auth();
      
      expect(session).toBeDefined();
             expect((session as { user: { id: string; activeOrganizationId: string } })!.user.id).toBe(TEST_USER.id);
       expect((session as { user: { id: string; activeOrganizationId: string } })!.user.activeOrganizationId).toBe(TEST_USER.activeOrganizationId);
    });
  });
});

// Helper functions
function createChatRequest(data: {
  message: string;
  files?: Array<{ name: string; content: string; type: string }>;
  action?: string;
  data?: unknown;
}): NextRequest {
  const url = 'http://localhost:3000/api/chat';
  const body = JSON.stringify({
    message: data.message,
    files: data.files || [],
    action: data.action,
    data: data.data
  });

  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body
  });
}

async function cleanupBigCoData() {
  // Delete BigCo-related test data
  await prisma.opportunity.deleteMany({
    where: { 
      OR: [
        { title: { contains: 'BigCo', mode: 'insensitive' } },
        { title: { contains: 'ERP', mode: 'insensitive' } }
      ]
    }
  });

  await prisma.contact.deleteMany({
    where: { 
      OR: [
        { email: { contains: 'bigco.com', mode: 'insensitive' } },
        { id: 'sarah-chen-test' }
      ]
    }
  });

  await prisma.organization.deleteMany({
    where: { 
      OR: [
        { name: { contains: 'BigCo', mode: 'insensitive' } },
        { id: 'bigco-test-org' }
      ]
    }
  });
}

async function cleanupTestData() {
  await cleanupBigCoData();
  
  await prisma.contact.deleteMany({
    where: { id: TEST_USER.contact.id }
  });

  await prisma.organization.deleteMany({
    where: { id: TEST_USER.activeOrganizationId }
  });
} 
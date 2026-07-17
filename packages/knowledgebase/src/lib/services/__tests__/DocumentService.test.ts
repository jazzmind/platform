import { DocumentService } from '../DocumentService';
import type { PrismaClient } from '../../../../../auth/generated/prisma/client';
import { put, del } from '@vercel/blob';
import type { UploadRequest, FileMetadata } from '../../types';

// Mock external dependencies
jest.mock('@vercel/blob');
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-123'),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'test-hash-123'),
  })),
}));

const mockPut = put as jest.MockedFunction<typeof put>;
const mockDel = del as jest.MockedFunction<typeof del>;

describe('DocumentService', () => {
  let documentService: DocumentService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    // Create mock Prisma client
    mockPrisma = {
      fileData: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      vector: {
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn(),
    } as any;

    documentService = new DocumentService(mockPrisma);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('uploadDocument', () => {
    it('should successfully upload a new document', async () => {
      const mockFile = new File(['test content'], 'test.pdf', {
        type: 'application/pdf',
      });

      const uploadRequest: UploadRequest = {
        file: mockFile,
        entityType: 'knowledgebase',
        entityId: 'test-entity',
        organizationId: 'test-org',
      };

      // Mock blob upload
      mockPut.mockResolvedValue({
        url: 'https://example.com/test.pdf',
        pathname: 'test.pdf',
        contentType: 'application/pdf',
        contentDisposition: 'attachment; filename="test.pdf"',
      });

      // Mock no existing file (deduplication check)
      mockPrisma.fileData.findFirst.mockResolvedValue(null);

      const result = await documentService.uploadDocument(uploadRequest);

      expect(result.success).toBe(true);
      expect(result.fileId).toBe('file_test-uuid-123');
      expect(result.processingId).toBe('proc_test-uuid-123');
      expect(mockPut).toHaveBeenCalledWith(
        'test-org/knowledgebase/test-entity/file_test-uuid-123',
        mockFile,
        {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN,
        }
      );
    });

    it('should handle file validation errors', async () => {
      const oversizedFile = new File(['x'.repeat(200 * 1024 * 1024)], 'huge.pdf', {
        type: 'application/pdf',
      });

      const uploadRequest: UploadRequest = {
        file: oversizedFile,
        entityType: 'knowledgebase',
        entityId: 'test-entity',
        organizationId: 'test-org',
      };

      await expect(documentService.uploadDocument(uploadRequest)).rejects.toThrow(
        'File size exceeds maximum allowed size'
      );
    });

    it('should return existing file if deduplication finds duplicate', async () => {
      const mockFile = new File(['test content'], 'test.pdf', {
        type: 'application/pdf',
      });

      const uploadRequest: UploadRequest = {
        file: mockFile,
        entityType: 'knowledgebase',
        entityId: 'test-entity',
        organizationId: 'test-org',
      };

      // Mock existing file found
      mockPrisma.fileData.findFirst.mockResolvedValue({
        id: 'existing-id',
        fileId: 'existing-file-id',
        contentHash: 'test-hash-123',
        organizationId: 'test-org',
        entityType: 'knowledgebase',
        entityId: 'test-entity',
        dataType: 'fileMetadata',
        content: null,
        chunkIndex: null,
        totalChunks: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await documentService.uploadDocument(uploadRequest);

      expect(result.success).toBe(true);
      expect(result.fileId).toBe('existing-file-id');
      expect(result.message).toBe('File already exists and has been linked');
      expect(mockPut).not.toHaveBeenCalled();
    });
  });

  describe('deleteDocument', () => {
    it('should successfully delete a document and all associated data', async () => {
      const fileId = 'test-file-id';
      const organizationId = 'test-org';

      // Mock file record found
      mockPrisma.fileData.findFirst.mockResolvedValue({
        id: 'file-record-id',
        fileId,
        organizationId,
        dataType: 'fileMetadata',
        metadata: {
          blobUrl: 'https://example.com/test.pdf',
        },
        entityType: 'knowledgebase',
        entityId: 'test-entity',
        content: null,
        chunkIndex: null,
        totalChunks: null,
        contentHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock successful transaction
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await documentService.deleteDocument(fileId, organizationId);

      expect(mockDel).toHaveBeenCalledWith('https://example.com/test.pdf');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw error if file not found', async () => {
      const fileId = 'non-existent-file';
      const organizationId = 'test-org';

      mockPrisma.fileData.findFirst.mockResolvedValue(null);

      await expect(
        documentService.deleteDocument(fileId, organizationId)
      ).rejects.toThrow('File not found');
    });
  });

  describe('listDocuments', () => {
    it('should return paginated list of documents', async () => {
      const mockDocuments = [
        {
          fileId: 'file-1',
          metadata: {
            filename: 'doc1.pdf',
            fileType: 'pdf',
            mimeType: 'application/pdf',
            size: 1024,
            uploadedAt: '2024-01-01T00:00:00Z',
            organizationId: 'test-org',
          },
          createdAt: new Date('2024-01-01'),
        },
        {
          fileId: 'file-2',
          metadata: {
            filename: 'doc2.pdf',
            fileType: 'pdf',
            mimeType: 'application/pdf',
            size: 2048,
            uploadedAt: '2024-01-02T00:00:00Z',
            organizationId: 'test-org',
          },
          createdAt: new Date('2024-01-02'),
        },
      ];

      mockPrisma.fileData.findMany.mockResolvedValue(mockDocuments as any);
      mockPrisma.fileData.count.mockResolvedValue(2);

      const result = await documentService.listDocuments(
        'knowledgebase',
        'test-entity',
        'test-org',
        { limit: 10, offset: 0 }
      );

      expect(result.documents).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
      expect(result.documents[0].fileId).toBe('file-1');
    });

    it('should handle empty results', async () => {
      mockPrisma.fileData.findMany.mockResolvedValue([]);
      mockPrisma.fileData.count.mockResolvedValue(0);

      const result = await documentService.listDocuments(
        'knowledgebase',
        'test-entity',
        'test-org'
      );

      expect(result.documents).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle pagination correctly', async () => {
      mockPrisma.fileData.findMany.mockResolvedValue([{} as any]);
      mockPrisma.fileData.count.mockResolvedValue(100);

      const result = await documentService.listDocuments(
        'knowledgebase',
        'test-entity',
        'test-org',
        { limit: 10, offset: 20 }
      );

      expect(result.hasMore).toBe(true);
      expect(mockPrisma.fileData.findMany).toHaveBeenCalledWith({
        where: {
          entityType: 'knowledgebase',
          entityId: 'test-entity',
          organizationId: 'test-org',
          dataType: 'fileMetadata',
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 20,
      });
    });
  });

  describe('file validation', () => {
    it('should validate file types correctly', () => {
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const txtFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const invalidFile = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });

      expect(() => (documentService as any).validateFile(pdfFile)).not.toThrow();
      expect(() => (documentService as any).validateFile(txtFile)).not.toThrow();
      expect(() => (documentService as any).validateFile(invalidFile)).toThrow('File type exe is not allowed');
    });

    it('should detect file types from extension and mime type', () => {
      const service = documentService as any;

      expect(service.detectFileType(new File([''], 'test.pdf'))).toBe('pdf');
      expect(service.detectFileType(new File([''], 'test.docx'))).toBe('docx');
      expect(service.detectFileType(new File([''], 'test.txt'))).toBe('txt');
      expect(service.detectFileType(new File([''], 'test.unknown'))).toBe('txt');
    });
  });

  describe('utility methods', () => {
    it('should generate unique file and processing IDs', () => {
      const service = documentService as any;
      
      const fileId1 = service.generateFileId();
      const fileId2 = service.generateFileId();
      const processingId = service.generateProcessingId();

      expect(fileId1).toBe('file_test-uuid-123');
      expect(fileId2).toBe('file_test-uuid-123');
      expect(processingId).toBe('proc_test-uuid-123');
    });

    it('should estimate processing time based on file size', () => {
      const service = documentService as any;
      
      expect(service.estimateProcessingTime(1024 * 1024)).toBe(5); // 1MB = 5 seconds
      expect(service.estimateProcessingTime(5 * 1024 * 1024)).toBe(25); // 5MB = 25 seconds
    });
  });
}); 
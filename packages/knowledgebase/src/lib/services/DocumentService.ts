import { put, del } from '@vercel/blob';
import type { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import {
  type FileMetadata,
  type ProcessingProgress,
  type ProcessingResult,
  type UploadRequest,
  type UploadResponse,
  type EntityType,
  type FileType,
  type DocumentServiceConfig,
  type KnowledgebaseError,
} from '../types';
import { prisma as defaultPrisma } from '../db';

export class DocumentService {
  private prisma: PrismaClient;
  private config: DocumentServiceConfig;
  private processingStatus = new Map<string, ProcessingProgress>();

  constructor(
    prisma: PrismaClient = defaultPrisma,
    config: Partial<DocumentServiceConfig> = {}
  ) {
    this.prisma = prisma;
    
    this.config = {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedFileTypes: ['pdf', 'docx', 'txt', 'html', 'md'],
      chunkSize: 1000,
      chunkOverlap: 200,
      enableAutoProcessing: true,
      enableDeduplication: true,
      ...config,
    };
  }

  /**
   * Upload a document to blob storage and store metadata
   */
  async uploadDocument(request: UploadRequest): Promise<UploadResponse> {
    try {
      // Validate file
      this.validateFile(request.file);
      
      // Generate unique IDs
      const fileId = this.generateFileId();
      const processingId = this.generateProcessingId();

      // Create file metadata
      const metadata: FileMetadata = {
        filename: request.file.name,
        fileType: this.detectFileType(request.file),
        mimeType: request.file.type,
        size: request.file.size,
        uploadedAt: new Date().toISOString(),
        organizationId: request.organizationId,
      };

      // Check for existing file if deduplication is enabled
      if (this.config.enableDeduplication) {
        const contentHash = await this.generateFileHash(request.file);
        const existingFile = await this.findExistingFile(
          contentHash,
          request.organizationId,
          request.entityType,
          request.entityId
        );
        
        if (existingFile) {
          return {
            success: true,
            fileId: existingFile.fileId,
            processingId: processingId,
            message: 'File already exists and has been linked',
          };
        }
      }

      // Upload to blob storage
      const blobResult = await put(
        `${request.organizationId}/${request.entityType}/${request.entityId}/${fileId}`,
        request.file,
        {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN,
        }
      );

      // Store file metadata in database
      await this.storeFileMetadata(
        fileId,
        blobResult.url,
        metadata,
        request.entityType,
        request.entityId
      );

      return {
        success: true,
        fileId,
        processingId,
        message: 'File uploaded successfully',
        estimatedProcessingTime: this.estimateProcessingTime(request.file.size),
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw this.createError('UPLOAD_FAILED', `Failed to upload document: ${errorMessage}`, error);
    }
  }

  /**
   * Get processing status
   */
  getProcessingStatus(processingId: string): ProcessingProgress | null {
    return this.processingStatus.get(processingId) || null;
  }

  /**
   * Delete a document and all associated data
   */
  async deleteDocument(
    fileId: string,
    organizationId: string
  ): Promise<void> {
    try {
      // Get file metadata using the existing schema
      const fileRecord = await this.prisma.fileData.findFirst({
        where: {
          fileId,
          organizationId,
          dataType: 'fileMetadata',
        },
      });

      if (!fileRecord) {
        throw new Error('File not found');
      }

      // Delete from blob storage
      const blobUrl = (fileRecord.metadata as any)?.blobUrl as string;
      if (blobUrl) {
        await del(blobUrl);
      }

      // Delete all associated records
      await this.prisma.$transaction([
        // Delete file data records
        this.prisma.fileData.deleteMany({
          where: { fileId, organizationId },
        }),
        // Delete vector records
        this.prisma.vector.deleteMany({
          where: {
            sourceEntityType: 'FileData',
            sourceEntityId: fileId,
          },
        }),
      ]);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw this.createError('DELETE_FAILED', `Failed to delete document: ${errorMessage}`, error);
    }
  }

  /**
   * List documents for an entity
   */
  async listDocuments(
    entityType: EntityType,
    entityId: string,
    organizationId: string,
    options: {
      limit?: number;
      offset?: number;
      fileTypes?: FileType[];
    } = {}
  ) {
    try {
      const where: any = {
        entityType,
        entityId,
        organizationId,
        dataType: 'fileMetadata',
      };

      const [documents, total] = await Promise.all([
        this.prisma.fileData.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: options.limit || 50,
          skip: options.offset || 0,
        }),
        this.prisma.fileData.count({ where }),
      ]);

      return {
        documents: documents.map((doc: any) => ({
          fileId: doc.fileId,
          metadata: doc.metadata as FileMetadata,
          uploadedAt: doc.createdAt,
        })),
        total,
        hasMore: (options.offset || 0) + documents.length < total,
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw this.createError('LIST_FAILED', `Failed to list documents: ${errorMessage}`, error);
    }
  }

  // Private helper methods
  private validateFile(file: File): void {
    if (file.size > this.config.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`);
    }

    const fileType = this.detectFileType(file);
    if (!this.config.allowedFileTypes.includes(fileType)) {
      throw new Error(`File type ${fileType} is not allowed`);
    }
  }

  private detectFileType(file: File): FileType {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const mimeType = file.type.toLowerCase();

    // Map common file types
    const typeMap: Record<string, FileType> = {
      'pdf': 'pdf',
      'docx': 'docx',
      'doc': 'docx',
      'txt': 'txt',
      'html': 'html',
      'htm': 'html',
      'md': 'md',
      'csv': 'csv',
      'xlsx': 'xlsx',
      'xls': 'xlsx',
      'pptx': 'pptx',
      'ppt': 'pptx',
    };

    // Check by extension first
    if (typeMap[extension]) {
      return typeMap[extension];
    }

    // Check by MIME type
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('openxmlformats-officedocument.wordprocessingml')) return 'docx';
    if (mimeType.includes('text/plain')) return 'txt';
    if (mimeType.includes('text/html')) return 'html';
    if (mimeType.includes('text/markdown')) return 'md';

    // Default to txt for unknown types
    return 'txt';
  }

  private generateFileId(): string {
    return `file_${crypto.randomUUID()}`;
  }

  private generateProcessingId(): string {
    return `proc_${crypto.randomUUID()}`;
  }

  private async generateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    return crypto.createHash('sha256').update(Buffer.from(buffer)).digest('hex');
  }

  private async findExistingFile(
    contentHash: string,
    organizationId: string,
    entityType: EntityType,
    entityId: string
  ) {
    return this.prisma.fileData.findFirst({
      where: {
        contentHash,
        organizationId,
        entityType,
        entityId,
        dataType: 'fileMetadata',
      },
    });
  }

  private async storeFileMetadata(
    fileId: string,
    blobUrl: string,
    metadata: FileMetadata,
    entityType: EntityType,
    entityId: string
  ) {
    await this.prisma.fileData.create({
      data: {
        fileId,
        entityType,
        entityId,
        dataType: 'fileMetadata',
        organizationId: metadata.organizationId,
        metadata: {
          ...metadata,
          blobUrl,
        },
      },
    });
  }

  private estimateProcessingTime(fileSize: number): number {
    // Rough estimation: 1MB = 5 seconds processing time
    return Math.ceil(fileSize / (1024 * 1024)) * 5;
  }

  private updateProcessingStatus(processingId: string, progress: ProcessingProgress) {
    this.processingStatus.set(processingId, progress);
    
    // Clean up old statuses (keep for 1 hour)
    setTimeout(() => {
      this.processingStatus.delete(processingId);
    }, 60 * 60 * 1000);
  }

  private createError(code: string, message: string, originalError?: unknown): KnowledgebaseError {
    return {
      code,
      message,
      details: originalError && originalError instanceof Error ? { originalError: originalError.message } : undefined,
      timestamp: new Date().toISOString(),
      operation: 'DocumentService',
    };
  }
} 
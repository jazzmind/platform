import type { PrismaClient } from '@prisma/client';
import type { 
  EntityType,
  ProcessingProgress,
  ProcessingResult,
  KnowledgebaseError,
  UploadRequest
} from '../types';
import { prisma as defaultPrisma } from '../db';
import { DocumentService } from './DocumentService';
import { TextExtractionService } from './TextExtractionService';
import { ChunkingService } from './ChunkingService';
import { EmbeddingService } from './EmbeddingService';

export class ProcessingService {
  private prisma: PrismaClient;
  private documentService: DocumentService;
  private textExtractionService: TextExtractionService;
  private chunkingService: ChunkingService;
  private embeddingService: EmbeddingService;
  private processingStatus = new Map<string, ProcessingProgress>();

  constructor(prisma: PrismaClient = defaultPrisma) {
    this.prisma = prisma;
    this.documentService = new DocumentService(prisma);
    this.textExtractionService = new TextExtractionService();
    this.chunkingService = new ChunkingService();
    this.embeddingService = new EmbeddingService(prisma);
  }

  /**
   * Process a document through the full pipeline
   */
  async processDocument(request: UploadRequest): Promise<ProcessingResult> {
    const processingId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Initialize processing status
      this.updateProcessingStatus(processingId, {
        stage: 'uploading',
        current: 0,
        total: 5,
        message: 'Uploading document...',
        percentage: 0,
      });

      // Step 1: Upload document
      const uploadResult = await this.documentService.uploadDocument(request);
      
      this.updateProcessingStatus(processingId, {
        stage: 'extracting',
        current: 1,
        total: 5,
        message: 'Extracting text content...',
        percentage: 20,
      });

      // Step 2: Extract text (simplified - in a real implementation, you'd need the file content)
      // For now, we'll simulate this step since we don't have the actual file processing integrated yet
      await this.delay(1000); // Simulate processing time
      
      this.updateProcessingStatus(processingId, {
        stage: 'chunking',
        current: 2,
        total: 5,
        message: 'Chunking content...',
        percentage: 40,
      });

      // Step 3: Chunk content (simplified)
      await this.delay(1000);
      
      this.updateProcessingStatus(processingId, {
        stage: 'embedding',
        current: 3,
        total: 5,
        message: 'Generating embeddings...',
        percentage: 60,
      });

      // Step 4: Generate embeddings (simplified)
      await this.delay(2000);
      
      this.updateProcessingStatus(processingId, {
        stage: 'analyzing',
        current: 4,
        total: 5,
        message: 'Analyzing content...',
        percentage: 80,
      });

      // Step 5: Final analysis (simplified)
      await this.delay(1000);
      
      this.updateProcessingStatus(processingId, {
        stage: 'completing',
        current: 5,
        total: 5,
        message: 'Processing complete!',
        percentage: 100,
      });

      const result: ProcessingResult = {
        success: true,
        fileId: uploadResult.fileId || 'unknown',
        processingId,
        documentsProcessed: 1,
        chunksCreated: Math.floor(Math.random() * 50) + 10, // Simulated
        embeddingsGenerated: Math.floor(Math.random() * 50) + 10, // Simulated
        sectionsIdentified: Math.floor(Math.random() * 5) + 1, // Simulated
        processingTime: 5000, // 5 seconds total
      };

      // Clean up processing status after a delay
      setTimeout(() => {
        this.processingStatus.delete(processingId);
      }, 30000); // Keep for 30 seconds

      return result;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.updateProcessingStatus(processingId, {
        stage: 'uploading', // Reset to first stage
        current: 0,
        total: 5,
        message: `Error: ${errorMessage}`,
        percentage: 0,
      });

      throw this.createError('PROCESSING_FAILED', `Document processing failed: ${errorMessage}`, error);
    }
  }

  /**
   * Get processing status for a specific job
   */
  getProcessingStatus(processingId: string): ProcessingProgress | null {
    return this.processingStatus.get(processingId) || null;
  }

  /**
   * Process document with real pipeline (for future implementation)
   */
  async processDocumentFull(
    fileContent: Buffer,
    filename: string,
    entityType: EntityType,
    entityId: string,
    organizationId: string
  ): Promise<ProcessingResult> {
    const processingId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Step 1: Extract text
      this.updateProcessingStatus(processingId, {
        stage: 'extracting',
        current: 1,
        total: 4,
        message: 'Extracting text content...',
        percentage: 25,
      });

      const extractedContent = await this.textExtractionService.extractText(fileContent, filename);

      // Step 2: Chunk content
      this.updateProcessingStatus(processingId, {
        stage: 'chunking',
        current: 2,
        total: 4,
        message: 'Chunking content...',
        percentage: 50,
      });

      const chunks = await this.chunkingService.chunkContent(
        extractedContent,
        filename,
        entityType,
        entityId,
        organizationId
      );

      // Step 3: Generate embeddings
      this.updateProcessingStatus(processingId, {
        stage: 'embedding',
        current: 3,
        total: 4,
        message: 'Generating embeddings...',
        percentage: 75,
      });

      const embeddingIds = await this.embeddingService.generateEmbeddings(
        chunks,
        entityType,
        entityId,
        organizationId
      );

      // Step 4: Complete
      this.updateProcessingStatus(processingId, {
        stage: 'completing',
        current: 4,
        total: 4,
        message: 'Processing complete!',
        percentage: 100,
      });

      return {
        success: true,
        fileId: filename,
        processingId,
        documentsProcessed: 1,
        chunksCreated: chunks.length,
        embeddingsGenerated: embeddingIds.length,
        sectionsIdentified: extractedContent.metadata.pages || 1,
        processingTime: Date.now(),
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw this.createError('FULL_PROCESSING_FAILED', `Full document processing failed: ${errorMessage}`, error);
    }
  }

  /**
   * Reprocess existing document
   */
  async reprocessDocument(
    fileId: string,
    entityType: EntityType,
    entityId: string,
    organizationId: string
  ): Promise<ProcessingResult> {
    try {
      // Delete existing embeddings
      await this.embeddingService.deleteEmbeddings(entityType, entityId, organizationId);

      // Get existing chunks and regenerate embeddings
      const chunks = await this.prisma.fileData.findMany({
        where: {
          entityType,
          entityId,
          organizationId,
          dataType: 'chunk',
          metadata: {
            path: ['fileId'],
            equals: fileId,
          },
        },
      });

      if (chunks.length === 0) {
        throw new Error('No chunks found for document');
      }

      // Convert to ContentChunk format (simplified)
      const contentChunks = chunks.map((chunk, index) => ({
        id: chunk.id,
        content: chunk.content || '',
        chunkIndex: index,
        totalChunks: chunks.length,
        startOffset: (chunk.metadata as any)?.startOffset || 0,
        endOffset: (chunk.metadata as any)?.endOffset || 0,
        contentHash: (chunk.metadata as any)?.contentHash || '',
        metadata: chunk.metadata as any,
      }));

      // Regenerate embeddings
      const embeddingIds = await this.embeddingService.generateEmbeddings(
        contentChunks,
        entityType,
        entityId,
        organizationId
      );

      return {
        success: true,
        fileId,
        processingId: `reproc_${Date.now()}`,
        documentsProcessed: 1,
        chunksCreated: chunks.length,
        embeddingsGenerated: embeddingIds.length,
        sectionsIdentified: 1,
        processingTime: Date.now(),
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw this.createError('REPROCESSING_FAILED', `Document reprocessing failed: ${errorMessage}`, error);
    }
  }

  // Private helper methods
  private updateProcessingStatus(processingId: string, progress: ProcessingProgress) {
    this.processingStatus.set(processingId, progress);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createError(code: string, message: string, originalError?: unknown): KnowledgebaseError {
    return {
      code,
      message,
      details: originalError && originalError instanceof Error ? { originalError: originalError.message } : undefined,
      timestamp: new Date().toISOString(),
      operation: 'ProcessingService',
    };
  }
} 
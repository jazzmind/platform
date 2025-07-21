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
   * Get processing status for a specific job
   */
  getProcessingStatus(processingId: string): ProcessingProgress | null {
    return this.processingStatus.get(processingId) || null;
  }

  /**
   * Process document with real pipeline (for future implementation)
   */
  async processDocument(
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

      // Detect file type from filename
      const fileExtension = filename.split('.').pop()?.toLowerCase() || 'txt';
      console.log(`🔍 ProcessingService: File extension detected: '${fileExtension}'`);
      
      const fileTypeMap: Record<string, any> = {
        'pdf': 'pdf',
        'docx': 'docx', 
        'doc': 'docx',
        'txt': 'txt',
        'html': 'html',
        'htm': 'html',
        'md': 'txt'
      };
      const fileType = fileTypeMap[fileExtension] || 'txt';
      console.log(`🔍 ProcessingService: Mapped file type: '${fileType}'`);
      console.log(`🔍 ProcessingService: About to call text extraction for ${filename}`);
      
      const extractedContent = await this.textExtractionService.extractText(fileContent, fileType, filename);
      console.log(`✅ ProcessingService: Text extraction completed. Text length: ${extractedContent.text.length}`);
      console.log(`✅ ProcessingService: Extraction metadata:`, extractedContent.metadata);

      // Step 2: Chunk content
      this.updateProcessingStatus(processingId, {
        stage: 'chunking',
        current: 2,
        total: 4,
        message: 'Chunking content...',
        percentage: 50,
      });

      const chunks = await this.chunkingService.createChunks(
        extractedContent,
        filename,
        entityType,
        entityId,
        fileType
      );
      console.log(`✅ ProcessingService: Created ${chunks.length} chunks`);

      // Step 2.5: Store file metadata and chunks in database
      this.updateProcessingStatus(processingId, {
        stage: 'chunking',
        current: 2.5,
        total: 4,
        message: 'Storing file and chunks...',
        percentage: 62,
      });

      // First upload the file metadata
      const uploadResult = await this.documentService.uploadDocument({
        file: new File([fileContent], filename),
        entityType,
        entityId,
        organizationId,
      });
      console.log(`✅ ProcessingService: File metadata stored with ID: ${uploadResult.fileId}`);

      // Store chunks in database
      await this.storeChunks(chunks, uploadResult.fileId, entityType, entityId, organizationId);
      console.log(`✅ ProcessingService: Stored ${chunks.length} chunks in database`);

      // Step 3: Generate embeddings
      this.updateProcessingStatus(processingId, {
        stage: 'embedding',
        current: 3,
        total: 4,
        message: 'Generating embeddings...',
        percentage: 75,
      });

      // Re-fetch chunks from database to get their IDs for embedding generation
      const storedChunks = await this.prisma.fileData.findMany({
        where: {
          fileId: uploadResult.fileId,
          entityType,
          entityId,
          organizationId,
          dataType: 'chunk',
        },
      });
      console.log(`✅ ProcessingService: Retrieved ${storedChunks.length} stored chunks for embedding`);

      // Validate chunks before generating embeddings
      if (storedChunks.length === 0) {
        throw new Error('No chunks found in database for embedding generation');
      }

      // Check chunk content
      const chunksWithContent = storedChunks.filter(chunk => chunk.content && chunk.content.trim().length > 0);
      console.log(`📊 ProcessingService: ${chunksWithContent.length}/${storedChunks.length} chunks have content`);
      
      if (chunksWithContent.length === 0) {
        throw new Error('No chunks contain valid content for embedding generation');
      }

      // Prepare chunks for embedding with validation
      const chunksForEmbedding = chunksWithContent.map((chunk, index) => {
        const chunkData = {
          id: chunk.id,
          content: chunk.content || '',
          chunkIndex: index,
          totalChunks: chunksWithContent.length,
          startOffset: 0,
          endOffset: chunk.content?.length || 0,
          contentHash: chunk.contentHash || '',
          metadata: chunk.metadata as any,
        };
        
        console.log(`📝 ProcessingService: Chunk ${index + 1} - ID: ${chunk.id}, Content length: ${chunkData.content.length}`);
        return chunkData;
      });

      console.log(`🔧 ProcessingService: About to generate embeddings for ${chunksForEmbedding.length} chunks`);

      const embeddingIds = await this.embeddingService.generateEmbeddings(
        chunksForEmbedding,
        entityType,
        entityId,
        organizationId
      );
      console.log(`✅ ProcessingService: Generated ${embeddingIds.length} embeddings`);

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
      await this.embeddingService.deleteEmbeddings(entityType, entityId, organizationId, [fileId]);

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
  private async storeChunks(
    chunks: any[],
    fileId: string,
    entityType: EntityType,
    entityId: string,
    organizationId: string
  ): Promise<void> {
    console.log(`🔧 ProcessingService: Storing ${chunks.length} chunks for file ${fileId}`);
    
    for (const chunk of chunks) {
      await this.prisma.fileData.create({
        data: {
          fileId,
          entityType,
          entityId,
          dataType: 'chunk',
          chunkIndex: chunk.chunkIndex,
          totalChunks: chunk.totalChunks,
          content: chunk.content,
          contentHash: chunk.contentHash,
          metadata: chunk.metadata || {},
          organizationId,
        },
      });
    }
  }

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
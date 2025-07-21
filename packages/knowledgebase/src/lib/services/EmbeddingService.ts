import OpenAI from 'openai';
import type { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import type { 
  ContentChunk, 
  EntityType,
  EmbeddingServiceConfig,
  KnowledgebaseError 
} from '../types';
import { prisma as defaultPrisma } from '../db';

export class EmbeddingService {
  private openai: OpenAI;
  private prisma: PrismaClient;
  private config: EmbeddingServiceConfig;

  constructor(
    prisma: PrismaClient = defaultPrisma,
    config: Partial<EmbeddingServiceConfig> = {}
  ) {
    this.prisma = prisma;
    
    this.config = {
      model: 'text-embedding-3-small',
      dimensions: 1536,
      batchSize: 100,
      retryAttempts: 3,
      retryDelay: 1000,
      maxRetries: 3,
      timeout: 30000,
      ...config,
    };

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate embeddings for text chunks
   */
  async generateEmbeddings(
    chunks: ContentChunk[],
    entityType: EntityType,
    entityId: string,
    organizationId: string
  ): Promise<string[]> {
    try {
      console.log(`🔧 EmbeddingService: Starting embedding generation for ${chunks.length} chunks`);
      
      if (chunks.length === 0) {
        throw new Error('No chunks provided for embedding generation');
      }

      // Validate chunk content
      const validChunks = chunks.filter(chunk => {
        const hasContent = chunk.content && chunk.content.trim().length > 0;
        const isReasonableSize = chunk.content.length <= 6000; // OpenAI limit is ~8192 tokens, be conservative
        
        if (!hasContent) {
          console.warn(`⚠️ EmbeddingService: Chunk ${chunk.id} has no content, skipping`);
          return false;
        }
        
        if (!isReasonableSize) {
          console.error(`❌ EmbeddingService: Chunk ${chunk.id} is too large (${chunk.content.length} chars), skipping`);
          console.error(`❌ EmbeddingService: Large chunk preview: "${chunk.content.substring(0, 200)}..."`);
          return false;
        }
        
        return true;
      });

      if (validChunks.length === 0) {
        throw new Error('No chunks have valid content for embedding generation');
      }

      console.log(`📊 EmbeddingService: ${validChunks.length}/${chunks.length} chunks are valid for embedding`);

      const embeddingIds: string[] = [];
      const batchSize = this.config.batchSize;

      // Process in batches
      for (let i = 0; i < validChunks.length; i += batchSize) {
        const batch = validChunks.slice(i, i + batchSize);
        console.log(`🔄 EmbeddingService: Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(validChunks.length / batchSize)} (${batch.length} chunks)`);
        
        try {
          // Prepare texts for OpenAI API with additional validation
          const texts = batch.map(chunk => {
            if (!chunk.content || chunk.content.trim().length === 0) {
              throw new Error(`Chunk ${chunk.id} has empty content`);
            }
            
            const content = chunk.content.trim();
            if (content.length > 6000) {
              throw new Error(`Chunk ${chunk.id} content is too large for OpenAI API (${content.length} characters)`);
            }
            
            return content;
          });

          console.log(`🤖 EmbeddingService: Calling OpenAI API for ${texts.length} texts`);
          console.log(`🤖 EmbeddingService: Text lengths: ${texts.map(t => t.length).join(', ')}`);
          console.log(`🤖 EmbeddingService: Max text length in batch: ${Math.max(...texts.map(t => t.length))}`);

          // Call OpenAI API
          const response = await this.retryOperation(async () => {
            return this.openai.embeddings.create({
              model: this.config.model,
              input: texts,
              dimensions: this.config.dimensions,
            });
          });

          console.log(`✅ EmbeddingService: OpenAI API returned ${response.data.length} embeddings`);

          // Store embeddings in database
          for (let j = 0; j < batch.length; j++) {
            const chunk = batch[j];
            const embedding = response.data[j].embedding;
            
            console.log(`💾 EmbeddingService: Storing embedding for chunk ${chunk.id}`);

            const vectorId = await this.storeEmbedding(
              embedding,
              chunk,
              entityType,
              entityId,
              organizationId
            );

            embeddingIds.push(vectorId);
          }

          console.log(`✅ EmbeddingService: Completed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(validChunks.length / batchSize)}`);

        } catch (batchError) {
          console.error(`❌ EmbeddingService: Batch processing failed:`, batchError);
          throw new Error(`Batch embedding generation failed: ${batchError instanceof Error ? batchError.message : 'Unknown batch error'}`);
        }
      }

      console.log(`✅ EmbeddingService: Successfully generated ${embeddingIds.length} embeddings`);
      return embeddingIds;

    } catch (error: unknown) {
      console.error(`❌ EmbeddingService: Embedding generation failed:`, error);
      
      // Detailed error logging
      if (error instanceof Error) {
        console.error(`❌ EmbeddingService: Error name: ${error.name}`);
        console.error(`❌ EmbeddingService: Error message: ${error.message}`);
        console.error(`❌ EmbeddingService: Error stack: ${error.stack}`);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw this.createError('EMBEDDING_GENERATION_FAILED', `Failed to generate embeddings: ${errorMessage}`, error);
    }
  }

  /**
   * Generate embeddings for a single text
   */
  async generateSingleEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.retryOperation(async () => {
        return this.openai.embeddings.create({
          model: this.config.model,
          input: text,
          dimensions: this.config.dimensions,
        });
      });

      return response.data[0].embedding;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw this.createError('SINGLE_EMBEDDING_FAILED', `Failed to generate single embedding: ${errorMessage}`, error);
    }
  }

  /**
   * Find similar embeddings using pgvector cosine similarity
   */
  async findSimilarEmbeddings(
    queryEmbedding: number[],
    entityType: EntityType,
    entityId: string,
    options: {
      limit?: number;
      threshold?: number;
    } = {}
  ) {
    try {
      const { limit = 10, threshold = 0.7 } = options;
      
      console.log(`🔍 EmbeddingService: Finding similar embeddings using pgvector for ${entityType}/${entityId}`);
      
      const queryVector = `[${queryEmbedding.join(',')}]`;
      
      // Use pgvector's cosine distance operator (<=>)  
      // Note: cosine distance = 1 - cosine similarity, so smaller distance = higher similarity
      const maxDistance = 1 - threshold;
      
      const results = await this.prisma.$queryRaw<Array<{
        id: string;
        entityType: string;
        entityId: string;
        sourceEntityType: string | null;
        sourceEntityId: string | null;
        contentHash: string | null;
        metadata: any;
        createdAt: Date;
        updatedAt: Date;
        similarity: number;
      }>>`
        SELECT 
          id, "entityType", "entityId", "sourceEntityType", "sourceEntityId",
          "contentHash", metadata, "createdAt", "updatedAt",
          1 - (embedding <=> ${queryVector}::vector) AS similarity
        FROM vectors 
        WHERE "entityType" = ${entityType} 
          AND "entityId" = ${entityId}
          AND (embedding <=> ${queryVector}::vector) <= ${maxDistance}
        ORDER BY embedding <=> ${queryVector}::vector
        LIMIT ${limit}
      `;
      
      console.log(`✅ EmbeddingService: Found ${results.length} similar embeddings with pgvector`);
      
      return results.map(result => ({
        ...result,
        vector: null, // Don't return the actual vector data to save bandwidth
      }));

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw this.createError('SIMILARITY_SEARCH_FAILED', `Failed to find similar embeddings: ${errorMessage}`, error);
    }
  }

  /**
   * Update embeddings for existing chunks
   */
  async updateEmbeddings(
    chunkIds: string[],
    entityType: EntityType,
    entityId: string,
    organizationId: string
  ): Promise<void> {
    try {
      // Get existing chunks
      const chunks = await this.prisma.fileData.findMany({
        where: {
          entityType,
          entityId,
          organizationId,
          dataType: 'chunk',
          id: { in: chunkIds },
        },
      });

             const contentChunks: ContentChunk[] = chunks.map((chunk, index) => ({
         id: chunk.id,
         content: chunk.content || '',
         chunkIndex: index,
         totalChunks: chunks.length,
         startOffset: (chunk.metadata as any)?.startIndex || 0,
         endOffset: (chunk.metadata as any)?.endIndex || 0,
         contentHash: crypto.createHash('sha256').update(chunk.content || '').digest('hex'),
         metadata: {
           section: (chunk.metadata as any)?.section,
           type: (chunk.metadata as any)?.type || 'paragraph',
           confidence: (chunk.metadata as any)?.confidence || 1.0,
         },
       }));

      // Regenerate embeddings
      await this.generateEmbeddings(contentChunks, entityType, entityId, organizationId);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw this.createError('UPDATE_EMBEDDINGS_FAILED', `Failed to update embeddings: ${errorMessage}`, error);
    }
  }

  /**
   * Delete embeddings
   */
  async deleteEmbeddings(
    entityType: EntityType,
    entityId: string,
    organizationId: string,
    chunkIds?: string[]
  ): Promise<void> {
    try {
      const where: any = {
        entityType,
        entityId,
        organizationId,
      };

      if (chunkIds) {
        where.sourceEntityId = { in: chunkIds };
      }

      await this.prisma.vector.deleteMany({ where });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw this.createError('DELETE_EMBEDDINGS_FAILED', `Failed to delete embeddings: ${errorMessage}`, error);
    }
  }

  // Private helper methods
  private async generateBatchEmbeddings(chunks: ContentChunk[]) {
    const texts = chunks.map(chunk => chunk.content);
    
    const response = await this.retryOperation(async () => {
      return this.openai.embeddings.create({
        model: this.config.model,
        input: texts,
        dimensions: this.config.dimensions,
      });
    });

    return response.data.map((embedding, index) => ({
      id: this.generateEmbeddingId(),
      chunkId: chunks[index].id,
      embedding: embedding.embedding,
    }));
  }

  private async storeBatchEmbeddings(
    chunks: ContentChunk[],
    embeddings: Array<{ id: string; chunkId: string; embedding: number[] }>,
    entityType: EntityType,
    entityId: string
  ) {
    console.log(`🔧 EmbeddingService: Storing ${embeddings.length} pgvector embeddings`);
    
    // Use raw SQL for pgvector insertion since Prisma doesn't fully support vector types yet
    for (const [index, emb] of embeddings.entries()) {
      const vectorString = `[${emb.embedding.join(',')}]`;
      const metadataJson = JSON.stringify({
        chunkText: chunks[index].content.substring(0, 500),
        chunkMetadata: chunks[index].metadata,
        generatedAt: new Date().toISOString(),
        model: this.config.model,
        dimensions: this.config.dimensions,
      });
      
      await this.prisma.$executeRaw`
        INSERT INTO vectors (
          id, "entityType", "entityId", "sourceEntityType", "sourceEntityId", 
          "contentHash", embedding, metadata, "createdAt", "updatedAt"
        ) VALUES (
          ${emb.id}, ${entityType}, ${entityId}, 'chunk', ${emb.chunkId},
          ${chunks[index].contentHash}, CAST(${vectorString} AS vector), 
          CAST(${metadataJson} AS jsonb), NOW(), NOW()
        )
      `;
    }
    
    console.log(`✅ EmbeddingService: Successfully stored ${embeddings.length} pgvector embeddings`);
  }

  private async storeEmbedding(
    embedding: number[],
    chunk: ContentChunk,
    entityType: EntityType,
    entityId: string,
    organizationId: string
  ): Promise<string> {
    const embeddingId = this.generateEmbeddingId();
    const vectorString = `[${embedding.join(',')}]`;
    const metadataJson = JSON.stringify({
      chunkText: chunk.content.substring(0, 500),
      chunkMetadata: chunk.metadata,
      generatedAt: new Date().toISOString(),
      model: this.config.model,
      dimensions: this.config.dimensions,
      organizationId,
    });
    
    await this.prisma.$executeRaw`
      INSERT INTO vectors (
        id, "entityType", "entityId", "sourceEntityType", "sourceEntityId", 
        "contentHash", embedding, metadata, "createdAt", "updatedAt"
      ) VALUES (
        ${embeddingId}, ${entityType}, ${entityId}, 'chunk', ${chunk.id},
        ${chunk.contentHash}, CAST(${vectorString} AS vector), 
        CAST(${metadataJson} AS jsonb), NOW(), NOW()
      )
    `;
    
    return embeddingId;
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    attempts: number = this.config.retryAttempts
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < attempts; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (i < attempts - 1) {
          await this.delay(this.config.retryDelay * Math.pow(2, i)); // Exponential backoff
        }
      }
    }

    throw lastError!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Removed cosineSimilarity method - now using pgvector's native cosine distance operator (<=>) for much better performance

  private generateEmbeddingId(): string {
    return `emb_${crypto.randomUUID()}`;
  }

  private createError(code: string, message: string, originalError?: unknown): KnowledgebaseError {
    return {
      code,
      message,
      details: originalError && originalError instanceof Error ? { originalError: originalError.message } : undefined,
      timestamp: new Date().toISOString(),
      operation: 'EmbeddingService',
    };
  }
} 
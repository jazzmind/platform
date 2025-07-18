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
      const embeddings: string[] = [];
      
      // Process chunks in batches
      for (let i = 0; i < chunks.length; i += this.config.batchSize) {
        const batch = chunks.slice(i, i + this.config.batchSize);
        const batchEmbeddings = await this.generateBatchEmbeddings(batch);
        
                 // Store embeddings in database
         await this.storeBatchEmbeddings(
           batch,
           batchEmbeddings,
           entityType,
           entityId
         );
        
        embeddings.push(...batchEmbeddings.map(e => e.id));
      }

      return embeddings;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw this.createError('EMBEDDING_FAILED', `Failed to generate embeddings: ${errorMessage}`, error);
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
   * Find similar embeddings using vector search
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

      // Note: This is a simplified similarity search
      // In production, you'd want to use a proper vector database like Pinecone, Weaviate, or pgvector
      const vectors = await this.prisma.vector.findMany({
        where: {
          entityType,
          entityId,
        },
        take: limit * 2, // Get more results to filter by similarity
      });

      // Calculate cosine similarity
      const similarities = vectors.map(vector => {
        const embedding = vector.vector as number[];
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);
        
        return {
          ...vector,
          similarity,
        };
      });

      // Filter by threshold and sort by similarity
      return similarities
        .filter(item => item.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

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
    const vectorData = embeddings.map((emb, index) => ({
      id: emb.id,
      vector: emb.embedding,
      entityType,
      entityId,
      sourceEntityType: 'chunk',
      sourceEntityId: emb.chunkId,
      contentHash: chunks[index].contentHash,
      metadata: {
        chunkText: chunks[index].content.substring(0, 500), // Store first 500 chars for reference
        chunkMetadata: chunks[index].metadata as any,
        generatedAt: new Date().toISOString(),
        model: this.config.model,
        dimensions: this.config.dimensions,
      },
    }));

    await this.prisma.vector.createMany({
      data: vectorData,
    });
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

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

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
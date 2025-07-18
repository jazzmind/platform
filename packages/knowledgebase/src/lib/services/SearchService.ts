import type { PrismaClient } from '@prisma/client';
import type { 
  EntityType,
  SearchServiceConfig,
  SearchResult,
  SearchFilters,
  KnowledgebaseError 
} from '../types';
import { prisma as defaultPrisma } from '../db';
import { EmbeddingService } from './EmbeddingService';

export class SearchService {
  private prisma: PrismaClient;
  private embeddingService: EmbeddingService;
  private config: SearchServiceConfig;

  constructor(
    prisma: PrismaClient = defaultPrisma,
    embeddingService?: EmbeddingService,
    config: Partial<SearchServiceConfig> = {}
  ) {
    this.prisma = prisma;
    this.embeddingService = embeddingService || new EmbeddingService(prisma);
    
    this.config = {
      defaultLimit: 10,
      maxLimit: 100,
      similarityThreshold: 0.7,
      ...config,
    };
  }

  /**
   * Perform semantic search using vector embeddings
   */
  async search(
    query: string,
    entityType: EntityType,
    entityId: string,
    options: {
      limit?: number;
      filters?: SearchFilters;
      threshold?: number;
      includeMetadata?: boolean;
    } = {}
  ): Promise<SearchResult[]> {
    try {
      const { 
        limit = this.config.defaultLimit, 
        threshold = this.config.similarityThreshold,
        includeMetadata = true,
        filters 
      } = options;

      // Validate limit
      const validLimit = Math.min(limit, this.config.maxLimit);

      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateSingleEmbedding(query);

      // Find similar embeddings
      const similarVectors = await this.embeddingService.findSimilarEmbeddings(
        queryEmbedding,
        entityType,
        entityId,
        {
          limit: validLimit * 2, // Get more results to filter
          threshold,
        }
      );

      // Get the source chunks and their metadata
      const chunkIds = similarVectors.map(v => v.sourceEntityId).filter(Boolean) as string[];
      
      const chunks = await this.prisma.fileData.findMany({
        where: {
          id: { in: chunkIds },
          entityType,
          entityId,
          dataType: 'chunk',
          ...(filters && this.buildFiltersWhere(filters)),
        },
      });

      // Create search results
      const results: SearchResult[] = similarVectors
        .map(vector => {
          const chunk = chunks.find(c => c.id === vector.sourceEntityId);
          if (!chunk) return null;

          const result: SearchResult = {
            id: chunk.id,
            score: (vector as any).similarity,
            content: chunk.content || '',
            title: (chunk.metadata as any)?.title || '',
            excerpt: this.generateExcerpt(chunk.content || '', query),
            type: 'chunk',
            source: {
              type: 'chunk',
              id: chunk.id,
              filename: (chunk.metadata as any)?.filename || '',
            },
          };

          if (includeMetadata) {
            result.metadata = {
              chunkIndex: (chunk.metadata as any)?.chunkIndex,
              startOffset: (chunk.metadata as any)?.startOffset,
              endOffset: (chunk.metadata as any)?.endOffset,
              confidence: (chunk.metadata as any)?.confidence,
              section: (chunk.metadata as any)?.section,
              ...(chunk.metadata as any),
            };
          }

          return result;
        })
        .filter(Boolean) as SearchResult[];

      // Sort by score and limit results
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, validLimit);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw this.createError('SEARCH_FAILED', `Search failed: ${errorMessage}`, error);
    }
  }

  /**
   * Search within specific document
   */
  async searchInDocument(
    query: string,
    fileId: string,
    entityType: EntityType,
    entityId: string,
    options: {
      limit?: number;
      threshold?: number;
    } = {}
  ): Promise<SearchResult[]> {
    try {
      const { limit = this.config.defaultLimit, threshold = this.config.similarityThreshold } = options;

      // Get chunks from specific document
      const chunks = await this.prisma.fileData.findMany({
        where: {
          entityType,
          entityId,
          dataType: 'chunk',
          metadata: {
            path: ['fileId'],
            equals: fileId,
          },
        },
      });

      if (chunks.length === 0) {
        return [];
      }

      // Generate embedding for query
      const queryEmbedding = await this.embeddingService.generateSingleEmbedding(query);

      // Get vectors for these chunks
      const chunkIds = chunks.map(c => c.id);
      const vectors = await this.prisma.vector.findMany({
        where: {
          sourceEntityId: { in: chunkIds },
          entityType,
          entityId,
        },
      });

      // Calculate similarities and create results
      const results: SearchResult[] = [];

      for (const vector of vectors) {
        const chunk = chunks.find(c => c.id === vector.sourceEntityId);
        if (!chunk) continue;

        const embedding = vector.vector as number[];
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);

        if (similarity >= threshold) {
          results.push({
            id: chunk.id,
            score: similarity,
            content: chunk.content || '',
            title: (chunk.metadata as any)?.title || '',
            excerpt: this.generateExcerpt(chunk.content || '', query),
            type: 'chunk',
            source: {
              type: 'chunk',
              id: chunk.id,
              filename: (chunk.metadata as any)?.filename || '',
            },
            metadata: {
              chunkIndex: (chunk.metadata as any)?.chunkIndex,
              startOffset: (chunk.metadata as any)?.startOffset,
              endOffset: (chunk.metadata as any)?.endOffset,
              fileId,
            },
          });
        }
      }

      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw this.createError('DOCUMENT_SEARCH_FAILED', `Document search failed: ${errorMessage}`, error);
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSuggestions(
    partialQuery: string,
    entityType: EntityType,
    entityId: string,
    limit: number = 5
  ): Promise<string[]> {
    try {
      if (partialQuery.length < 2) {
        return [];
      }

      // This is a simplified version - in production you might want
      // to use a more sophisticated approach like n-grams or elasticsearch
      const chunks = await this.prisma.fileData.findMany({
        where: {
          entityType,
          entityId,
          dataType: 'chunk',
          content: {
            contains: partialQuery,
            mode: 'insensitive',
          },
        },
        take: limit * 2,
      });

      const suggestions = new Set<string>();
      
      for (const chunk of chunks) {
        const content = chunk.content || '';
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        
        for (const sentence of sentences) {
          if (sentence.toLowerCase().includes(partialQuery.toLowerCase())) {
            const words = sentence.trim().split(/\s+/);
            if (words.length <= 10) { // Keep suggestions short
              suggestions.add(sentence.trim());
              if (suggestions.size >= limit) break;
            }
          }
        }
        
        if (suggestions.size >= limit) break;
      }

      return Array.from(suggestions);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw this.createError('SUGGESTIONS_FAILED', `Failed to get suggestions: ${errorMessage}`, error);
    }
  }

  /**
   * Get related content based on a specific chunk
   */
  async getRelatedContent(
    chunkId: string,
    entityType: EntityType,
    entityId: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    try {
      // Get the vector for the source chunk
      const sourceVector = await this.prisma.vector.findFirst({
        where: {
          sourceEntityId: chunkId,
          entityType,
          entityId,
        },
      });

      if (!sourceVector) {
        return [];
      }

      const queryEmbedding = sourceVector.vector as number[];

      // Find similar content
      return this.embeddingService.findSimilarEmbeddings(
        queryEmbedding,
        entityType,
        entityId,
        {
          limit: limit + 1, // +1 to exclude the source chunk
          threshold: 0.5, // Lower threshold for related content
        }
      ).then(vectors => {
        return vectors
          .filter(v => v.sourceEntityId !== chunkId) // Exclude source chunk
          .slice(0, limit)
          .map(vector => ({
            id: vector.sourceEntityId || '',
            score: (vector as any).similarity,
            content: '',
            title: '',
            excerpt: '',
            type: 'chunk' as const,
            source: {
              type: 'chunk' as const,
              id: vector.sourceEntityId || '',
              filename: '',
            },
          }));
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw this.createError('RELATED_CONTENT_FAILED', `Failed to get related content: ${errorMessage}`, error);
    }
  }

  // Private helper methods
  private buildFiltersWhere(filters: SearchFilters): any {
    const where: any = {};

    if (filters.fileTypes && filters.fileTypes.length > 0) {
      where.metadata = {
        path: ['fileType'],
        in: filters.fileTypes,
      };
    }

    if (filters.dateRange) {
      where.createdAt = {};
      if (filters.dateRange.start) {
        where.createdAt.gte = new Date(filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        where.createdAt.lte = new Date(filters.dateRange.end);
      }
    }

    return where;
  }

  private generateExcerpt(content: string, query: string, maxLength: number = 200): string {
    const queryWords = query.toLowerCase().split(/\s+/);
    const sentences = content.split(/[.!?]+/);
    
    // Find sentence containing query words
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (queryWords.some(word => lowerSentence.includes(word))) {
        if (sentence.length <= maxLength) {
          return sentence.trim();
        } else {
          // Truncate around the first query word found
          const firstWordIndex = queryWords.findIndex(word => lowerSentence.includes(word));
          if (firstWordIndex >= 0) {
            const word = queryWords[firstWordIndex];
            const wordPos = lowerSentence.indexOf(word);
            const start = Math.max(0, wordPos - maxLength / 2);
            const end = Math.min(sentence.length, start + maxLength);
            return sentence.substring(start, end).trim() + '...';
          }
        }
      }
    }

    // Fallback to truncated content
    return content.substring(0, maxLength).trim() + '...';
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

  private createError(code: string, message: string, originalError?: unknown): KnowledgebaseError {
    return {
      code,
      message,
      details: originalError && originalError instanceof Error ? { originalError: originalError.message } : undefined,
      timestamp: new Date().toISOString(),
      operation: 'SearchService',
    };
  }
} 
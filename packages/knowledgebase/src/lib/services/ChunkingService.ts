import type { ContentChunk, ExtractedContent, FileType, KnowledgebaseError } from '../types';
import crypto from 'crypto';

export interface ChunkingConfig {
  chunkSize: number;
  chunkOverlap: number;
  separators: string[];
  keepSeparator: boolean;
  minChunkSize: number;
  maxChunkSize: number;
}

export class ChunkingService {
  private config: ChunkingConfig;

  constructor(config: Partial<ChunkingConfig> = {}) {
    this.config = {
      chunkSize: 800,      // Reduced from 1000 to be safer for OpenAI limits
      chunkOverlap: 100,   // Reduced overlap 
      separators: ['\n\n', '\n', '.', '!', '?', ';', ':', ' '],
      keepSeparator: true,
      minChunkSize: 50,    // Reduced minimum
      maxChunkSize: 1200,  // Much smaller max (OpenAI limit is ~8000 chars, so be conservative)
      ...config,
    };
  }

  /**
   * Split extracted content into chunks
   */
  async createChunks(
    extractedContent: ExtractedContent,
    fileId: string,
    entityType: string,
    entityId: string,
    fileType?: string
  ): Promise<ContentChunk[]> {
    try {
      const { text } = extractedContent;
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text content to chunk');
      }

      console.log(`📝 ChunkingService: Input text length: ${text.length} characters`);

      const chunks = await this.splitText(text);
      
      console.log(`📝 ChunkingService: Created ${chunks.length} chunks`);
      chunks.forEach((chunk, index) => {
        console.log(`📝 Chunk ${index + 1}: ${chunk.length} characters`);
        if (chunk.length > this.config.maxChunkSize) {
          console.error(`❌ ChunkingService: Chunk ${index + 1} is too large (${chunk.length} > ${this.config.maxChunkSize})`);
        }
      });

      // Validate all chunks are within size limits
      const oversizedChunks = chunks.filter(chunk => chunk.length > this.config.maxChunkSize);
      if (oversizedChunks.length > 0) {
        console.error(`❌ ChunkingService: ${oversizedChunks.length} chunks exceed maxChunkSize`);
        // Force split oversized chunks
        const validChunks: string[] = [];
        for (const chunk of chunks) {
          if (chunk.length <= this.config.maxChunkSize) {
            validChunks.push(chunk);
          } else {
            const splitChunks = this.forceSplitLargeChunk(chunk);
            validChunks.push(...splitChunks);
          }
        }
        console.log(`📝 ChunkingService: After force splitting: ${validChunks.length} chunks`);
        return this.createContentChunks(validChunks, fileId, entityType, entityId, fileType);
      }
      
      return this.createContentChunks(chunks, fileId, entityType, entityId, fileType);

    } catch (error) {
      throw this.createError(
        'CHUNKING_FAILED',
        `Failed to create chunks: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  private createContentChunks(
    chunks: string[],
    fileId: string,
    entityType: string,
    entityId: string,
    fileType?: string
  ): ContentChunk[] {
    return chunks.map((chunk, index) => ({
      id: this.generateChunkId(fileId, index),
      content: chunk.trim(),
      chunkIndex: index,
      totalChunks: chunks.length,
      startOffset: this.calculateStartOffset(chunks.join(''), chunk, index),
      endOffset: this.calculateEndOffset(chunks.join(''), chunk, index),
      contentHash: this.generateContentHash(chunk),
      metadata: {
        fileId,
        entityType,
        entityId,
        fileType: fileType || 'unknown',
        chunkSize: chunk.length,
        wordsCount: this.countWords(chunk),
        extractedFrom: fileId,
        createdAt: new Date().toISOString(),
      },
    }));
  }

  /**
   * Force split chunks that are still too large
   */
  private forceSplitLargeChunk(chunk: string): string[] {
    const maxSize = Math.floor(this.config.maxChunkSize * 0.9); // 90% of max for safety
    const chunks: string[] = [];
    
    let remaining = chunk;
    while (remaining.length > maxSize) {
      // Find the last sentence boundary before maxSize
      let splitPoint = maxSize;
      const sentenceEnders = ['.', '!', '?', '\n'];
      
      for (let i = maxSize - 1; i > maxSize - 200 && i > 0; i--) {
        if (sentenceEnders.includes(remaining[i])) {
          splitPoint = i + 1;
          break;
        }
      }
      
      chunks.push(remaining.substring(0, splitPoint).trim());
      remaining = remaining.substring(splitPoint).trim();
    }
    
    if (remaining.length > 0) {
      chunks.push(remaining);
    }
    
    console.log(`🔧 ChunkingService: Force split large chunk into ${chunks.length} smaller chunks`);
    return chunks;
  }

  /**
   * Split text into chunks using intelligent splitting
   */
  private async splitText(text: string): Promise<string[]> {
    const chunks: string[] = [];
    let currentChunk = '';
    
    // First, try to split by paragraphs
    const paragraphs = text.split(/\n\s*\n/);
    
    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      
      if (!trimmedParagraph) continue;
      
      // If adding this paragraph would exceed chunk size, finalize current chunk
      if (currentChunk.length + trimmedParagraph.length > this.config.chunkSize) {
        if (currentChunk.length >= this.config.minChunkSize) {
          chunks.push(currentChunk.trim());
          
          // Add overlap from the end of the previous chunk
          currentChunk = this.getOverlapText(currentChunk, this.config.chunkOverlap);
        } else {
          // If current chunk is too small, continue building it
          currentChunk += '\n\n' + trimmedParagraph;
          continue;
        }
      }
      
      // Add paragraph to current chunk
      if (currentChunk) {
        currentChunk += '\n\n' + trimmedParagraph;
      } else {
        currentChunk = trimmedParagraph;
      }
      
      // If paragraph itself is too large, split it further
      if (trimmedParagraph.length > this.config.maxChunkSize) {
        const subChunks = await this.splitLargeParagraph(trimmedParagraph);
        
        // Remove the large paragraph from current chunk
        currentChunk = currentChunk.replace(trimmedParagraph, '').trim();
        
        // Add sub-chunks
        for (const subChunk of subChunks) {
          if (currentChunk && currentChunk.length + subChunk.length > this.config.chunkSize) {
            chunks.push(currentChunk.trim());
            currentChunk = this.getOverlapText(currentChunk, this.config.chunkOverlap);
          }
          
          if (currentChunk) {
            currentChunk += '\n' + subChunk;
          } else {
            currentChunk = subChunk;
          }
          
          if (currentChunk.length >= this.config.chunkSize) {
            chunks.push(currentChunk.trim());
            currentChunk = this.getOverlapText(currentChunk, this.config.chunkOverlap);
          }
        }
      }
    }
    
    // Add remaining content as final chunk
    if (currentChunk.trim() && currentChunk.trim().length >= this.config.minChunkSize) {
      chunks.push(currentChunk.trim());
    } else if (currentChunk.trim() && chunks.length > 0) {
      // If final chunk is too small, append to last chunk
      chunks[chunks.length - 1] += '\n' + currentChunk.trim();
    }
    
    return chunks.filter(chunk => chunk.length >= this.config.minChunkSize);
  }

  /**
   * Split large paragraphs using sentence boundaries
   */
  private async splitLargeParagraph(paragraph: string): Promise<string[]> {
    const chunks: string[] = [];
    
    // Split by sentences
    const sentences = this.splitIntoSentences(paragraph);
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > this.config.chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = this.getOverlapText(currentChunk, this.config.chunkOverlap);
        }
      }
      
      currentChunk += ' ' + sentence;
      
      // If single sentence is still too large, split by words
      if (sentence.length > this.config.maxChunkSize) {
        const wordChunks = this.splitByWords(sentence);
        chunks.push(...wordChunks);
        currentChunk = '';
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Simple sentence boundary detection
    return text
      .split(/[.!?]+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0)
      .map(sentence => sentence + '.');
  }

  /**
   * Split by words when all else fails
   */
  private splitByWords(text: string): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const word of words) {
      if (currentChunk.length + word.length + 1 > this.config.chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = word;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + word;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Get overlap text from the end of a chunk
   */
  private getOverlapText(chunk: string, overlapSize: number): string {
    if (chunk.length <= overlapSize) {
      return chunk;
    }
    
    const overlap = chunk.slice(-overlapSize);
    
    // Try to break at word boundary
    const lastSpace = overlap.indexOf(' ');
    if (lastSpace > 0) {
      return overlap.slice(lastSpace + 1);
    }
    
    return overlap;
  }

  /**
   * Calculate approximate start offset
   */
  private calculateStartOffset(fullText: string, chunk: string, index: number): number {
    if (index === 0) return 0;
    
    const beforeIndex = fullText.indexOf(chunk);
    return beforeIndex >= 0 ? beforeIndex : index * this.config.chunkSize;
  }

  /**
   * Calculate approximate end offset
   */
  private calculateEndOffset(fullText: string, chunk: string, index: number): number {
    const startOffset = this.calculateStartOffset(fullText, chunk, index);
    return startOffset + chunk.length;
  }

  /**
   * Generate unique chunk ID
   */
  private generateChunkId(fileId: string, index: number): string {
    return `${fileId}_chunk_${index.toString().padStart(4, '0')}`;
  }

  /**
   * Generate content hash for deduplication
   */
  private generateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content.trim()).digest('hex');
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length;
  }

  /**
   * Merge overlapping chunks (utility function)
   */
  mergeChunks(chunks: ContentChunk[]): ContentChunk[] {
    if (chunks.length <= 1) return chunks;
    
    const merged: ContentChunk[] = [];
    let current = chunks[0];
    
    for (let i = 1; i < chunks.length; i++) {
      const next = chunks[i];
      
      // Check if chunks can be merged based on content similarity
      if (this.shouldMergeChunks(current, next)) {
        current = {
          ...current,
          content: current.content + '\n\n' + next.content,
          endOffset: next.endOffset,
          totalChunks: current.totalChunks,
          contentHash: this.generateContentHash(current.content + '\n\n' + next.content),
        };
      } else {
        merged.push(current);
        current = next;
      }
    }
    
    merged.push(current);
    
    // Update chunk indices and total counts
    return merged.map((chunk, index) => ({
      ...chunk,
      chunkIndex: index,
      totalChunks: merged.length,
    }));
  }

  /**
   * Determine if two chunks should be merged
   */
  private shouldMergeChunks(chunk1: ContentChunk, chunk2: ContentChunk): boolean {
    const combinedLength = chunk1.content.length + chunk2.content.length;
    
    // Don't merge if combined would be too large
    if (combinedLength > this.config.maxChunkSize) {
      return false;
    }
    
    // Check for content overlap at boundaries
    const chunk1End = chunk1.content.slice(-this.config.chunkOverlap);
    const chunk2Start = chunk2.content.slice(0, this.config.chunkOverlap);
    
    // Simple overlap detection
    const overlapRatio = this.calculateOverlapRatio(chunk1End, chunk2Start);
    
    return overlapRatio > 0.3; // 30% overlap suggests they should be merged
  }

  /**
   * Calculate overlap ratio between two text segments
   */
  private calculateOverlapRatio(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  /**
   * Create standardized error
   */
  private createError(code: string, message: string, originalError?: unknown): KnowledgebaseError {
    return {
      code,
      message,
      details: originalError && originalError instanceof Error ? { originalError: originalError.message } : undefined,
      timestamp: new Date().toISOString(),
      operation: 'Chunking',
    };
  }
}

export default ChunkingService; 
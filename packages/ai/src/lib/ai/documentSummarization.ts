import { AIService } from './aiService';
import { MODELS } from './models';
import { z } from 'zod';
import { classifyDocument, UnifiedClassificationResult } from './documentClassification';

// Constants
const DEFAULT_CHUNK_SIZE = 8000; // ~2000 tokens
const DEFAULT_CHUNK_OVERLAP = 200;
const HIGH_CONFIDENCE_THRESHOLD = 80;
const MINIMUM_CONFIDENCE_THRESHOLD = 60;

// Schemas
const chunkSummarySchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  mainTopics: z.array(z.string())
});

const completeSummarySchema = z.object({
  executiveSummary: z.string(),
  keyPoints: z.array(z.string()),
  mainTopics: z.array(z.string()),
  recommendations: z.array(z.string())
});

// Types
export interface ChunkSummary {
  summary: string;
  keyPoints: string[];
  mainTopics: string[];
}

export interface CompleteSummary {
  executiveSummary: string;
  keyPoints: string[];
  mainTopics: string[];
  recommendations: string[];
}

export interface ProgressiveSummaryResult {
  summary: CompleteSummary;
  classification: {
    documentType: 'rfp' | 'requirements' | 'proposal' | 'ideation' | 'reference' | 'transcript' | 'other';
    confidence: number;
    reasoning: string;
    suggestedSections: string[];
    priority: 'high' | 'medium' | 'low';
    keyTopics: string[];
    shouldUpdateSections: boolean;
  };
  processedChunks: number;
  totalChunks: number;
  stoppedEarly: boolean;
  finalConfidence: number;
}

export interface SummarizationOptions {
  mode: 'complete' | 'progressive';
  chunkSize?: number;
  chunkOverlap?: number;
  highConfidenceThreshold?: number;
  minimumConfidenceThreshold?: number;
  filename?: string;
  progressCallback?: (progress: {
    stage: string;
    current: number;
    total: number;
    message: string;
  }) => void;
}

/**
 * Document Summarization Service
 * Provides both complete document summarization and progressive chunk-based summarization
 * for faster classification of large documents
 */
class DocumentSummarizationService extends AIService {
  constructor() {
    super({
      maxRetries: 3,
      timeoutMs: 180000, // 3 minutes for complex summarization
      enableLogging: true,
      enableDebugLogging: true,
      logPrefix: 'DocumentSummarization',
    });
  }

  /**
   * Chunk content into manageable pieces for processing
   */
  private chunkContent(
    content: string, 
    chunkSize: number = DEFAULT_CHUNK_SIZE,
    chunkOverlap: number = DEFAULT_CHUNK_OVERLAP
  ): string[] {
    if (content.length <= chunkSize) {
      return [content];
    }

    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < content.length) {
      let endIndex = Math.min(startIndex + chunkSize, content.length);
      
      // Try to break at a sentence or paragraph boundary
      if (endIndex < content.length) {
        const lastPeriod = content.lastIndexOf('.', endIndex);
        const lastNewline = content.lastIndexOf('\n', endIndex);
        const breakPoint = Math.max(lastPeriod, lastNewline);
        
        if (breakPoint > startIndex + chunkSize * 0.5) {
          endIndex = breakPoint + 1;
        }
      }

      const chunk = content.slice(startIndex, endIndex).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      // Handle end-of-text
      if (endIndex >= content.length) {
        break;
      }

      // Calculate next start position with overlap
      const newStartIndex = endIndex - chunkOverlap;
      startIndex = newStartIndex <= startIndex ? endIndex : newStartIndex;
    }

    return chunks;
  }

  /**
   * Summarize a single chunk of content
   */
  private async summarizeChunk(
    chunk: string, 
    chunkIndex: number,
    totalChunks: number,
    filename?: string
  ): Promise<ChunkSummary> {
    this.log(`Summarizing chunk ${chunkIndex + 1}/${totalChunks}`);

    const systemPrompt = `You are an expert document summarizer. Provide concise summaries that preserve key information, requirements, and important details.

Focus on:
- Main topics and themes
- Key requirements or specifications
- Important dates, deadlines, or timelines
- Critical business information
- Action items or next steps

Keep summaries concise but comprehensive.`;

    const userPrompt = `Summarize this section of a document${filename ? ` (${filename})` : ''}:

**Section ${chunkIndex + 1} of ${totalChunks}:**
${chunk}

Provide a summary that captures the essential information while being concise enough for further processing.`;

    const result = await this.callAI(
      MODELS.fast,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      chunkSummarySchema,
      `summarizeChunk_${chunkIndex + 1}`,
      'chunk_summarization'
    );

    return result;
  }

  /**
   * Complete document summarization mode
   * Processes all chunks and creates a comprehensive summary
   */
  async summarizeComplete(
    content: string,
    options: SummarizationOptions = { mode: 'complete' }
  ): Promise<CompleteSummary> {
    this.log(`Starting complete summarization of ${content.length} character document`);

    const {
      chunkSize = DEFAULT_CHUNK_SIZE,
      chunkOverlap = DEFAULT_CHUNK_OVERLAP,
      filename,
      progressCallback
    } = options;

    // Report initial progress
    progressCallback?.({
      stage: 'chunking',
      current: 0,
      total: 100,
      message: 'Breaking document into chunks...'
    });

    // Create chunks
    const chunks = this.chunkContent(content, chunkSize, chunkOverlap);
    this.log(`Document split into ${chunks.length} chunks`);

    // If single chunk, summarize directly
    if (chunks.length === 1) {
      progressCallback?.({
        stage: 'summarizing',
        current: 50,
        total: 100,
        message: 'Summarizing document...'
      });

      const systemPrompt = `You are an expert document analyst. Create a comprehensive summary that captures all key information, requirements, and important details.`;

      const userPrompt = `Create a comprehensive summary of this document${filename ? ` (${filename})` : ''}:

${content}

Provide an executive summary, key points, main topics, and any recommendations.`;

      const result = await this.callAI(
        MODELS.default,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        completeSummarySchema,
        'summarizeComplete',
        'complete_summarization'
      );

      progressCallback?.({
        stage: 'complete',
        current: 100,
        total: 100,
        message: 'Summarization complete'
      });

      return result;
    }

    // Multi-chunk processing
    const chunkSummaries: ChunkSummary[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      progressCallback?.({
        stage: 'processing_chunks',
        current: Math.round((i / chunks.length) * 60) + 10, // 10-70%
        total: 100,
        message: `Processing chunk ${i + 1} of ${chunks.length}...`
      });

      try {
        const chunkSummary = await this.summarizeChunk(chunks[i], i, chunks.length, filename);
        chunkSummaries.push(chunkSummary);
      } catch (error) {
        this.log(`Failed to summarize chunk ${i + 1}: ${error}`, 'warn');
        // Create fallback summary
        chunkSummaries.push({
          summary: `Section ${i + 1}: ${chunks[i].substring(0, 500)}...`,
          keyPoints: [],
          mainTopics: []
        });
      }
    }

    // Combine summaries into final document summary
    progressCallback?.({
      stage: 'combining',
      current: 80,
      total: 100,
      message: 'Combining chunk summaries...'
    });

    const combinedText = chunkSummaries
      .map((summary, index) => `**Section ${index + 1}:**\n${summary.summary}`)
      .join('\n\n');

    const allKeyPoints = chunkSummaries.flatMap(s => s.keyPoints);
    const allTopics = chunkSummaries.flatMap(s => s.mainTopics);

    const systemPrompt = `You are an expert document analyst. Create a comprehensive final summary from these section summaries.

Consolidate information, remove redundancy, and create a cohesive executive summary that captures the full document's content.`;

    const userPrompt = `Create a final comprehensive summary from these section summaries${filename ? ` for ${filename}` : ''}:

${combinedText}

**All Key Points:**
${allKeyPoints.map(point => `- ${point}`).join('\n')}

**All Topics:**
${allTopics.join(', ')}

Provide a cohesive executive summary, consolidated key points, main topics, and recommendations.`;

    const finalSummary = await this.callAI(
      MODELS.default,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      completeSummarySchema,
      'summarizeComplete_final',
      'complete_summarization'
    );

    progressCallback?.({
      stage: 'complete',
      current: 100,
      total: 100,
      message: 'Complete summarization finished'
    });

    this.log(`Complete summarization finished for ${chunks.length} chunks`);
    return finalSummary;
  }

  /**
   * Progressive document summarization mode
   * Processes chunks incrementally until classification confidence is high
   */
  async summarizeProgressive(
    content: string,
    options: SummarizationOptions & { filename: string }
  ): Promise<ProgressiveSummaryResult> {
    this.log(`Starting progressive summarization of ${content.length} character document`);

    const {
      chunkSize = DEFAULT_CHUNK_SIZE,
      chunkOverlap = DEFAULT_CHUNK_OVERLAP,
      highConfidenceThreshold = HIGH_CONFIDENCE_THRESHOLD,
      minimumConfidenceThreshold = MINIMUM_CONFIDENCE_THRESHOLD,
      filename,
      progressCallback
    } = options;

    // Report initial progress
    progressCallback?.({
      stage: 'chunking',
      current: 0,
      total: 100,
      message: 'Breaking document into chunks for progressive analysis...'
    });

    // Create chunks
    const chunks = this.chunkContent(content, chunkSize, chunkOverlap);
    this.log(`Document split into ${chunks.length} chunks for progressive processing`);

    let processedChunks = 0;
    let combinedSummary = '';
    let finalClassification: UnifiedClassificationResult | null = null;
    let stoppedEarly = false;

    // Process chunks progressively
    for (let i = 0; i < chunks.length; i++) {
      processedChunks = i + 1;

      progressCallback?.({
        stage: 'progressive_processing',
        current: Math.round((processedChunks / chunks.length) * 70) + 10, // 10-80%
        total: 100,
        message: `Processing chunk ${processedChunks} of ${chunks.length}...`
      });

      // Summarize current chunk
      try {
        const chunkSummary = await this.summarizeChunk(chunks[i], i, chunks.length, filename);
        
        // Combine with previous summaries
        if (combinedSummary) {
          combinedSummary += `\n\n**Section ${i + 1}:**\n${chunkSummary.summary}`;
        } else {
          combinedSummary = `**Section 1:**\n${chunkSummary.summary}`;
        }

        this.log(`Processed chunk ${processedChunks}/${chunks.length}, combined summary length: ${combinedSummary.length}`);

      } catch (error) {
        this.log(`Failed to summarize chunk ${i + 1}: ${error}`, 'warn');
        // Add fallback content
        const fallbackSummary = `Section ${i + 1}: ${chunks[i].substring(0, 300)}...`;
        combinedSummary += combinedSummary ? `\n\n${fallbackSummary}` : fallbackSummary;
      }

      // Try classification with current combined summary
      progressCallback?.({
        stage: 'classifying',
        current: Math.round((processedChunks / chunks.length) * 70) + 15, // 15-85%
        total: 100,
        message: `Attempting classification with ${processedChunks} chunks...`
      });

      try {
        const classification = await classifyDocument(filename, combinedSummary, []);
        
        // Normalize confidence to percentage if it's a decimal
        const normalizedConfidence = classification.confidence <= 1 
          ? Math.round(classification.confidence * 100) 
          : classification.confidence;
        
        // Update classification with normalized confidence
        const normalizedClassification = {
          ...classification,
          confidence: normalizedConfidence
        };
        
        this.log(`Classification attempt ${processedChunks}: ${normalizedClassification.documentType} (confidence: ${normalizedConfidence}%)`);

        // Check if we have high confidence
        if (normalizedConfidence >= highConfidenceThreshold) {
          this.log(`High confidence achieved (${normalizedConfidence}%) after processing ${processedChunks}/${chunks.length} chunks`);
          finalClassification = normalizedClassification;
          stoppedEarly = processedChunks < chunks.length;
          break;
        }

        // Store classification for potential use
        finalClassification = normalizedClassification;

        // If we've processed all chunks or reached minimum confidence, stop
        if (processedChunks === chunks.length || normalizedConfidence >= minimumConfidenceThreshold) {
          break;
        }

      } catch (error) {
        this.log(`Classification failed for chunk ${processedChunks}: ${error}`, 'warn');
        // Continue to next chunk
      }
    }

    // Generate final summary from combined content
    progressCallback?.({
      stage: 'finalizing',
      current: 90,
      total: 100,
      message: 'Generating final summary...'
    });

    const systemPrompt = `You are an expert document analyst. Create a comprehensive summary from this content that was processed progressively.`;

    const userPrompt = `Create a final summary from this progressively processed content from ${filename}:

${combinedSummary}

Provide an executive summary, key points, main topics, and recommendations based on the content analyzed.`;

    let finalSummary: CompleteSummary;
    try {
      finalSummary = await this.callAI(
        MODELS.default,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        completeSummarySchema,
        'summarizeProgressive_final',
        'progressive_summarization'
      );
    } catch (error) {
      this.log(`Final summarization failed: ${error}`, 'warn');
      // Create fallback summary
      finalSummary = {
        executiveSummary: combinedSummary.substring(0, 1000) + '...',
        keyPoints: [],
        mainTopics: [],
        recommendations: []
      };
    }

    progressCallback?.({
      stage: 'complete',
      current: 100,
      total: 100,
      message: 'Progressive summarization complete'
    });

    const result: ProgressiveSummaryResult = {
      summary: finalSummary,
      classification: finalClassification || {
        documentType: 'other',
        confidence: 0,
        reasoning: 'Classification failed',
        suggestedSections: [],
        priority: 'low',
        keyTopics: [],
        shouldUpdateSections: false
      },
      processedChunks,
      totalChunks: chunks.length,
      stoppedEarly,
      finalConfidence: finalClassification?.confidence || 0
    };

    this.log(`Progressive summarization complete: processed ${processedChunks}/${chunks.length} chunks, confidence: ${result.finalConfidence}%`);
    return result;
  }

  /**
   * Main summarization method that chooses between complete and progressive modes
   */
  async summarizeDocument(
    content: string,
    options: SummarizationOptions
  ): Promise<CompleteSummary | ProgressiveSummaryResult> {
    if (options.mode === 'progressive') {
      if (!options.filename) {
        throw new Error('Filename is required for progressive summarization mode');
      }
      return this.summarizeProgressive(content, options as SummarizationOptions & { filename: string });
    } else {
      return this.summarizeComplete(content, options);
    }
  }
}

// Create singleton instance
const documentSummarizationService = new DocumentSummarizationService();

// Export main functions
export async function summarizeDocument(
  content: string,
  options: SummarizationOptions
): Promise<CompleteSummary | ProgressiveSummaryResult> {
  return documentSummarizationService.summarizeDocument(content, options);
}

export async function summarizeComplete(
  content: string,
  options: Omit<SummarizationOptions, 'mode'> = {}
): Promise<CompleteSummary> {
  return documentSummarizationService.summarizeComplete(content, { ...options, mode: 'complete' });
}

export async function summarizeProgressive(
  content: string,
  filename: string,
  options: Omit<SummarizationOptions, 'mode' | 'filename'> = {}
): Promise<ProgressiveSummaryResult> {
  return documentSummarizationService.summarizeProgressive(content, { 
    ...options, 
    mode: 'progressive', 
    filename 
  });
}

// Utility function to get basic chunk info without processing
export function getChunkInfo(
  content: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  chunkOverlap: number = DEFAULT_CHUNK_OVERLAP
): { totalChunks: number; estimatedProcessingTime: number } {
  const service = new DocumentSummarizationService();
  const chunks = service['chunkContent'](content, chunkSize, chunkOverlap);
  
  return {
    totalChunks: chunks.length,
    estimatedProcessingTime: chunks.length * 15 // ~15 seconds per chunk estimate
  };
} 
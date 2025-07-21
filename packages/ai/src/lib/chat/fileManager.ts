import crypto from 'crypto';
import { 
  storeFileChunks, 
  storeFileMetadata,
  getFileMetadata
} from '../database/prisma/fileData';
import { extractContentFromFile } from '../ai/contentExtraction';
import { classifyDocument } from '../ai/documentClassification';
import { summarizeComplete } from '../ai/documentSummarization';

export interface FileAnalysisResult {
  fileHash: string;
  fileId: string;
  extractedContent: {
    text: string;
    metadata: Record<string, unknown>;
  };
  classification: {
    documentType: string;
    confidence: number;
    reasoning: string;
    keyTopics: string[];
  };
  summary?: {
    executiveSummary: string;
    keyPoints: string[];
    mainTopics: string[];
  };
  chunks: Array<{
    content: string;
    metadata: Record<string, unknown>;
  }>;
  semanticSections?: Array<{
    title: string;
    content: string;
    keywords: string[];
  }>;
  wasFromCache: boolean;
  cacheTimestamp?: string;
}

export interface FileUploadOptions {
  entityType: 'opportunity' | 'proposal' | 'workspace' | 'knowledgebase';
  entityId: string;
  uploadedBy: string;
  organizationId: string;
  forceReprocess?: boolean;
  reprocessFeedback?: string;
  progressCallback?: (progress: {
    stage: string;
    current: number;
    total: number;
    message: string;
  }) => Promise<void>;
}

/**
 * Centralized File Manager for Chat Uploads
 * Handles file hashing, deduplication, analysis caching, and reprocessing
 */
export class ChatFileManager {
  
  /**
   * Generate content hash for file deduplication
   */
  private async generateFileHash(file: File): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer());
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Generate file ID from hash and filename
   */
  private generateFileId(hash: string, filename: string): string {
    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${hash.substring(0, 12)}_${sanitizedName}`;
  }

  /**
   * Check if file analysis exists in cache
   */
  private async getAnalysisFromCache(
    fileId: string,
    entityType: string,
    entityId: string
  ): Promise<FileAnalysisResult | null> {
    try {
      const metadata = await getFileMetadata(fileId, entityType as 'opportunity' | 'proposal' | 'knowledgebase' | 'workspace', entityId);
      
      if (!metadata || typeof metadata !== 'object') {
        return null;
      }

      const data = metadata as Record<string, unknown>;
      
      // Check if we have cached analysis - fix field name mismatch
      if (data.analysis && data.extractedContentText) {
        console.log(`📋 Found cached analysis for file ${fileId}`);
        
        return {
          fileHash: data.fileHash as string,
          fileId,
          extractedContent: { 
            text: data.extractedContentText as string, 
            metadata: {} 
          },
          classification: data.analysis as { documentType: string; confidence: number; reasoning: string; keyTopics: string[] },
          summary: data.summary as { executiveSummary: string; keyPoints: string[]; mainTopics: string[] } || undefined,
          chunks: data.chunks as Array<{ content: string; metadata: Record<string, unknown> }> || [],
          semanticSections: data.semanticSections as Array<{ title: string; content: string; keywords: string[] }> || undefined,
          wasFromCache: true,
          cacheTimestamp: data.analysisTimestamp as string
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking analysis cache:', error);
      return null;
    }
  }

  /**
   * Store analysis results in file metadata
   */
  private async storeAnalysisInMetadata(
    fileId: string,
    entityType: string,
    entityId: string,
    organizationId: string,
    result: Omit<FileAnalysisResult, 'wasFromCache' | 'cacheTimestamp'>
  ): Promise<void> {
    try {
      const metadata = {
        fileHash: result.fileHash,
        originalName: fileId.split('_').slice(1).join('_'),
        fileId,
        analysisTimestamp: new Date().toISOString(),
        entityType: entityType,
        entityId,
        organizationId,
        // Store analysis results as JSON-compatible data
        analysis: JSON.parse(JSON.stringify(result.classification)),
        summary: result.summary ? JSON.parse(JSON.stringify(result.summary)) : null,
        extractedContentText: result.extractedContent.text,
        chunkCount: result.chunks.length
      };

      await storeFileMetadata(
        fileId,
        entityType as 'opportunity' | 'proposal' | 'knowledgebase' | 'workspace',
        entityId,
        organizationId,
        metadata
      );

      console.log(`💾 Stored analysis cache for file ${fileId}`);
    } catch (error) {
      console.error('Error storing analysis cache:', error);
    }
  }

  /**
   * Process file content and create chunks
   */
  private async processFileContent(
    file: File,
    fileHash: string,
    options: FileUploadOptions
  ): Promise<{
    extractedContent: { text: string; metadata: Record<string, unknown> };
    chunks: Array<{ content: string; metadata: Record<string, unknown> }>;
  }> {
    const { progressCallback } = options;

    await progressCallback?.({
      stage: 'extraction',
      current: 20,
      total: 100,
      message: 'Extracting content from file...'
    });

    // Extract content from file
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileType = this.determineFileType(file.type, file.name);
    const rawContent = await extractContentFromFile(fileBuffer, fileType);
    const extractedContent = {
      text: rawContent.text,
      metadata: rawContent.metadata || {}
    };

    await progressCallback?.({
      stage: 'chunking',
      current: 40,
      total: 100,
      message: 'Creating content chunks...'
    });

    // Create chunks for embedding (8000 character chunks with 200 char overlap)
    const chunks = this.createChunks(extractedContent.text, 8000, 200);
    const chunkData = chunks.map((content, index) => ({
      content,
      metadata: {
        chunkIndex: index,
        totalChunks: chunks.length,
        fileHash,
        originalName: file.name,
        title: `Chunk ${index + 1}`
      }
    }));

    return { extractedContent, chunks: chunkData };
  }

  /**
   * Perform document analysis (classification, summarization)
   */
  private async analyzeDocument(
    file: File,
    extractedContent: { text: string; metadata: Record<string, unknown> },
    options: FileUploadOptions
  ): Promise<{
    classification: { documentType: string; confidence: number; reasoning: string; keyTopics: string[] };
    summary?: { executiveSummary: string; keyPoints: string[]; mainTopics: string[] };
  }> {
    const { progressCallback, reprocessFeedback } = options;

    await progressCallback?.({
      stage: 'analysis',
      current: 60,
      total: 100,
      message: 'Analyzing document type and content...'
    });

    // Enhance classification prompt with reprocessing feedback if provided
    let classificationResult;
    if (reprocessFeedback) {
      console.log(`🔄 Reprocessing with feedback: ${reprocessFeedback}`);
      // TODO: Enhance classifyDocument to accept feedback parameter
      classificationResult = await classifyDocument(file.name, extractedContent.text);
    } else {
      classificationResult = await classifyDocument(file.name, extractedContent.text);
    }

    await progressCallback?.({
      stage: 'summarization',
      current: 80,
      total: 100,
      message: 'Generating document summary...'
    });

    // Generate summary for important document types
    let summary;
    if (['rfp', 'proposal', 'requirements', 'ideation'].includes(classificationResult.documentType)) {
      try {
        summary = await summarizeComplete(extractedContent.text, {
          filename: file.name
        });
      } catch (error) {
        console.warn('Summary generation failed:', error);
      }
    }

    return {
      classification: classificationResult,
      summary
    };
  }

  /**
   * Main method to process and store uploaded file
   */
  async processUploadedFile(
    file: File,
    options: FileUploadOptions
  ): Promise<FileAnalysisResult> {
    const { entityType, entityId, organizationId, forceReprocess = false, progressCallback } = options;

    await progressCallback?.({
      stage: 'hashing',
      current: 0,
      total: 100,
      message: 'Processing file...'
    });

    // Generate file hash and ID
    const fileHash = await this.generateFileHash(file);
    const fileId = this.generateFileId(fileHash, file.name);

    console.log(`📁 Processing file: ${file.name} (${fileId})`);

    // Check for cached analysis (unless forced reprocessing)
    if (!forceReprocess) {
      const cachedResult = await this.getAnalysisFromCache(fileId, entityType, entityId);
      if (cachedResult) {
        await progressCallback?.({
          stage: 'cached',
          current: 100,
          total: 100,
          message: 'Using cached analysis'
        });
        return cachedResult;
      }
    }

    await progressCallback?.({
      stage: 'processing',
      current: 10,
      total: 100,
      message: 'Processing new file...'
    });

    // Process file content and create chunks
    const { extractedContent, chunks } = await this.processFileContent(file, fileHash, options);

    // Perform document analysis
    const { classification, summary } = await this.analyzeDocument(file, extractedContent, options);

    await progressCallback?.({
      stage: 'storing',
      current: 90,
      total: 100,
      message: 'Storing file data and creating embeddings...'
    });

    // Store file chunks and create embeddings
    await storeFileChunks(
      fileId,
      entityType as 'opportunity' | 'proposal' | 'knowledgebase' | 'workspace',
      entityId,
      organizationId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chunks as any // Type assertion to resolve interface mismatch
    );

    // Create analysis result
    const result: FileAnalysisResult = {
      fileHash,
      fileId,
      extractedContent,
      classification,
      summary,
      chunks,
      wasFromCache: false
    };

    // Store analysis in cache for future use
    await this.storeAnalysisInMetadata(fileId, entityType, entityId, organizationId, result);

    await progressCallback?.({
      stage: 'complete',
      current: 100,
      total: 100,
      message: 'File processing complete'
    });

    console.log(`✅ File processing complete: ${fileId}`);
    return result;
  }

  /**
   * Generate reprocessing actions for incorrect analysis
   */
  generateReprocessingActions(result: FileAnalysisResult): Array<{
    label: string;
    action: string;
    description: string;
  }> {
    const actions = [];

    if (result.wasFromCache) {
      actions.push({
        label: 'Reprocess Document',
        action: 'reprocess_document',
        description: `Re-analyze ${result.fileId.split('_').slice(1).join('_')} with updated AI models`
      });
    }

    // Document type specific reprocessing options
    actions.push({
      label: 'Wrong Document Type',
      action: 'reprocess_document_type',
      description: `Current: ${result.classification.documentType} - Click if this is incorrect`
    });

    if (result.classification.confidence < 80) {
      actions.push({
        label: 'Low Confidence Analysis',
        action: 'reprocess_low_confidence',
        description: `Confidence: ${result.classification.confidence}% - Reprocess for better accuracy`
      });
    }

    return actions;
  }

  /**
   * Utility methods
   */
  private determineFileType(mimeType: string, filename: string): 'pdf' | 'text' | 'image' | 'audio' | 'video' {
    if (mimeType.startsWith('application/pdf')) return 'pdf';
    if (mimeType.startsWith('text/') || filename.endsWith('.txt') || filename.endsWith('.csv') || filename.endsWith('.md')) return 'text';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    return 'text'; // Default fallback
  }

  private createChunks(content: string, chunkSize: number = 8000, overlap: number = 200): string[] {
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
      const newStartIndex = endIndex - overlap;
      startIndex = newStartIndex <= startIndex ? endIndex : newStartIndex;
    }

    return chunks;
  }
}

// Export singleton instance
export const chatFileManager = new ChatFileManager(); 
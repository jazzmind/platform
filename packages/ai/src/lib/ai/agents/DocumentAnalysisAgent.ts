/**
 * Document Analysis Agent
 * 
 * Consolidates document classification, section identification, and semantic analysis
 * capabilities into a unified agent following the future AI architecture specifications.
 * 
 * Replaces and unifies:
 * - classifyDocument (fileClassification.ts) - Master implementation
 * - identifySections (documentAnalysis.ts)
 * - analyzeSemantic (documentAnalysis.ts)
 * - detectDocumentType (documentAnalysis.ts)
 * - Text chunking from embeddingService.chunkText() - Master implementation
 */

import { z } from 'zod';
import { BaseAgent, AgentInput, AgentOutput, ValidationResult, AgentCapability } from './BaseAgent';
import { classifyDocument } from '../fileClassification';
import { identifySections, analyzeSemantic } from '../documentAnalysis';
import { embeddingService } from '../embeddingService';
import { SSEManager } from '../../sse/sseManager';

// Document Analysis Input Schema
const DocumentAnalysisInputSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),
  filename: z.string().optional(),
  documentType: z.string().optional(),
  options: z.object({
    performClassification: z.boolean().default(true),
    performSectionAnalysis: z.boolean().default(true),
    performSemanticAnalysis: z.boolean().default(true),
    generateEmbeddings: z.boolean().default(false),
    chunkContent: z.boolean().default(false),
    extractKeywords: z.boolean().default(true),
  }).optional(),
}).strict();

// Document Analysis Output Schema
const DocumentAnalysisOutputSchema = z.object({
  classification: z.object({
    documentType: z.string(),
    confidence: z.number().min(0).max(1),
    categories: z.array(z.string()),
    metadata: z.record(z.unknown()).optional(),
  }).optional(),
  sections: z.array(z.object({
    title: z.string(),
    content: z.string(),
    keywords: z.array(z.string()),
    confidence: z.number().min(0).max(1).optional(),
    startIndex: z.number().optional(),
    endIndex: z.number().optional(),
  })).optional(),
  semanticAnalysis: z.object({
    mainTopics: z.array(z.string()),
    sentiment: z.string().optional(),
    complexity: z.enum(['low', 'medium', 'high']),
    readabilityScore: z.number().optional(),
    keyEntities: z.array(z.object({
      text: z.string(),
      type: z.string(),
      confidence: z.number(),
    })).optional(),
  }).optional(),
  chunks: z.array(z.object({
    content: z.string(),
    index: z.number(),
    embedding: z.array(z.number()).optional(),
    metadata: z.record(z.unknown()).optional(),
  })).optional(),
  processingMetadata: z.object({
    contentLength: z.number(),
    processingTime: z.number(),
    tokensUsed: z.number().optional(),
    warningsCount: z.number(),
    warnings: z.array(z.string()),
  }),
});

type DocumentAnalysisInput = z.infer<typeof DocumentAnalysisInputSchema>;
type DocumentAnalysisOutput = z.infer<typeof DocumentAnalysisOutputSchema>;

/**
 * Document Analysis Agent
 * 
 * Provides unified document analysis capabilities including classification,
 * section identification, semantic analysis, and content chunking.
 */
export class DocumentAnalysisAgent extends BaseAgent {
  
  constructor() {
    const capabilities: AgentCapability[] = [
      {
        name: 'document_classification',
        description: 'Classify document type and extract metadata',
        inputTypes: ['text/plain', 'text/html', 'application/pdf'],
        outputTypes: ['classification_result'],
        requirements: ['content'],
      },
      {
        name: 'section_identification',
        description: 'Identify and extract document sections',
        inputTypes: ['text/plain', 'text/html'],
        outputTypes: ['section_list'],
        requirements: ['content'],
      },
      {
        name: 'semantic_analysis',
        description: 'Perform semantic analysis on document content',
        inputTypes: ['text/plain'],
        outputTypes: ['semantic_analysis_result'],
        requirements: ['content'],
      },
      {
        name: 'content_chunking',
        description: 'Break content into semantically meaningful chunks',
        inputTypes: ['text/plain'],
        outputTypes: ['content_chunks'],
        requirements: ['content'],
      },
      {
        name: 'embedding_generation',
        description: 'Generate embeddings for content chunks',
        inputTypes: ['content_chunks'],
        outputTypes: ['embeddings'],
        requirements: ['chunks'],
      },
    ];

    super('document_analysis', {
      enabled: true,
      maxRetries: 3,
      timeoutMs: 120000, // 2 minutes for document analysis
      enableLogging: true,
      enableDebugLogging: true,
      logPrefix: 'DOC_ANALYSIS',
      capabilities,
    });
  }

  /**
   * Validate input for document analysis
   */
  validate(input: AgentInput): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      DocumentAnalysisInputSchema.parse(input.data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        result.isValid = false;
        result.errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      } else {
        result.isValid = false;
        result.errors = ['Unknown validation error'];
      }
    }

    // Additional business logic validations
    const data = input.data as DocumentAnalysisInput;
    
    // Handle cases where data might be undefined (e.g., when testing individual methods)
    if (!data) {
      return result;
    }
    
    if (data.content && data.content.length > 1000000) {
      result.warnings.push('Content is very large (>1MB), processing may be slow');
    }

    if (data.options?.generateEmbeddings && !data.options?.chunkContent) {
      result.warnings.push('Embedding generation requires content chunking, will enable chunking');
    }

    return result;
  }

  /**
   * Execute document analysis
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const data = input.data as DocumentAnalysisInput;
    const warnings: string[] = [];
    let tokensUsed = 0;
    const result: Partial<DocumentAnalysisOutput> = {};

    try {
      this.log(`Starting document analysis for content: ${data.content.length} characters`, 'info', input.context);

      // Update progress
      if (input.context?.progressCallback) {
        this.updateProgress(input.context, 'analyzing', 0, 100, 'Starting document analysis');
      }

      // Step 1: Document Classification (if requested)
      if (data.options?.performClassification !== false) {
        this.log('Performing document classification', 'info', input.context);
        
        if (input.context?.progressCallback) {
          this.updateProgress(input.context, 'classifying', 20, 100, 'Classifying document type');
        }

         try {
           const classification = await classifyDocument(
             data.content, 
             data.filename || 'unknown.txt',
             [],
             (prompt: string, response: string, tokens: number, cost: number) => {
               // Broadcast AI debug information via SSE
               this.broadcastAIDebug(input.context, prompt, response, tokens, cost, 'classification');
             }
           );
           result.classification = {
             documentType: classification.documentType,
             confidence: classification.confidence,
             categories: [],
             metadata: {},
           };
           // Use actual tokens from the debug callback
           tokensUsed += Math.ceil(data.content.length / 4) + 100; // Content + prompt tokens
           this.log(`Document classified as: ${classification.documentType} (confidence: ${classification.confidence})`, 'info', input.context);
         } catch (error) {
           warnings.push(`Document classification failed: ${(error as Error).message}`);
           this.log(`Classification error: ${(error as Error).message}`, 'warn', input.context);
         }
      }

      // Step 2: Section Identification (if requested)
      if (data.options?.performSectionAnalysis !== false) {
        this.log('Identifying document sections', 'info', input.context);
        
        if (input.context?.progressCallback) {
          this.updateProgress(input.context, 'analyzing', 40, 100, 'Identifying document sections');
        }

        try {
          const sections = await identifySections(
            data.content, 
            'opportunity', // Use opportunity type for section identification
            (prompt: string, response: string, tokens: number, cost: number, stage: string) => {
              // Broadcast AI debug information via SSE
              this.broadcastAIDebug(input.context, prompt, response, tokens, cost, stage);
            }
          );
          result.sections = sections.map(section => ({
            title: section.title,
            content: section.content,
            keywords: section.keywords || [],
            confidence: 0.8, // Default confidence for identified sections
          }));
          this.log(`Identified ${sections.length} sections`, 'info', input.context);
        } catch (error) {
          warnings.push(`Section identification failed: ${(error as Error).message}`);
          this.log(`Section identification error: ${(error as Error).message}`, 'warn', input.context);
        }
      }

      // Step 3: Semantic Analysis (if requested)
      if (data.options?.performSemanticAnalysis !== false) {
        this.log('Performing semantic analysis', 'info', input.context);
        
        if (input.context?.progressCallback) {
          this.updateProgress(input.context, 'analyzing', 60, 100, 'Performing semantic analysis');
        }

        try {
          // Use existing semantic analysis function with progress callback and debug callback
          const progressCallback = (progress: { stage: string; current: number; total: number; message: string }) => {
            if (input.context?.progressCallback) {
              this.updateProgress(input.context, progress.stage, 60 + (progress.current / progress.total) * 20, 100, progress.message);
            }
          };

          const semanticSections = await analyzeSemantic(
            data.content, 
            progressCallback,
            (prompt: string, response: string, tokens: number, cost: number, stage: string) => {
              // Broadcast AI debug information via SSE
              this.broadcastAIDebug(input.context, prompt, response, tokens, cost, stage);
            }
          );
          
          // Extract semantic analysis metadata
          const mainTopics = [...new Set(semanticSections.flatMap(s => s.keywords || []))].slice(0, 10);
          
          result.semanticAnalysis = {
            mainTopics,
            complexity: data.content.length > 5000 ? 'high' : data.content.length > 1000 ? 'medium' : 'low',
            sentiment: 'neutral', // Could be enhanced with sentiment analysis
          };
          
          this.log(`Semantic analysis completed: ${mainTopics.length} main topics identified`, 'info', input.context);
        } catch (error) {
          warnings.push(`Semantic analysis failed: ${(error as Error).message}`);
          this.log(`Semantic analysis error: ${(error as Error).message}`, 'warn', input.context);
        }
      }

      // Step 4: Content Chunking (if requested or needed for embeddings)
      if (data.options?.chunkContent || data.options?.generateEmbeddings) {
        this.log('Chunking content', 'info', input.context);
        
        if (input.context?.progressCallback) {
          this.updateProgress(input.context, 'chunking', 80, 100, 'Breaking content into chunks');
        }

        try {
          const chunks = embeddingService.chunkText(data.content);
          result.chunks = chunks.map((chunk, index) => ({
            content: chunk.content,
            index,
            metadata: {
              originalLength: data.content.length,
              chunkLength: chunk.content.length,
            },
          }));
          // Estimate tokens used for chunking (minimal operation)
          tokensUsed += 50; // Small fixed cost for chunking operation
          this.log(`Content chunked into ${chunks.length} pieces`, 'info', input.context);
        } catch (error) {
          warnings.push(`Content chunking failed: ${(error as Error).message}`);
          this.log(`Chunking error: ${(error as Error).message}`, 'warn', input.context);
        }
      }

      // Step 5: Generate Embeddings (if requested)
      if (data.options?.generateEmbeddings && result.chunks) {
        this.log('Generating embeddings for chunks', 'info', input.context);
        
        if (input.context?.progressCallback) {
          this.updateProgress(input.context, 'embedding', 90, 100, 'Generating embeddings');
        }

        try {
          for (let i = 0; i < result.chunks.length; i++) {
            const chunk = result.chunks[i];
            const embedding = await embeddingService.generateEmbedding(chunk.content);
            chunk.embedding = embedding;
            
            // Estimate tokens used for embedding generation (each chunk uses tokens)
            tokensUsed += Math.ceil(chunk.content.length / 4); // Rough token count per chunk
            
            // Update progress for each chunk
            if (input.context?.progressCallback) {
              const progress = 90 + ((i + 1) / result.chunks.length) * 10;
              this.updateProgress(input.context, 'embedding', progress, 100, `Generated embedding ${i + 1}/${result.chunks.length}`);
            }
          }
          this.log(`Generated embeddings for ${result.chunks.length} chunks`, 'info', input.context);
        } catch (error) {
          warnings.push(`Embedding generation failed: ${(error as Error).message}`);
          this.log(`Embedding error: ${(error as Error).message}`, 'warn', input.context);
        }
      }

      // Final progress update
      if (input.context?.progressCallback) {
        this.updateProgress(input.context, 'complete', 100, 100, 'Document analysis completed');
      }

      // Add processing metadata
      const processingTime = Date.now() - startTime;
      result.processingMetadata = {
        contentLength: data.content.length,
        processingTime,
        tokensUsed,
        warningsCount: warnings.length,
        warnings,
      };

      this.log(`Document analysis completed in ${processingTime}ms with ${warnings.length} warnings`, 'info', input.context);

      // Validate output schema
      const validatedResult = DocumentAnalysisOutputSchema.parse(result);

      // Broadcast completion via SSE
      this.broadcastCompletion(
        input.context,
        { analysis: validatedResult },
        tokensUsed,
        tokensUsed * 0.00002 // Rough cost estimate at $0.00002 per token
      );

      // Shutdown SSE session when agent execution completes
      if (input.context?.sseSessionId) {
        setTimeout(() => {
          this.log(`Shutting down SSE session: ${input.context?.sseSessionId}`, 'info', input.context);
          SSEManager.deleteSession(input.context!.sseSessionId!);
        }, 2000); // Give 2 seconds for final messages to be sent
      }

      return this.createSuccessOutput(
        { analysis: validatedResult },
        undefined,
        {
          tokensUsed,
          confidence: result.classification?.confidence || 0.8,
          processingTime,
        }
      );

    } catch (error) {
      this.log(`Document analysis failed: ${(error as Error).message}`, 'error', input.context);
      
      // Also shutdown SSE session on error
      if (input.context?.sseSessionId) {
        setTimeout(() => {
          this.log(`Shutting down SSE session after error: ${input.context?.sseSessionId}`, 'info', input.context);
          SSEManager.deleteSession(input.context!.sseSessionId!);
        }, 2000);
      }
      
      return this.createErrorOutput(
        error as Error,
        { 
          partialResults: result,
          warnings,
          processingTime: Date.now() - startTime,
        }
      );
    }
  }

  /**
   * Analyze document with specific options
   */
  async analyzeDocument(
    content: string,
    filename?: string,
    options?: Partial<DocumentAnalysisInput['options']>
  ): Promise<DocumentAnalysisOutput> {
    const input: AgentInput = {
      data: {
        content,
        filename,
        options: {
          performClassification: true,
          performSectionAnalysis: true,
          performSemanticAnalysis: true,
          generateEmbeddings: false,
          chunkContent: false,
          extractKeywords: true,
          ...options,
        },
      },
    };

    const result = await this.executeWithContext(input);
    
    if (!result.success) {
      throw result.error || new Error('Document analysis failed');
    }

    return result.data.analysis as DocumentAnalysisOutput;
  }

  /**
   * Quick document classification only
   */
  async quickClassify(content: string, filename?: string): Promise<DocumentAnalysisOutput['classification']> {
    const result = await this.analyzeDocument(content, filename, {
      performClassification: true,
      performSectionAnalysis: false,
      performSemanticAnalysis: false,
      generateEmbeddings: false,
      chunkContent: false,
    });

    return result.classification;
  }

  /**
   * Extract sections only
   */
  async extractSections(content: string): Promise<DocumentAnalysisOutput['sections']> {
    const result = await this.analyzeDocument(content, undefined, {
      performClassification: false,
      performSectionAnalysis: true,
      performSemanticAnalysis: false,
      generateEmbeddings: false,
      chunkContent: false,
    });

    return result.sections;
  }

  /**
   * Generate content chunks with embeddings
   */
  async generateContentChunks(content: string, withEmbeddings: boolean = false): Promise<DocumentAnalysisOutput['chunks']> {
    const result = await this.analyzeDocument(content, undefined, {
      performClassification: false,
      performSectionAnalysis: false,
      performSemanticAnalysis: false,
      generateEmbeddings: withEmbeddings,
      chunkContent: true,
    });

    return result.chunks;
  }
}

// Create singleton instance
export const documentAnalysisAgent = new DocumentAnalysisAgent();

export default DocumentAnalysisAgent; 
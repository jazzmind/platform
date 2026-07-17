import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { embeddingService } from '@/src/lib/ai/embeddingService';
import { getCurrentUtcIsoString } from '@/src/lib/utils/date';

export interface ExtractedContent {
  text: string;
  metadata?: {
    title?: string;
    description?: string;
    author?: string;
    pages?: number;
    duration?: number;
    url?: string;
    wasChunked?: boolean;
    originalTokenCount?: number;
    chunkCount?: number;
  };
}

export interface ExtractedContact {
  name?: string;
  email?: string;
  title?: string;
  phone?: string;
  linkedIn?: string;
}

export interface ExtractedService {
  name: string;
  description?: string;
  category?: string;
  technologies?: string[];
}

// Processing status tracking for real-time updates
interface ProcessingStatus {
  totalPages: number;
  processedPages: number;
  status: 'processing' | 'completed' | 'failed' | 'stopped';
  extractedText: string;
  startTime: number;
  stopRequested?: boolean;
  currentPhase?: 'extracting' | 'embedding' | 'analyzing' | 'completing';
  phaseProgress?: number; // 0-100 for current phase
}

// Progress tracking for PDF processing - make it persistent across server restarts
const processingStatus = new Map<string, ProcessingStatus>();

// Token estimation and chunking constants
const TOKEN_ESTIMATION_RATIO = 4; // ~4 characters per token
const DEFAULT_MAX_TOKENS = 100000; // ~25,000 words
const CHUNK_SIZE = 8000; // Characters per chunk (~2000 tokens)

export function getProcessingStatus(fileId: string) {
  return processingStatus.get(fileId);
}

export function stopProcessing(fileId: string) {
  const status = processingStatus.get(fileId);
  if (status && status.status === 'processing') {
    status.stopRequested = true;
    status.status = 'stopped';
  }
}

export function clearProcessingStatus(fileId: string) {
  processingStatus.delete(fileId);
}

/**
 * Check if content exceeds token limits
 */
export function checkTokenLimits(content: string, maxTokens: number = DEFAULT_MAX_TOKENS): {
  canProcess: boolean;
  requiresChunking: boolean;
  estimatedTokens: number;
  reason?: string;
} {
  const estimatedTokens = Math.ceil(content.length / TOKEN_ESTIMATION_RATIO);
  
  return {
    canProcess: estimatedTokens <= maxTokens * 2, // Allow processing up to 2x limit with chunking
    requiresChunking: estimatedTokens > maxTokens,
    estimatedTokens,
    reason: estimatedTokens > maxTokens * 2 
      ? `Content too large: ~${estimatedTokens.toLocaleString()} tokens (max processable: ${(maxTokens * 2).toLocaleString()})`
      : undefined
  };
}

/**
 * Chunk content into manageable pieces for processing
 */
export function chunkContent(content: string, chunkSize: number = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  let currentPos = 0;
  
  while (currentPos < content.length) {
    const chunk = content.slice(currentPos, currentPos + chunkSize);
    chunks.push(chunk);
    currentPos += chunkSize;
  }
  
  return chunks;
}

/**
 * Enhanced content extraction with automatic chunking and token management
 */
export async function extractContentWithTokenManagement(
  file: File | Buffer, 
  fileType: string,
  options: {
    maxTokens?: number;
    enableChunking?: boolean;
    fileId?: string;
  } = {}
): Promise<ExtractedContent> {
  const { maxTokens = DEFAULT_MAX_TOKENS, enableChunking = true, fileId } = options;
  
  // First extract the raw content
  const rawContent = await extractContentFromFile(file, fileType, fileId);
  
  // Check token limits
  const tokenCheck = checkTokenLimits(rawContent.text, maxTokens);
  
  if (!tokenCheck.canProcess) {
    throw new Error(`Content too large: ${tokenCheck.reason}`);
  }
  
  if (!tokenCheck.requiresChunking || !enableChunking) {
    return rawContent;
  }
  
  // For large content, we don't automatically summarize here since that requires AI
  // Instead, we return the content with chunking metadata and let the consumer decide
  return {
    ...rawContent,
    metadata: {
      ...rawContent.metadata,
      wasChunked: false, // We didn't actually chunk/summarize, just detected the need
      originalTokenCount: tokenCheck.estimatedTokens,
      chunkCount: Math.ceil(rawContent.text.length / CHUNK_SIZE)
    }
  };
}

export async function extractContentFromFile(
  file: File | Buffer, 
  fileType: string,
  fileId?: string
): Promise<ExtractedContent> {
  // Initialize processing status for all file types
  if (fileId) {
    processingStatus.set(fileId, {
      totalPages: 1,
      processedPages: 0,
      status: 'processing',
      extractedText: '',
      startTime: Date.now()
    });
  }

  try {
    let result: ExtractedContent;
    
  switch (fileType) {
    case 'pdf':
        result = await extractPdfContent(file as Buffer, fileId);
        break;
    case 'audio':
    case 'video':
        result = await extractMediaTranscript(file as File, fileType);
        break;
    case 'image':
        result = await extractImageText(file as File);
        break;
    case 'text':
        result = await extractTextContent(file as File);
        break;
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Update status to completed for non-PDF files
    if (fileId && fileType !== 'pdf') {
      const status = processingStatus.get(fileId);
      if (status) {
        status.status = 'completed';
        status.processedPages = 1;
        status.extractedText = result.text;
      }
    }

    return result;
  } catch (error) {
    // Update status to failed
    if (fileId) {
      const status = processingStatus.get(fileId);
      if (status) {
        status.status = 'failed';
      }
    }
    throw error;
  }
}

export async function extractContentFromUrl(url: string): Promise<ExtractedContent> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProposalHub Content Extractor)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      // Fallback to basic text extraction
      const textContent = dom.window.document.body?.textContent || '';
      const title = dom.window.document.title || url;
      
      return {
        text: textContent.trim(),
        metadata: {
          title,
          url,
        },
      };
    }

    return {
      text: article.textContent?.trim() || '',
      metadata: {
        title: article.title || undefined,
        description: article.excerpt || undefined,
        url,
      },
    };
  } catch (error) {
    console.error('Error extracting content from URL:', error);
    throw new Error(`Failed to extract content from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractPdfContent(buffer: Buffer, fileId?: string): Promise<ExtractedContent> {
  const fileSizeInMB = buffer.length / (1024 * 1024);
  console.log(`Processing PDF file: ${buffer.length} bytes (${fileSizeInMB.toFixed(2)} MB)`);
  
  // For very large files, skip processing
  if (fileSizeInMB > 50) {
    console.log('Large PDF detected, skipping extraction');
    if (fileId) {
      const status = processingStatus.get(fileId);
      if (status) {
        status.status = 'completed';
        status.extractedText = `[LARGE PDF UPLOADED - ${fileSizeInMB.toFixed(2)} MB]\n\nThis PDF file has been uploaded successfully.\n\nDue to file size, automatic text extraction is limited.\nThe file is available for download and manual review.`;
      }
    }
    return {
      text: `[LARGE PDF UPLOADED - ${fileSizeInMB.toFixed(2)} MB]\n\nThis PDF file has been uploaded successfully.\n\nDue to file size, automatic text extraction is limited.\nThe file is available for download and manual review.`,
      metadata: {
        title: 'Large PDF Document',
        pages: 1,
      },
    };
  }

  // Try page-by-page processing to avoid memory issues
  try {
    console.log('Starting page-by-page PDF processing');
    return await extractPdfPageByPage(buffer, fileId);
  } catch (error) {
    console.error('Page-by-page processing failed:', error);
    
    if (fileId) {
      const status = processingStatus.get(fileId);
      if (status) {
        status.status = 'failed';
      }
    }
    
    return {
      text: `[PDF PROCESSING FAILED]\n\nThis PDF file has been uploaded successfully but text extraction failed.\n\nFile size: ${buffer.length} bytes\n\nThe file is available for download and manual review.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: {
        title: 'PDF Document (extraction failed)',
        pages: 1,
      },
    };
  }
}

async function extractPdfPageByPage(buffer: Buffer, fileId?: string): Promise<ExtractedContent> {
  try {
    console.log(`Starting PDF page-by-page processing. Buffer size: ${buffer.length} bytes`);
    console.log(`Memory before PDF processing: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`);
    
    const { PdfReader } = await import('pdfreader');
    
    return new Promise<ExtractedContent>((resolve) => {
      const reader = new PdfReader();
      let extractedText = '';
      let currentPage = 0;
      let totalPages = 0;
      const pageTexts: { [page: number]: string } = {};
      let itemCount = 0;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reader.parseBuffer(buffer, (err: any, item: any) => {
        itemCount++;
        
        // Log memory usage every 1000 items to detect leaks
        if (itemCount % 1000 === 0) {
          console.log(`PDF parsing progress: ${itemCount} items processed, memory: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`);
        }
        
        if (err) {
          console.error('pdfreader error:', err);
          console.log(`Memory at PDF error: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`);
          if (fileId) {
            const status = processingStatus.get(fileId);
            if (status) {
              status.status = 'failed';
            }
          }
          resolve({
            text: `[PDF PROCESSING FAILED]\n\nError: ${err.message || 'Unknown error'}\n\nFile size: ${buffer.length} bytes\n\nThe file is available for download and manual review.`,
            metadata: {
              title: 'PDF Document (extraction failed)',
              pages: Math.max(totalPages, 1),
            },
          });
          return;
        }
        
        // Check if processing was stopped
        if (fileId) {
          const status = processingStatus.get(fileId);
          if (status?.stopRequested) {
            console.log(`Processing stopped for file ${fileId}`);
            resolve({
              text: `[PDF PROCESSING STOPPED]\n\nProcessing was stopped by user.\n\nFile size: ${buffer.length} bytes\nPages processed: ${status.processedPages}/${status.totalPages}\n\nThe file is available for download and manual review.`,
              metadata: {
                title: 'PDF Document (processing stopped)',
                pages: Math.max(totalPages, 1),
              },
            });
            return;
          }
        }
        
        if (!item) {
          // End of file - combine all page texts
          console.log(`PDF processing complete. Total pages: ${totalPages}, total items: ${itemCount}`);
          console.log(`Memory before text combination: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`);
          
          // Combine text from all pages in order
          for (let i = 1; i <= totalPages; i++) {
            if (pageTexts[i]) {
              extractedText += `\n=== PAGE ${i} ===\n${pageTexts[i]}\n`;
            }
          }
          
          extractedText = extractedText.trim();
          
          console.log(`Text combination complete. Total length: ${extractedText.length}`);
          console.log(`Memory after text combination: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`);
          
          if (fileId) {
            const status = processingStatus.get(fileId);
            if (status) {
              status.status = 'completed';
              status.extractedText = extractedText;
              status.processedPages = totalPages;
            }
          }
          
          resolve({
            text: extractedText.length > 0 ? extractedText : `[PDF UPLOADED - NO TEXT FOUND]\n\nThis PDF file contains no extractable text.\n\nFile size: ${buffer.length} bytes\nPages: ${totalPages}`,
            metadata: {
              title: 'PDF Document',
              pages: Math.max(totalPages, 1),
            },
          });
          return;
        }
        
        if (item.page) {
          // New page detected
          if (item.page > currentPage) {
            currentPage = item.page;
            totalPages = Math.max(totalPages, currentPage);
            
            if (!pageTexts[currentPage]) {
              pageTexts[currentPage] = '';
            }
            
            console.log(`Processing page ${currentPage}, memory: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`);
            
            // Update progress
            if (fileId) {
              const status = processingStatus.get(fileId);
              if (status) {
                status.totalPages = totalPages;
                status.processedPages = currentPage - 1; // Previous pages are complete
              }
            }
          }
        }
        
        if (item.text && currentPage > 0) {
          // Add text to current page
          pageTexts[currentPage] += item.text + ' ';
          
          // Prevent memory buildup - limit text per page
          if (pageTexts[currentPage].length > 10000) {
            console.log(`Page ${currentPage} text truncated at ${pageTexts[currentPage].length} characters`);
            pageTexts[currentPage] = pageTexts[currentPage].substring(0, 10000) + '...[TRUNCATED]';
          }
        }
      });
    });
  } catch (error) {
    console.error('Error with page-by-page processing:', error);
    console.log(`Memory at PDF processing error: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`);
    throw error;
  }
}

async function extractMediaTranscript(file: File, fileType: string): Promise<ExtractedContent> {
  // TODO: Implement audio/video transcription using OpenAI Whisper, AssemblyAI, or similar
  // For now, return placeholder
  console.log(`Transcription needed for ${fileType} file:`, file.name);
  
  return {
    text: `[${fileType.toUpperCase()} TRANSCRIPTION PENDING]\n\nFile: ${file.name}\nSize: ${file.size} bytes\n\nTranscription will be processed and available shortly.`,
    metadata: {
      title: file.name,
      // duration would be extracted from media metadata
    },
  };
}

async function extractImageText(file: File): Promise<ExtractedContent> {
  // TODO: Implement OCR using Tesseract.js, Google Vision API, or similar
  // For now, return placeholder
  console.log('OCR needed for image file:', file.name);
  
  return {
    text: `[IMAGE TEXT EXTRACTION PENDING]\n\nFile: ${file.name}\nSize: ${file.size} bytes\n\nText extraction from image will be processed and available shortly.`,
    metadata: {
      title: file.name,
    },
  };
}

async function extractTextContent(file: File | Buffer): Promise<ExtractedContent> {
  try {
    let text: string;
    let title: string;
    
    if (file instanceof Buffer) {
      // Handle Buffer input
      text = file.toString('utf-8');
      title = 'Text Document';
    } else if (file instanceof File) {
      // Handle File input
      text = await file.text();
      title = file.name;
    } else {
      throw new Error('Invalid file type for text extraction');
    }
    
    return {
      text,
      metadata: {
        title,
      },
    };
  } catch (error) {
    console.error('Error extracting text content:', error);
    throw new Error('Failed to extract text content');
  }
}

// Helper function to extract contacts from organization website
export async function extractContactsFromWebsite(url: string): Promise<ExtractedContact[]> {
  try {
    const content = await extractContentFromUrl(url);
    
    // TODO: Implement AI-powered contact extraction
    // This would use NLP to identify:
    // - Names (people)
    // - Email addresses
    // - Job titles
    // - Phone numbers
    // - LinkedIn profiles
    
    console.log('Contact extraction needed for:', url);
    console.log('Extracted content length:', content.text.length);
    
    return [];
  } catch (error) {
    console.error('Error extracting contacts from website:', error);
    return [];
  }
}

// Helper function to extract services from organization website  
export async function extractServicesFromWebsite(url: string): Promise<ExtractedService[]> {
  try {
    const content = await extractContentFromUrl(url);
    
    // TODO: Implement AI-powered service extraction
    // This would use NLP to identify:
    // - Service offerings
    // - Product descriptions
    // - Capabilities
    // - Technologies
    // - Industries served
    
    console.log('Service extraction needed for:', url);
    console.log('Extracted content length:', content.text.length);
    
    return [];
  } catch (error) {
    console.error('Error extracting services from website:', error);
    return [];
  }
}

// Enhanced function to process FileData chunks and create vectors
export async function processFileDataChunks(
  fileId: string,
  entityType: 'opportunity' | 'organization' | 'proposal',
  entityId: string
): Promise<void> {
  try {
    console.log(`Starting processFileDataChunks for file ${fileId}`);
    
    // Import FileData functions
    const { getFileChunks } = await import('@/src/lib/database/prisma/fileData');
    
    // Get all chunks for this file
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chunks = await getFileChunks(fileId, entityType as any, entityId);
    console.log(`Found ${chunks.length} chunks to process for embeddings`);
    
    if (chunks.length === 0) {
      console.log('No chunks found, skipping vector creation');
      return;
    }
    
    // Get vector database
    const { VectorDatabase } = await import('@/src/lib/database/prisma/vectorDatabase');
    const vectorDb = new VectorDatabase();
    
    // Delete existing vectors for this file
    await vectorDb.deleteVectorsBySource('FileData', fileId);
    console.log('Deleted existing vectors for file');
    
    // Process each chunk individually
    let processedCount = 0;
    for (const chunk of chunks) {
      try {
        // Check for duplicate content
        const { findDuplicateContent } = await import('@/src/lib/database/prisma/fileData');
        const duplicate = chunk.contentHash ? await findDuplicateContent(chunk.contentHash) : null;
        
        if (duplicate && chunk.id !== duplicate.id) {
          console.log(`Found duplicate content for chunk ${chunk.chunkIndex}, checking for existing vector...`);
          
          // Check if there's already a vector for the duplicate content
          const existingVectors = await vectorDb.getVectorsBySource('FileData', duplicate.id);
          if (existingVectors.length > 0) {
            console.log(`Reusing embedding from duplicate content for chunk ${chunk.chunkIndex}`);
            
            // Safely access metadata properties
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const metadata = chunk.metadata as any;

            // Create vector with existing embedding
            await vectorDb.createVector({
              entityType,
              entityId,
              sourceEntityType: 'FileData',
              sourceEntityId: chunk.id,
              content: chunk.content || '',
              vector: existingVectors[0].vector,
              metadata: {
                title: metadata?.sectionTitle || 'Document Chunk',
                fileType: metadata?.fileType || 'file',
                chunkIndex: chunk.chunkIndex || 0,
                totalChunks: chunk.totalChunks || chunks.length,
                extractedAt: chunk.createdAt.toISOString(),
                fileId,
                originalName: metadata?.originalName,
              },
            });
            
            processedCount++;
            console.log(`Progress: ${processedCount}/${chunks.length} chunks processed (reused embedding)`);
            continue;
          }
        }
        
        // Generate new embedding for this chunk
        if (chunk.content && chunk.content.trim().length > 0) {
          const embedding = await embeddingService.generateEmbedding(chunk.content);
          
          // Safely access metadata properties
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const metadata = chunk.metadata as any;
          
          await vectorDb.createVector({
            entityType,
            entityId,
            sourceEntityType: 'FileData',
            sourceEntityId: chunk.id,
            vector: embedding,
            metadata: {
              title: metadata?.sectionTitle || 'Document Chunk',
              fileType: metadata?.fileType || 'file',
              chunkIndex: chunk.chunkIndex || 0,
              totalChunks: chunk.totalChunks || chunks.length,
              extractedAt: chunk.createdAt.toISOString(),
              fileId,
              originalName: metadata?.originalName,
            },
          });
          
          processedCount++;
          console.log(`Progress: ${processedCount}/${chunks.length} chunks processed (new embedding)`);
        } else {
          console.log(`Skipping empty chunk ${chunk.chunkIndex}`);
        }
      } catch (chunkError) {
        console.error(`Error processing chunk ${chunk.chunkIndex}:`, chunkError);
        // Continue with other chunks
      }
    }
    
    console.log(`Successfully processed ${processedCount} chunks for file ${fileId}`);
  } catch (error) {
    console.error('Error processing FileData chunks:', error);
    throw error;
  }
}

// Legacy function - updated to use new chunk-based approach
export async function processAndStoreContent(
  content: ExtractedContent,
  entityType: 'opportunity' | 'organization' | 'proposal',
  entityId: string,
  sourceFileId?: string,
  sourceUrl?: string
): Promise<void> {
  try {
    console.log(`Legacy processAndStoreContent called - redirecting to chunk-based processing`);
    
    if (sourceFileId) {
      // Use new chunk-based processing
      await processFileDataChunks(sourceFileId, entityType, entityId);
    } else if (sourceUrl) {
      // For URLs, create a single vector
      const { VectorDatabase } = await import('@/src/lib/database/prisma/vectorDatabase');
      const vectorDb = new VectorDatabase();
      
      // Generate embedding
      const embedding = await embeddingService.generateEmbedding(content.text);
      
      // Create vector record
      await vectorDb.createVector({
        entityType,
        entityId,
        sourceEntityType: 'url',
        sourceEntityId: sourceUrl,
        vector: embedding,
        metadata: {
          title: content.metadata?.title || 'URL Content',
          fileType: 'url',
          extractedAt: getCurrentUtcIsoString(),
          url: sourceUrl,
        },
      });
      
      console.log(`Stored vector for URL: ${sourceUrl}`);
    }
  } catch (error) {
    console.error('Error in legacy processAndStoreContent:', error);
    throw error;
  }
}

// Enhanced function to search knowledge base
export async function searchKnowledgeBase(
  query: string,
  entityType: 'opportunity' | 'organization' | 'proposal',
  entityId: string,
  limit: number = 5
): Promise<{
  results: Array<{
    content: string;
    similarity: number;
    metadata: {
      title?: string;
      fileType?: string;
      chunkIndex?: number;
      totalChunks?: number;
      extractedAt: string;
    };
  }>;
  context: string[];
}> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await embeddingService.generateEmbedding(query);
    
    // Search similar vectors
    const { VectorDatabase } = await import('@/src/lib/database/prisma/vectorDatabase');
    const vectorDb = new VectorDatabase();
    const searchResults = await vectorDb.searchSimilar(
      queryEmbedding,
      entityType,
      entityId,
      undefined, // sourceEntityType
      limit
    );

    // Note: Content is now retrieved from source entities via sourceEntityId
    const context: string[] = [];

    return {
      results: searchResults.map(result => ({
        content: '', // Content now retrieved from source entities
        similarity: result.similarity,
        metadata: {
          title: result.metadata?.title,
          fileType: result.metadata?.fileType,
          chunkIndex: result.metadata?.chunkIndex,
          totalChunks: result.metadata?.totalChunks,
          extractedAt: getCurrentUtcIsoString(),
        },
      })),
      context,
    };
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    throw error;
  }
}

// Function to generate AI response using knowledge base
export async function generateKnowledgeBasedResponse(
  query: string,
  entityType: 'opportunity' | 'organization' | 'proposal',
  entityId: string,
  systemPrompt?: string,
  fileId?: string
): Promise<string> {
  try {
    const { context } = await searchKnowledgeBase(query, entityType, entityId);
    
    console.log(`Vector search found ${context.length} results for "${query}"`);
    
    if (context.length === 0) {
      console.log('DEBUG: Vector search returned 0 results, trying fallback strategies');
      
      let fallbackContext: string[] = [];
      
      // Strategy 1: If we have a specific fileId, get ALL semantic sections from that file
      if (fileId) {
        console.log(`DEBUG: Searching specific file ${fileId} for all semantic sections`);
        try {
          const { PrismaClient } = await import('../../../../auth/generated/prisma/client');
          const { PrismaPg } = await import('@prisma/adapter-pg');
          const prisma = new PrismaClient({
            adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
          });
          
          const fileSemanticSections = await prisma.fileData.findMany({
            where: {
              fileId: fileId,
              entityType: entityType,
              entityId: entityId
            },
            orderBy: {
              chunkIndex: 'asc'
            }
          });
          
          console.log(`DEBUG: Found ${fileSemanticSections.length} semantic sections in file ${fileId}`);
          
          if (fileSemanticSections.length > 0) {
            fallbackContext = fileSemanticSections
              .map(section => section.content)
              .filter((content): content is string => content !== null && content.trim().length > 0);
            
            console.log(`DEBUG: Using ${fallbackContext.length} semantic sections from specific file`);
          }
          
          await prisma.$disconnect();
        } catch (error) {
          console.error('Error fetching file-specific semantic sections:', error);
        }
      }
      
      // Strategy 2: If no file-specific results, try FileData search fallback
      if (fallbackContext.length === 0) {
        console.log('DEBUG: Trying FileData search fallback');
        const { searchFiles } = await import('../database');
        // Map entity types for searchFiles compatibility
        const searchEntityType = entityType === 'organization' ? 'knowledgebase' : entityType;
        const fileDataResults = await searchFiles(query, searchEntityType, entityId, undefined, 'semanticSection', 10);
        
        console.log(`DEBUG: FileData keyword search found ${fileDataResults.length} semantic sections`);
        
        if (fileDataResults.length > 0) {
          fallbackContext = fileDataResults
            .map(result => result.content)
            .filter(content => content && content.trim().length > 0);
          
          console.log(`DEBUG: Using ${fallbackContext.length} semantic sections from keyword search`);
        }
      }
      
      // Strategy 3: If still no results, try broader semantic section search
      if (fallbackContext.length === 0) {
        console.log('DEBUG: Trying broader semantic section search');
        try {
          const { PrismaClient } = await import('../../../../auth/generated/prisma/client');
          const { PrismaPg } = await import('@prisma/adapter-pg');
          const prisma = new PrismaClient({
            adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
          });
          
          const allSemanticSections = await prisma.fileData.findMany({
            where: {
              entityType: entityType,
              entityId: entityId
            },
            orderBy: [
              { fileId: 'asc' },
              { chunkIndex: 'asc' }
            ],
            take: 20 // Limit to avoid overwhelming the LLM
          });
          
          console.log(`DEBUG: Found ${allSemanticSections.length} total semantic sections`);
          
          if (allSemanticSections.length > 0) {
            fallbackContext = allSemanticSections
              .map(section => section.content)
              .filter((content): content is string => content !== null && content.trim().length > 0);
            
            console.log(`DEBUG: Using ${fallbackContext.length} semantic sections from broader search`);
          }
          
          await prisma.$disconnect();
        } catch (error) {
          console.error('Error fetching all semantic sections:', error);
        }
      }
      
      if (fallbackContext.length > 0) {
        return await embeddingService.generateContextualResponse(query, fallbackContext, systemPrompt);
      }
      
      return "I don't have enough information in the knowledge base to answer that question. Please upload relevant documents or add more context.";
    }

    return await embeddingService.generateContextualResponse(query, context, systemPrompt);
  } catch (error) {
    console.error('Error generating knowledge-based response:', error);
    throw error;
  }
} 
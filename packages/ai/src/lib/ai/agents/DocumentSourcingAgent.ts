/**
 * Document Sourcing Agent
 * 
 * Consolidates extractContentFromFile, extractContentFromUrl, processDocumentComplete, and CrawlerService.
 * Handles all document sourcing operations including file processing, URL extraction, and web crawling.
 */

import { z } from 'zod';
import { MODELS } from '../models';
import { 
  BaseAgent, 
  AgentInput, 
  AgentOutput, 
  ValidationResult, 
  AgentCapability
} from './BaseAgent';

// Document Content Schema
const DocumentContentSchema = z.object({
  text: z.string(),
  metadata: z.object({
    filename: z.string().nullable(),
    contentType: z.string(),
    size: z.number().nullable(),
    pageCount: z.number().nullable(),
    extractedAt: z.string(),
    processingTime: z.number().nullable(),
    confidence: z.number().min(0).max(1).nullable(),
  }),
  structure: z.object({
    title: z.string().nullable(),
    headings: z.array(z.string()).nullable(),
    paragraphs: z.array(z.string()).nullable(),
    tables: z.array(z.object({
      headers: z.array(z.string()),
      rows: z.array(z.array(z.string()))
    })).nullable(),
    links: z.array(z.object({
      text: z.string(),
      url: z.string()
    })).nullable(),
  }).nullable(),
  quality: z.object({
    readability: z.number().min(0).max(1),
    completeness: z.number().min(0).max(1),
    accuracy: z.number().min(0).max(1),
    relevance: z.number().min(0).max(1),
  }).nullable(),
});

// Web Crawling Schema
const WebCrawlingSchema = z.object({
  url: z.string().url(),
  content: z.string(),
  metadata: z.object({
    title: z.string().nullable(),
    description: z.string().nullable(),
    keywords: z.array(z.string()).nullable(),
    author: z.string().nullable(),
    publishedDate: z.string().nullable(),
    lastModified: z.string().nullable(),
    language: z.string().nullable(),
    domain: z.string(),
    crawledAt: z.string(),
  }),
  links: z.array(z.object({
    url: z.string(),
    text: z.string(),
    type: z.enum(['internal', 'external', 'download']),
  })).nullable(),
  media: z.array(z.object({
    type: z.enum(['image', 'video', 'audio', 'document']),
    url: z.string(),
    alt: z.string().nullable(),
    caption: z.string().nullable(),
  })).nullable(),
  quality: z.object({
    contentQuality: z.number().min(0).max(1),
    trustworthiness: z.number().min(0).max(1),
    freshness: z.number().min(0).max(1),
  }),
});

// Document Processing Schema
const DocumentProcessingSchema = z.object({
  processedContent: DocumentContentSchema,
  extractedEntities: z.object({
    organizations: z.array(z.string()).nullable(),
    contacts: z.array(z.string()).nullable(),
    locations: z.array(z.string()).nullable(),
    dates: z.array(z.string()).nullable(),
    amounts: z.array(z.string()).nullable(),
  }).nullable(),
  classification: z.object({
    documentType: z.string(),
    category: z.string(),
    confidence: z.number().min(0).max(1),
  }).nullable(),
  summary: z.object({
    keyPoints: z.array(z.string()),
    mainTopic: z.string(),
    wordCount: z.number(),
    readingTime: z.number(),
  }).nullable(),
});

interface DocumentSourcingInput {
  type: 'extract_from_file' | 'extract_from_url' | 'process_document' | 'crawl_website';
  file?: File;
  url?: string;
  content?: string;
  processingOptions?: {
    extractEntities?: boolean;
    classifyDocument?: boolean;
    generateSummary?: boolean;
    extractStructure?: boolean;
    qualityAnalysis?: boolean;
  };
  crawlingOptions?: {
    maxPages?: number;
    maxDepth?: number;
    followExternalLinks?: boolean;
    respectRobotsTxt?: boolean;
    delayBetweenRequests?: number;
  };
}

export class DocumentSourcingAgent extends BaseAgent {
  constructor() {
    const capabilities: AgentCapability[] = [
      {
        name: 'file_content_extraction',
        description: 'Extract content from various file formats',
        inputTypes: ['application/pdf', 'application/msword', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        outputTypes: ['document_content'],
        requirements: ['file'],
      },
      {
        name: 'url_content_extraction',
        description: 'Extract content from web URLs',
        inputTypes: ['text/plain'],
        outputTypes: ['document_content'],
        requirements: ['url'],
      },
      {
        name: 'document_processing',
        description: 'Process and analyze document content comprehensively',
        inputTypes: ['text/plain', 'application/json'],
        outputTypes: ['document_processing'],
        requirements: ['content'],
      },
      {
        name: 'website_crawling',
        description: 'Crawl websites for content discovery and extraction',
        inputTypes: ['text/plain'],
        outputTypes: ['web_crawling'],
        requirements: ['url'],
      },
    ];

    super('document_sourcing', {
      enabled: true,
      maxRetries: 3,
      timeoutMs: 120000, // 2 minutes for document processing
      enableLogging: true,
      enableDebugLogging: true,
      logPrefix: 'DOC_SOURCING',
      capabilities,
    });
  }

  validate(input: AgentInput): ValidationResult {
    const data = input.data as unknown as DocumentSourcingInput;
    
    if (!data.type) {
      return {
        isValid: false,
        errors: ['Operation type is required'],
        warnings: [],
      };
    }

    switch (data.type) {
      case 'extract_from_file':
        if (!data.file) {
          return {
            isValid: false,
            errors: ['file is required for file extraction'],
            warnings: [],
          };
        }
        break;
      
      case 'extract_from_url':
        if (!data.url) {
          return {
            isValid: false,
            errors: ['url is required for URL extraction'],
            warnings: [],
          };
        }
        // Basic URL validation
        try {
          new URL(data.url);
        } catch {
          return {
            isValid: false,
            errors: ['Invalid URL format'],
            warnings: [],
          };
        }
        break;
      
      case 'process_document':
        if (!data.content) {
          return {
            isValid: false,
            errors: ['content is required for document processing'],
            warnings: [],
          };
        }
        break;
      
      case 'crawl_website':
        if (!data.url) {
          return {
            isValid: false,
            errors: ['url is required for website crawling'],
            warnings: [],
          };
        }
        try {
          new URL(data.url);
        } catch {
          return {
            isValid: false,
            errors: ['Invalid URL format'],
            warnings: [],
          };
        }
        break;
    }

    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const data = input.data as unknown as DocumentSourcingInput;
    
    try {
      this.log(`Executing ${data.type} operation`);
      
      switch (data.type) {
        case 'extract_from_file':
          return await this.extractFromFile(data);
        
        case 'extract_from_url':
          return await this.extractFromUrl(data);
        
        case 'process_document':
          return await this.processDocument(data);
        
        case 'crawl_website':
          return await this.crawlWebsite(data);
        
        default:
          throw new Error(`Unknown operation type: ${data.type}`);
      }
    } catch (error) {
      this.log(`Error in ${data.type}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return this.createErrorOutput(
        error instanceof Error ? error : new Error('Unknown error occurred'),
        { operationType: data.type }
      );
    }
  }

  private async extractFromFile(data: DocumentSourcingInput): Promise<AgentOutput> {
    const file = data.file!;
    const processingOptions = data.processingOptions || {};
    
    this.log(`Extracting content from file: ${file.name} (${file.type})`);
    
    // Simulate file content extraction
    const extractedContent = await this.performFileExtraction(file);
    
    // Optional: Process extracted content
    let processedResult = null;
    if (processingOptions.extractEntities || processingOptions.classifyDocument || processingOptions.generateSummary) {
      processedResult = await this.processExtractedContent(extractedContent, processingOptions);
    }

    return {
      success: true,
      data: {
        documentContent: extractedContent,
        processedResult,
        processingOptions,
      },
    };
  }

  private async extractFromUrl(data: DocumentSourcingInput): Promise<AgentOutput> {
    const url = data.url!;
    const processingOptions = data.processingOptions || {};
    
    this.log(`Extracting content from URL: ${url}`);
    
    // Simulate URL content extraction
    const extractedContent = await this.performUrlExtraction(url);
    
    // Optional: Process extracted content
    let processedResult = null;
    if (processingOptions.extractEntities || processingOptions.classifyDocument || processingOptions.generateSummary) {
      processedResult = await this.processExtractedContent(extractedContent, processingOptions);
    }

    return {
      success: true,
      data: {
        documentContent: extractedContent,
        processedResult,
        processingOptions,
      },
    };
  }

  private async processDocument(data: DocumentSourcingInput): Promise<AgentOutput> {
    const content = data.content!;
    const processingOptions = data.processingOptions || {
      extractEntities: true,
      classifyDocument: true,
      generateSummary: true,
      extractStructure: true,
      qualityAnalysis: true,
    };
    
    this.log(`Processing document content (${content.length} characters)`);
    
    const systemPrompt = `You are a comprehensive document processor for ProposalHub.
    
    Process the provided document content and provide:
    1. Extracted entities (organizations, contacts, locations, dates, amounts)
    2. Document classification (type, category, confidence)
    3. Summary with key points and main topics
    4. Quality analysis (readability, completeness, accuracy, relevance)
    5. Structured content analysis
    
    Processing options: ${JSON.stringify(processingOptions)}`;

    const userPrompt = `Process the following document content:
    
    ${content}
    
    Provide comprehensive analysis based on the processing options specified.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt }
    ];

    const result = await this.callAI(
      MODELS.default,
      messages,
      DocumentProcessingSchema,
      'processDocument',
      'document_processing'
    );

    this.log(`Document processing completed`);

    return {
      success: true,
      data: {
        documentProcessing: result,
        processingMetrics: {
          contentLength: content.length,
          processingTime: Date.now(),
                     entitiesExtracted: (result as any).extractedEntities ? 
             Object.values((result as any).extractedEntities).flat().length : 0,
        },
      },
    };
  }

  private async crawlWebsite(data: DocumentSourcingInput): Promise<AgentOutput> {
    const url = data.url!;
    const crawlingOptions = data.crawlingOptions || {
      maxPages: 10,
      maxDepth: 2,
      followExternalLinks: false,
      respectRobotsTxt: true,
      delayBetweenRequests: 1000,
    };
    
    this.log(`Crawling website: ${url}`);
    
    // Simulate website crawling
    const crawledResults = await this.performWebsiteCrawling(url, crawlingOptions);
    
    return {
      success: true,
      data: {
        crawlingResults: crawledResults,
                 crawlingMetrics: {
           pagesCrawled: crawledResults.length,
           totalLinks: crawledResults.reduce((sum, result: any) => sum + (result.links?.length || 0), 0),
           crawlingTime: Date.now(),
         },
      },
    };
  }

  private async performFileExtraction(file: File): Promise<unknown> {
    // This would integrate with actual file processing libraries
    // For now, providing a structured simulation
    
    const content = await file.text();
    
    return {
      text: content,
      metadata: {
        filename: file.name,
        contentType: file.type,
        size: file.size,
        extractedAt: new Date().toISOString(),
        processingTime: Math.random() * 1000,
        confidence: 0.95,
      },
      structure: {
        title: 'Extracted Document',
        headings: ['Introduction', 'Main Content', 'Conclusion'],
        paragraphs: content.split('\n\n').filter(p => p.trim()),
      },
      quality: {
        readability: 0.8,
        completeness: 0.9,
        accuracy: 0.85,
        relevance: 0.9,
      },
    };
  }

  private async performUrlExtraction(url: string): Promise<unknown> {
    // This would integrate with actual web scraping libraries
    // For now, providing a structured simulation
    
    const domain = new URL(url).hostname;
    
    return {
      text: `Content extracted from ${url}`,
      metadata: {
        filename: `${domain}-content.html`,
        contentType: 'text/html',
        extractedAt: new Date().toISOString(),
        processingTime: Math.random() * 2000,
        confidence: 0.9,
      },
      structure: {
        title: `Content from ${domain}`,
        headings: ['Web Page Content'],
        links: [
          {
            text: 'Home',
            url: `${new URL(url).origin}/`,
          },
        ],
      },
      quality: {
        readability: 0.7,
        completeness: 0.8,
        accuracy: 0.8,
        relevance: 0.85,
      },
    };
  }

  private async performWebsiteCrawling(url: string, options: any): Promise<unknown[]> {
    // This would integrate with actual web crawling libraries
    // For now, providing a structured simulation
    
    const domain = new URL(url).hostname;
    const results = [];
    
    for (let i = 0; i < Math.min(options.maxPages, 5); i++) {
      results.push({
        url: `${url}${i > 0 ? `/page-${i}` : ''}`,
        content: `Content from page ${i + 1} of ${domain}`,
        metadata: {
          title: `Page ${i + 1} - ${domain}`,
          domain,
          crawledAt: new Date().toISOString(),
        },
        links: [
          {
            url: `${url}/link-${i}`,
            text: `Link ${i}`,
            type: 'internal',
          },
        ],
        quality: {
          contentQuality: 0.8,
          trustworthiness: 0.7,
          freshness: 0.9,
        },
      });
    }
    
    return results;
  }

  private async processExtractedContent(content: unknown, options: any): Promise<unknown> {
    // This would integrate with the DocumentAnalysisAgent
    // For now, providing a structured simulation
    
    return {
      entities: options.extractEntities ? {
        organizations: ['Example Corp', 'Tech Solutions Inc'],
        contacts: ['John Doe', 'Jane Smith'],
        locations: ['New York', 'San Francisco'],
        dates: ['2024-01-01', '2024-12-31'],
        amounts: ['$100,000', '$50,000'],
      } : undefined,
      classification: options.classifyDocument ? {
        documentType: 'business_document',
        category: 'proposal',
        confidence: 0.85,
      } : undefined,
      summary: options.generateSummary ? {
        keyPoints: ['Key point 1', 'Key point 2', 'Key point 3'],
        mainTopic: 'Business proposal document',
        wordCount: 1500,
        readingTime: 6,
      } : undefined,
    };
  }

  // Convenience methods for common operations
  async quickFileExtraction(file: File): Promise<unknown> {
    const input: AgentInput = {
      data: {
        type: 'extract_from_file',
        file,
        processingOptions: {
          extractEntities: true,
          classifyDocument: true,
          generateSummary: true,
        },
      },
    };

    const result = await this.execute(input);
    return result.success ? result.data.documentContent : null;
  }

  async quickUrlExtraction(url: string): Promise<unknown> {
    const input: AgentInput = {
      data: {
        type: 'extract_from_url',
        url,
        processingOptions: {
          extractEntities: true,
          classifyDocument: true,
        },
      },
    };

    const result = await this.execute(input);
    return result.success ? result.data.documentContent : null;
  }

  async quickWebsiteCrawl(url: string, maxPages: number = 5): Promise<unknown[]> {
    const input: AgentInput = {
      data: {
        type: 'crawl_website',
        url,
        crawlingOptions: {
          maxPages,
          maxDepth: 2,
          followExternalLinks: false,
        },
      },
    };

    const result = await this.execute(input);
    return result.success ? (result.data.crawlingResults as unknown[]) : [];
  }
} 
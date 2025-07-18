import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import type { FileType, ExtractedContent, KnowledgebaseError } from '../types';

export interface TextExtractionConfig {
  maxFileSize: number;
  timeout: number;
  enableOCR: boolean;
  preserveFormatting: boolean;
}

export class TextExtractionService {
  private config: TextExtractionConfig;

  constructor(config: Partial<TextExtractionConfig> = {}) {
    this.config = {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      timeout: 30000, // 30 seconds
      enableOCR: false, // Future feature
      preserveFormatting: true,
      ...config,
    };
  }

  /**
   * Extract text content from a file buffer based on file type
   */
  async extractText(
    buffer: Buffer,
    fileType: FileType,
    filename: string
  ): Promise<ExtractedContent> {
    try {
      // Validate file size
      if (buffer.length > this.config.maxFileSize) {
        throw new Error(`File size ${buffer.length} exceeds maximum allowed size of ${this.config.maxFileSize}`);
      }

      switch (fileType) {
        case 'pdf':
          return await this.extractFromPDF(buffer, filename);
        case 'docx':
          return await this.extractFromDOCX(buffer, filename);
        case 'txt':
          return await this.extractFromTXT(buffer, filename);
        case 'html':
          return await this.extractFromHTML(buffer, filename);
        case 'md':
          return await this.extractFromMarkdown(buffer, filename);
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      throw this.createError(
        'EXTRACTION_FAILED',
        `Failed to extract text from ${fileType} file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Extract text from PDF files
   */
  private async extractFromPDF(buffer: Buffer, filename: string): Promise<ExtractedContent> {
    try {
      const data = await pdfParse(buffer, {
        max: 0, // Extract all pages
        version: 'v1.10.100', // Use specific PDF.js version
      });

      const text = this.cleanText(data.text);
      const wordCount = this.countWords(text);

      return {
        text,
        metadata: {
          title: this.extractTitleFromFilename(filename),
          pages: data.numpages,
          wordCount,
          extractedAt: new Date().toISOString(),
          processingVersion: '1.0',
          fileInfo: {
            info: data.info,
            metadata: data.metadata,
          },
        },
      };
    } catch (error) {
      throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from DOCX files
   */
  private async extractFromDOCX(buffer: Buffer, filename: string): Promise<ExtractedContent> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      
      const text = this.cleanText(result.value);
      const wordCount = this.countWords(text);

      return {
        text,
        metadata: {
          title: this.extractTitleFromFilename(filename),
          wordCount,
          extractedAt: new Date().toISOString(),
          processingVersion: '1.0',
          warnings: result.messages.filter(msg => msg.type === 'warning').map(msg => msg.message),
          errors: result.messages.filter(msg => msg.type === 'error').map(msg => msg.message),
        },
      };
    } catch (error) {
      throw new Error(`DOCX extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from plain text files
   */
  private async extractFromTXT(buffer: Buffer, filename: string): Promise<ExtractedContent> {
    try {
      const text = buffer.toString('utf-8');
      const cleanedText = this.cleanText(text);
      const wordCount = this.countWords(cleanedText);

      return {
        text: cleanedText,
        metadata: {
          title: this.extractTitleFromFilename(filename),
          wordCount,
          extractedAt: new Date().toISOString(),
          processingVersion: '1.0',
          encoding: 'utf-8',
        },
      };
    } catch (error) {
      throw new Error(`TXT extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from HTML files
   */
  private async extractFromHTML(buffer: Buffer, filename: string): Promise<ExtractedContent> {
    try {
      const html = buffer.toString('utf-8');
      const $ = cheerio.load(html);
      
      // Extract title from HTML if available
      const htmlTitle = $('title').text() || this.extractTitleFromFilename(filename);
      
      // Remove script and style elements
      $('script, style').remove();
      
      // Extract text content
      const text = this.cleanText($('body').text() || $.text());
      const wordCount = this.countWords(text);

      return {
        text,
        metadata: {
          title: htmlTitle,
          wordCount,
          extractedAt: new Date().toISOString(),
          processingVersion: '1.0',
          htmlElements: {
            headings: $('h1, h2, h3, h4, h5, h6').map((_, el) => $(el).text()).get(),
            links: $('a[href]').map((_, el) => ({ text: $(el).text(), href: $(el).attr('href') })).get(),
          },
        },
      };
    } catch (error) {
      throw new Error(`HTML extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from Markdown files
   */
  private async extractFromMarkdown(buffer: Buffer, filename: string): Promise<ExtractedContent> {
    try {
      const markdown = buffer.toString('utf-8');
      
      // Basic markdown parsing - remove common markdown syntax
      let text = markdown
        .replace(/^#{1,6}\s+/gm, '') // Remove headers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .replace(/`{1,3}[^`]*`{1,3}/g, '') // Remove code blocks
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Remove links, keep text
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '') // Remove images
        .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
        .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
        .replace(/^>\s+/gm, '') // Remove blockquotes
        .replace(/^\s*---+\s*$/gm, '') // Remove horizontal rules
        .replace(/\n{3,}/g, '\n\n'); // Normalize whitespace

      text = this.cleanText(text);
      const wordCount = this.countWords(text);

      return {
        text,
        metadata: {
          title: this.extractTitleFromFilename(filename),
          wordCount,
          extractedAt: new Date().toISOString(),
          processingVersion: '1.0',
          format: 'markdown',
        },
      };
    } catch (error) {
      throw new Error(`Markdown extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean and normalize extracted text
   */
  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n') // Convert old Mac line endings
      .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
      .replace(/\t/g, ' ') // Convert tabs to spaces
      .replace(/[ ]{2,}/g, ' ') // Normalize multiple spaces
      .replace(/^\s+|\s+$/gm, '') // Trim whitespace from lines
      .trim(); // Trim overall content
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
   * Extract title from filename
   */
  private extractTitleFromFilename(filename: string): string {
    return filename
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
      .replace(/\b\w/g, l => l.toUpperCase()) // Title case
      .trim();
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
      operation: 'TextExtraction',
    };
  }
}

// Utility function to detect if file needs OCR
export function needsOCR(extractedContent: ExtractedContent): boolean {
  const { text, metadata } = extractedContent;
  
  // If text is very short compared to file size or pages, might need OCR
  const wordsPerPage = metadata.pages ? text.split(/\s+/).length / metadata.pages : text.split(/\s+/).length;
  
  return wordsPerPage < 50; // Less than 50 words per page suggests scanned content
}

// Export utility functions
export { TextExtractionService as default }; 
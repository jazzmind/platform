import * as mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import type { FileType, ExtractedContent, KnowledgebaseError } from '../types';

export interface TextExtractionConfig {
  maxFileSize: number;
  timeout: number;
  enableOCR: boolean;
  preserveFormatting: boolean;
}

export class TextExtractionService {
  private config: TextExtractionConfig;
  private turndownService: TurndownService;

  constructor(config: Partial<TextExtractionConfig> = {}) {
    this.config = {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      timeout: 30000, // 30 seconds
      enableOCR: false, // Future feature
      preserveFormatting: true,
      ...config,
    };
    
    // Initialize turndown service for HTML to markdown conversion
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined'
    });
  }

  /**
   * Extract text content from a file buffer based on file type
   */
  async extractText(
    buffer: Buffer,
    fileType: FileType,
    filename: string
  ): Promise<ExtractedContent> {
    console.log(`🔍 TextExtractionService: extractText called with:`);
    console.log(`   - filename: ${filename}`);
    console.log(`   - fileType: ${fileType}`);
    console.log(`   - buffer size: ${buffer.length} bytes`);
    
    try {
      // Validate file size
      if (buffer.length > this.config.maxFileSize) {
        throw new Error(`File size ${buffer.length} exceeds maximum allowed size of ${this.config.maxFileSize}`);
      }

      switch (fileType) {
        case 'pdf':
          console.log(`📄 TextExtractionService: Processing as PDF`);
          return await this.extractFromPDF(buffer, filename);
        case 'docx':
          console.log(`📝 TextExtractionService: Processing as DOCX`);
          return await this.extractFromDOCX(buffer, filename);
        case 'txt':
          console.log(`📄 TextExtractionService: Processing as TXT`);
          return await this.extractFromTXT(buffer, filename);
        case 'html':
          console.log(`🌐 TextExtractionService: Processing as HTML`);
          return await this.extractFromHTML(buffer, filename);
        case 'md':
          console.log(`📋 TextExtractionService: Processing as Markdown`);
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
      console.log(`📄 TextExtractionService: Starting PDF extraction with DOM polyfills`);
      
      // Add necessary DOM polyfills for Node.js environment
      if (typeof globalThis.DOMMatrix === 'undefined') {
        // Simple DOMMatrix polyfill for PDF.js
        (globalThis as any).DOMMatrix = class DOMMatrix {
          a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
          constructor() {}
          static fromMatrix() { return new DOMMatrix(); }
        };
      }

      if (typeof globalThis.Path2D === 'undefined') {
        (globalThis as any).Path2D = class Path2D {
          constructor() {}
        };
      }

      if (typeof globalThis.CanvasGradient === 'undefined') {
        (globalThis as any).CanvasGradient = class CanvasGradient {};
      }

      if (typeof globalThis.CanvasPattern === 'undefined') {
        (globalThis as any).CanvasPattern = class CanvasPattern {};
      }
      
      const pdfData = new Uint8Array(buffer);
      
      // Use legacy build with webpack externals configuration
      console.log('📄 TextExtractionService: Importing pdfjs-dist legacy build...');
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      
      console.log('📄 TextExtractionService: Configuring worker for legacy build...');
      // Use the exact worker configuration that worked in standalone script
      pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.mjs';
      
      console.log('📄 TextExtractionService: Loading PDF document...');
      
      // Use the exact configuration that worked in the test script  
      const loadingTask = pdfjs.getDocument({ 
        data: pdfData,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      });
      
      const pdf = await loadingTask.promise;
      console.log(`📄 TextExtractionService: PDF loaded successfully - ${pdf.numPages} pages`);
      
      // Extract structured HTML content from PDF
      let htmlContent = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        console.log(`📄 TextExtractionService: Processing page ${i}/${pdf.numPages} for HTML extraction...`);
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        
        // Start page section
        htmlContent += `<div class="page" data-page="${i}">\n`;
        if (i === 1) {
          htmlContent += `<h1>Page ${i}</h1>\n`;
        } else {
          htmlContent += `<h2>Page ${i}</h2>\n`;
        }
        
        // Process text items with positioning and styling
        let currentY = -1;
        let currentParagraph = '';
        
        for (const item of content.items) {
          const textItem = item as any;
          const text = textItem.str;
          
          if (!text.trim()) continue;
          
          // Simple paragraph detection based on Y position changes
          const itemY = Math.round(textItem.transform[5]);
          
          if (currentY !== -1 && Math.abs(itemY - currentY) > 5) {
            // New line/paragraph detected
            if (currentParagraph.trim()) {
              htmlContent += this.formatTextAsHtml(currentParagraph.trim());
              currentParagraph = '';
            }
          }
          
          currentParagraph += (currentParagraph ? ' ' : '') + text;
          currentY = itemY;
        }
        
        // Add remaining paragraph
        if (currentParagraph.trim()) {
          htmlContent += this.formatTextAsHtml(currentParagraph.trim());
        }
        
        htmlContent += `</div>\n\n`;
      }
      
      console.log(`📄 TextExtractionService: Generated ${htmlContent.length} characters of HTML`);
      
      if (!htmlContent.trim()) {
        throw new Error('No content extracted from PDF');
      }
      
      // Convert HTML to markdown
      const markdownText = this.turndownService.turndown(htmlContent);
      const cleanedText = this.cleanText(markdownText);
      const wordCount = this.countWords(cleanedText);
      
      console.log(`📄 TextExtractionService: Converted to ${cleanedText.length} characters of markdown`);
      console.log(`📄 TextExtractionService: First 200 chars: "${cleanedText.substring(0, 200)}..."`);;

      return {
        text: cleanedText,
        metadata: {
          title: this.extractTitleFromFilename(filename),
          pages: pdf.numPages,
          wordCount,
          extractedAt: new Date().toISOString(),
          processingVersion: '1.0',
          format: 'pdf',
        },
      };
      
    } catch (error) {
      console.error(`❌ TextExtractionService: PDF extraction failed:`, error);
      console.error(`❌ TextExtractionService: Error details:`, {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      // Return a working fallback that allows the system to continue
      console.log(`📄 TextExtractionService: Using fallback approach due to PDF library issues`);
      
      const fallbackText = `PDF Document: ${filename}

This PDF document has been uploaded successfully but text extraction encountered technical issues.
The document is stored and available for download.

File size: ${Math.round(buffer.length / 1024)} KB
Upload date: ${new Date().toISOString()}

Note: PDF text extraction is being enhanced to handle various PDF formats and configurations.`;

      const cleanedText = this.cleanText(fallbackText);
      const wordCount = this.countWords(cleanedText);

      return {
        text: cleanedText,
        metadata: {
          title: this.extractTitleFromFilename(filename),
          pages: 1,
          wordCount,
          extractedAt: new Date().toISOString(),
          processingVersion: '1.0-fallback',
          format: 'pdf',
          warnings: ['PDF text extraction failed - using fallback content'],
          errorDetails: {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
          }
        },
      };
    }
  }

  /**
   * Extract text from DOCX files
   */
  private async extractFromDOCX(buffer: Buffer, filename: string): Promise<ExtractedContent> {
    try {
      console.log(`🔧 TextExtractionService: Starting DOCX extraction for ${filename}`);
      console.log(`🔧 TextExtractionService: Buffer size: ${buffer.length} bytes`);
      
      // Extract as HTML first, then convert to markdown for better formatting
      const htmlResult = await mammoth.convertToHtml({ buffer });
      console.log(`🔧 TextExtractionService: Mammoth extracted ${htmlResult.value.length} characters as HTML`);
      console.log(`🔧 TextExtractionService: Mammoth messages:`, htmlResult.messages);
      
      // Convert HTML to markdown for better structured content
      const markdownText = this.htmlToMarkdown(htmlResult.value);
      const text = this.cleanText(markdownText);
      const wordCount = this.countWords(text);
      
      console.log(`🔧 TextExtractionService: Cleaned text length: ${text.length}`);
      console.log(`🔧 TextExtractionService: Word count: ${wordCount}`);

      const extractedContent = {
        text,
        metadata: {
          title: this.extractTitleFromFilename(filename),
          wordCount,
          extractedAt: new Date().toISOString(),
          processingVersion: '1.0',
          warnings: htmlResult.messages.filter(msg => msg.type === 'warning').map(msg => msg.message),
        },
      };
      
      console.log(`🔧 TextExtractionService: DOCX extraction complete for ${filename}`);
      return extractedContent;
    } catch (error) {
      console.error(`❌ TextExtractionService: DOCX extraction failed for ${filename}:`, error);
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
            headings: $('h1, h2, h3, h4, h5, h6').length,
            paragraphs: $('p').length,
            links: $('a[href]').length,
            images: $('img').length,
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
      .replace(/^[ \t]+|[ \t]+$/gm, '') // Trim only spaces and tabs from lines, preserve newlines
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
   * Convert HTML to Markdown format for better structured content
   */
  private htmlToMarkdown(html: string): string {
    if (!html) return '';

    let markdown = html
      // Convert headers
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
      
      // Convert bold and italic
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      
      // Convert lists
      .replace(/<ul[^>]*>/gi, '')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<ol[^>]*>/gi, '')
      .replace(/<\/ol>/gi, '\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      
      // Convert paragraphs
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      
      // Convert line breaks
      .replace(/<br\s*\/?>/gi, '\n')
      
      // Convert links
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      
      // Remove remaining HTML tags
      .replace(/<[^>]*>/g, '')
      
      // Clean up extra whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    return markdown;
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

  /**
   * Format text as HTML with basic structure detection
   */
  private formatTextAsHtml(text: string): string {
    if (!text.trim()) return '';
    
    // Detect headings based on common patterns
    if (text.match(/^[A-Z\s]{3,}$/) && text.length < 100) {
      // All caps text that's not too long = heading
      return `<h3>${text}</h3>\n`;
    }
    
    if (text.match(/^\d+\./) || text.match(/^[A-Za-z]\./)) {
      // Numbered or lettered lists
      return `<li>${text}</li>\n`;
    }
    
    if (text.match(/^-\s/) || text.match(/^•\s/)) {
      // Bullet points
      return `<li>${text.substring(2)}</li>\n`;
    }
    
    // Default to paragraph
    return `<p>${text}</p>\n`;
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
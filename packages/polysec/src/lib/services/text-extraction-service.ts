import { FileType, DocumentContent, DocumentSection, DocumentProcessingResult } from '../../types';

export class TextExtractionService {
  
  /**
   * Extracts text and sections from a document buffer
   */
  async extractText(
    buffer: Uint8Array, 
    fileType: FileType, 
    fileName: string
  ): Promise<DocumentProcessingResult> {
    try {
      let content: DocumentContent;
      let sections: DocumentSection[];

      switch (fileType) {
        case FileType.PDF:
          ({ content, sections } = await this.extractFromPDF(buffer, fileName));
          break;
        case FileType.DOCX:
          ({ content, sections } = await this.extractFromDOCX(buffer, fileName));
          break;
        case FileType.TXT:
          ({ content, sections } = await this.extractFromTXT(buffer, fileName));
          break;
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }

      return {
        content,
        sections,
        status: 'COMPLETED' as any
      };
    } catch (error) {
      return {
        content: { text: '', metadata: {} },
        sections: [],
        status: 'FAILED' as any,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

     /**
    * Extracts text from PDF using pdf-parse (Phase 2 implementation)
    */
   private async extractFromPDF(buffer: Uint8Array, fileName: string): Promise<{
     content: DocumentContent;
     sections: DocumentSection[];
   }> {
     // Phase 1: Placeholder implementation
     const content: DocumentContent = {
       text: `[PDF Content Placeholder]\nThis is a placeholder for PDF content extraction.\nFile: ${fileName}\nSize: ${buffer.length} bytes`,
       metadata: {
         title: fileName,
         pageCount: 1,
         createdDate: new Date().toISOString()
       }
     };

     const sections = this.extractSectionsFromText(content.text);
     return { content, sections };
   }

     /**
    * Extracts text from DOCX using mammoth (Phase 2 implementation)
    */
   private async extractFromDOCX(buffer: Uint8Array, fileName: string): Promise<{
     content: DocumentContent;
     sections: DocumentSection[];
   }> {
     // Phase 1: Placeholder implementation
     const content: DocumentContent = {
       text: `[DOCX Content Placeholder]\nThis is a placeholder for DOCX content extraction.\nFile: ${fileName}\nSize: ${buffer.length} bytes`,
       metadata: {
         title: fileName,
         createdDate: new Date().toISOString()
       }
     };

     const sections = this.extractSectionsFromText(content.text);
     return { content, sections };
   }

  /**
   * Extracts text from TXT files
   */
  private async extractFromTXT(buffer: Uint8Array, fileName: string): Promise<{
    content: DocumentContent;
    sections: DocumentSection[];
  }> {
    try {
      const text = new TextDecoder('utf-8').decode(buffer);
      
      const content: DocumentContent = {
        text,
        metadata: {
          title: fileName,
          createdDate: new Date().toISOString()
        }
      };

      // Extract sections from the text
      const sections = this.extractSectionsFromText(text);

      return { content, sections };
    } catch (error) {
      throw new Error(`TXT extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extracts sections from text using basic patterns
   */
  private extractSectionsFromText(text: string): DocumentSection[] {
    const sections: DocumentSection[] = [];
    const lines = text.split('\n');
    
    let currentSection: DocumentSection | null = null;
    let sectionContent: string[] = [];
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineLength = lines[i].length + 1; // +1 for newline
      
      // Detect headings (lines that are all caps, or start with numbers, or are short and followed by content)
      const isHeading = this.isLikelyHeading(line, i, lines);
      
      if (isHeading && line.length > 0) {
        // Save previous section if exists
        if (currentSection && sectionContent.length > 0) {
          currentSection.content = sectionContent.join('\n').trim();
          currentSection.endIndex = currentIndex - 1;
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          id: `section_${sections.length + 1}`,
          title: line,
          content: '',
          startIndex: currentIndex,
          endIndex: currentIndex + lineLength,
          level: this.getHeadingLevel(line)
        };
        sectionContent = [];
      } else if (currentSection && line.length > 0) {
        sectionContent.push(line);
      } else if (!currentSection && line.length > 0) {
        // Start first section if no heading detected
        currentSection = {
          id: `section_1`,
          title: 'Introduction',
          content: '',
          startIndex: currentIndex,
          endIndex: currentIndex + lineLength,
          level: 1
        };
        sectionContent = [line];
      }
      
      currentIndex += lineLength;
    }
    
    // Add the last section
    if (currentSection && sectionContent.length > 0) {
      currentSection.content = sectionContent.join('\n').trim();
      currentSection.endIndex = currentIndex;
      sections.push(currentSection);
    }

    // If no sections were found, create a single section with all content
    if (sections.length === 0) {
      sections.push({
        id: 'section_1',
        title: 'Document Content',
        content: text.trim(),
        startIndex: 0,
        endIndex: text.length,
        level: 1
      });
    }

    return sections;
  }

  /**
   * Determines if a line is likely a heading
   */
  private isLikelyHeading(line: string, index: number, allLines: string[]): boolean {
    if (line.length === 0) return false;
    
    // Check for numbered headings (1., 1.1, etc.)
    if (/^\d+(\.\d+)*\.?\s/.test(line)) return true;
    
    // Check for lines that are all uppercase (and not too long)
    if (line === line.toUpperCase() && line.length < 100 && line.length > 2) return true;
    
    // Check for lines followed by dashes or equals (markdown style)
    if (index + 1 < allLines.length) {
      const nextLine = allLines[index + 1].trim();
      if (nextLine.match(/^[-=]{3,}$/)) return true;
    }
    
    // Check for lines that are short and followed by longer content
    if (line.length < 80 && index + 1 < allLines.length) {
      const nextLine = allLines[index + 1].trim();
      if (nextLine.length > line.length * 1.5) return true;
    }
    
    return false;
  }

  /**
   * Determines heading level based on formatting
   */
  private getHeadingLevel(line: string): number {
    // Count leading numbers (1.1.1 = level 3)
    const match = line.match(/^(\d+\.)+/);
    if (match) {
      return (match[0].match(/\./g) || []).length;
    }
    
    // Default to level 1
    return 1;
  }
} 
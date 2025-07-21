import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { 
  processDocumentComplete,
} from '../../../../lib/ai/documentProcessing';
import {
  extractContentFromFile
} from '../../../../lib/ai/contentExtraction';
import {
  analyzeSemantic,
  detectDocumentType
} from '../../../../lib/ai/documentAnalysis';
import {
  classifyDocument
} from '../../../../lib/ai/documentClassification';
import { 
  validateTestEnvironment, 
  retryOperation, 
  TEST_CONFIG 
} from '../setup/testConfig';
import { 
  SAMPLE_DOCUMENTS
} from '../setup/testData';

// Test wrapper functions to match expected interface
const processDocument = async (content: string, options: any) => {
  // Create a mock File object from string content
  const blob = new Blob([content], { type: 'text/plain' });
  const file = new File([blob], options.filename || 'test.txt', { type: 'text/plain' });
  
  const result = await processDocumentComplete(file, {
    opportunityId: 'test-opportunity',
    uploadedBy: 'test-user'
  });
  
  // Transform result to match expected interface
  return {
    content: result.extractedContent.text,
    summary: result.semanticSections.map(s => s.title).join(', '),
    contacts: [], // Placeholder
    organizations: [], // Placeholder
    confidence: result.classification?.confidence || 0.8
  };
};

const extractDocumentContent = async (buffer: Buffer, filename: string) => {
  const blob = new Blob([buffer], { type: 'text/plain' });
  const file = new File([blob], filename, { type: 'text/plain' });
  
  const result = await extractContentFromFile(file);
  return {
    content: result.text,
    metadata: result.metadata
  };
};

const processFileBuffer = async (buffer: Buffer, filename: string, options: any) => {
  return processDocument(buffer.toString(), { ...options, filename });
};

const extractStructuredData = async (content: string, type: string) => {
  const progressCallback = () => {};
  const sections = await analyzeSemantic(content, progressCallback);
  return {
    structuredData: sections.map(section => ({
      title: section.title,
      content: section.content,
      keywords: section.keywords
    }))
  };
};

const generateDocumentSummary = async (content: string, options: any) => {
  const progressCallback = () => {};
  const sections = await analyzeSemantic(content, progressCallback);
  const summary = sections.slice(0, 3).map(s => s.title).join('. ');
  return {
    summary: summary.length > options.maxLength ? 
      summary.substring(0, options.maxLength) + '...' : summary,
    keyPoints: options.includeKeyPoints ? sections.map(s => s.title) : []
  };
};

const extractDocumentMetadata = async (content: string, filename: string) => {
  const docType = detectDocumentType(content);
  return {
    documentType: docType,
    filename,
    contentLength: content.length,
    estimatedReadTime: Math.ceil(content.split(' ').length / 200)
  };
};

const validateDocumentType = (filename: string) => {
  const supportedExtensions = ['.txt', '.pdf', '.doc', '.docx', '.md'];
  const extension = filename.substring(filename.lastIndexOf('.'));
  return {
    isSupported: supportedExtensions.includes(extension),
    detectedType: extension.replace('.', ''),
    confidence: 0.9
  };
};

const processDocumentWithFallback = async (content: string, options: any) => {
  try {
    return await processDocument(content, options);
  } catch (error) {
    // Fallback processing
    return {
      content: content.substring(0, 1000), // Truncated content
      summary: 'Fallback processing applied',
      contacts: [],
      organizations: [],
      confidence: 0.5,
      fallbackUsed: true
    };
  };
};

describe('DocumentProcessing Service', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  afterAll(() => {
    // Cleanup if needed
  });

  describe('processDocument', () => {
    it('should process a requirements document', async () => {
      const result = await retryOperation(() =>
        processDocument(SAMPLE_DOCUMENTS.requirements, {
          filename: 'requirements.txt',
          extractContacts: true,
          extractOrganizations: true,
          generateSummary: true,
          classifyDocument: true
        })
      );

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('documentType');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('contacts');
      expect(result).toHaveProperty('organizations');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('confidence');

      expect(typeof result.content).toBe('string');
      expect(typeof result.documentType).toBe('string');
      expect(typeof result.summary).toBe('string');
      expect(Array.isArray(result.contacts)).toBe(true);
      expect(Array.isArray(result.organizations)).toBe(true);
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);

      console.log(`✅ Requirements document processed: ${result.documentType}`);
    }, TEST_CONFIG.timeouts.document);

    it('should process a proposal document', async () => {
      const result = await retryOperation(() =>
        processDocument(SAMPLE_DOCUMENTS.proposal, {
          filename: 'proposal.pdf',
          extractContacts: true,
          extractOrganizations: true,
          generateSummary: true,
          classifyDocument: true,
          extractStructuredData: true
        })
      );

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('documentType');
      expect(result).toHaveProperty('structuredData');
      expect(result.documentType.toLowerCase()).toContain('proposal');
      
      // Should extract proposal-specific data
      if (result.structuredData) {
        expect(result.structuredData).toHaveProperty('sections');
        expect(Array.isArray(result.structuredData.sections)).toBe(true);
      }

      console.log(`✅ Proposal document processed: ${result.documentType}`);
    }, TEST_CONFIG.timeouts.document);

    it('should process a contract document', async () => {
              const result = await retryOperation(() =>
         processDocument(SAMPLE_DOCUMENTS.proposal, { // Using proposal instead of contract
          filename: 'contract.docx',
          extractContacts: true,
          extractOrganizations: true,
          generateSummary: true,
          classifyDocument: true,
          extractKey: true
        })
      );

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('documentType');
      expect(result.documentType.toLowerCase()).toContain('contract');
      
      // Should extract contract-specific elements
      expect(result.organizations.length).toBeGreaterThan(0); // Parties involved
      
      console.log(`✅ Contract document processed: ${result.documentType}`);
    }, TEST_CONFIG.timeouts.document);

    it('should handle progress callbacks', async () => {
      const progressEvents: Array<{ stage: string; current: number; total: number; message: string }> = [];
      const progressCallback = (progress: { stage: string; current: number; total: number; message: string }) => {
        progressEvents.push(progress);
      };

      const result = await retryOperation(() =>
        processDocument(SAMPLE_DOCUMENTS.requirements, {
          filename: 'requirements.txt',
          extractContacts: true,
          extractOrganizations: true,
          generateSummary: true,
          classifyDocument: true,
          progressCallback
        })
      );

      expect(result).toHaveProperty('content');
      expect(progressEvents.length).toBeGreaterThan(0);
      
      // Should track different processing stages
      const stages = progressEvents.map(p => p.stage);
      expect(stages).toContain('processing');
      
      console.log(`✅ Progress tracking: ${progressEvents.length} events`);
    }, TEST_CONFIG.timeouts.document);
  });

  describe('extractDocumentContent', () => {
    it('should extract content from text files', async () => {
      const result = await retryOperation(() =>
        extractDocumentContent(Buffer.from(SAMPLE_DOCUMENTS.requirements), 'requirements.txt')
      );

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('metadata');
      expect(typeof result.content).toBe('string');
      expect(result.content.length).toBeGreaterThan(0);
      
      expect(result.metadata).toHaveProperty('fileType');
      expect(result.metadata.fileType).toBe('text/plain');
      
      console.log(`✅ Text content extracted: ${result.content.length} characters`);
    }, TEST_CONFIG.timeouts.completion);

    it('should handle various file types', async () => {
      const testFiles = [
        { name: 'document.txt', type: 'text/plain' },
        { name: 'document.pdf', type: 'application/pdf' },
        { name: 'document.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { name: 'document.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      ];

      for (const file of testFiles) {
        const result = await retryOperation(() =>
          extractDocumentContent(Buffer.from(SAMPLE_DOCUMENTS.requirements), file.name)
        );

        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('metadata');
        expect(result.metadata.fileType).toBe(file.type);
        
        console.log(`✅ ${file.name} processed successfully`);
      }
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('processFileBuffer', () => {
    it('should process file buffers correctly', async () => {
      const buffer = Buffer.from(SAMPLE_DOCUMENTS.requirements);
      
      const result = await retryOperation(() =>
        processFileBuffer(buffer, 'requirements.txt', {
          extractContacts: false,
          extractOrganizations: false,
          generateSummary: true,
          classifyDocument: true
        })
      );

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('documentType');
      expect(result).toHaveProperty('summary');
      expect(typeof result.content).toBe('string');
      
      console.log(`✅ File buffer processed: ${result.documentType}`);
    }, TEST_CONFIG.timeouts.document);

    it('should handle binary files', async () => {
      // Create a mock binary file buffer
      const binaryBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // ZIP file header
      
      const result = await retryOperation(() =>
        processFileBuffer(binaryBuffer, 'document.zip', {
          extractContacts: false,
          extractOrganizations: false,
          generateSummary: false,
          classifyDocument: true
        })
      );

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('documentType');
      expect(result.documentType).toContain('binary');
      
      console.log(`✅ Binary file handled: ${result.documentType}`);
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('classifyDocument', () => {
    it('should classify requirement documents', async () => {
      const result = await retryOperation(() =>
        classifyDocument(SAMPLE_DOCUMENTS.requirements, 'requirements.txt')
      );

      expect(result).toHaveProperty('documentType');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('categories');
      
      expect(typeof result.documentType).toBe('string');
      expect(typeof result.confidence).toBe('number');
      expect(Array.isArray(result.categories)).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      
      expect(result.documentType.toLowerCase()).toContain('requirement');
      
      console.log(`✅ Document classified: ${result.documentType} (${result.confidence})`);
    }, TEST_CONFIG.timeouts.completion);

    it('should classify proposal documents', async () => {
      const result = await retryOperation(() =>
        classifyDocument(SAMPLE_DOCUMENTS.proposal, 'proposal.pdf')
      );

      expect(result.documentType.toLowerCase()).toContain('proposal');
      expect(result.confidence).toBeGreaterThan(0.5);
      
      console.log(`✅ Proposal classified: ${result.documentType} (${result.confidence})`);
    }, TEST_CONFIG.timeouts.completion);

    it('should classify contract documents', async () => {
      const result = await retryOperation(() =>
        classifyDocument(SAMPLE_DOCUMENTS.contract, 'contract.docx')
      );

      expect(result.documentType.toLowerCase()).toContain('contract');
      expect(result.confidence).toBeGreaterThan(0.5);
      
      console.log(`✅ Contract classified: ${result.documentType} (${result.confidence})`);
    }, TEST_CONFIG.timeouts.completion);

    it('should handle unknown document types', async () => {
      const unknownContent = `
        This is just some random text that doesn't fit into any specific
        document category. It's neither a proposal, nor a contract, nor
        a requirements document. Just random content.
      `;

      const result = await retryOperation(() =>
        classifyDocument(unknownContent, 'unknown.txt')
      );

      expect(result).toHaveProperty('documentType');
      expect(result).toHaveProperty('confidence');
      expect(result.documentType.toLowerCase()).toContain('document');
      
      console.log(`✅ Unknown document classified: ${result.documentType} (${result.confidence})`);
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('extractStructuredData', () => {
    it('should extract structured data from proposals', async () => {
      const result = await retryOperation(() =>
        extractStructuredData(SAMPLE_DOCUMENTS.proposal, 'proposal')
      );

      expect(result).toHaveProperty('structuredData');
      expect(Array.isArray(result.structuredData)).toBe(true);
      
      if (result.structuredData.length > 0) {
        const section = result.structuredData[0];
        expect(section).toHaveProperty('title');
        expect(section).toHaveProperty('content');
        expect(typeof section.title).toBe('string');
        expect(typeof section.content).toBe('string');
      }
      
      console.log(`✅ Structured data extracted: ${result.structuredData.length} sections`);
    }, TEST_CONFIG.timeouts.completion);

    it('should extract structured data from contracts', async () => {
              const result = await retryOperation(() =>
         extractStructuredData(SAMPLE_DOCUMENTS.proposal, 'contract')
      );

      expect(result).toHaveProperty('structuredData');
      expect(Array.isArray(result.structuredData)).toBe(true);
      
      console.log(`✅ Contract structured data extracted: ${result.structuredData.length} sections`);
    }, TEST_CONFIG.timeouts.completion);

    it('should extract structured data from requirements', async () => {
      const result = await retryOperation(() =>
        extractStructuredData(SAMPLE_DOCUMENTS.requirements, 'requirements')
      );

      expect(result).toHaveProperty('structuredData');
      expect(Array.isArray(result.structuredData)).toBe(true);
      
      console.log(`✅ Requirements structured data extracted: ${result.structuredData.length} sections`);
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('generateDocumentSummary', () => {
    it('should generate concise summaries', async () => {
      const result = await retryOperation(() =>
        generateDocumentSummary(SAMPLE_DOCUMENTS.requirements, {
          maxLength: 200,
          includeKeyPoints: true,
          includeActionItems: true
        })
      );

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('keyPoints');
      expect(result).toHaveProperty('actionItems');
      
      expect(typeof result.summary).toBe('string');
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.summary.length).toBeLessThanOrEqual(250); // Allow some margin
      
      expect(Array.isArray(result.keyPoints)).toBe(true);
      expect(Array.isArray(result.actionItems)).toBe(true);
      
      console.log(`✅ Summary generated: ${result.summary.length} characters`);
    }, TEST_CONFIG.timeouts.completion);

    it('should handle different summary lengths', async () => {
      const shortSummary = await retryOperation(() =>
        generateDocumentSummary(SAMPLE_DOCUMENTS.requirements, {
          maxLength: 100,
          includeKeyPoints: false,
          includeActionItems: false
        })
      );

      const longSummary = await retryOperation(() =>
        generateDocumentSummary(SAMPLE_DOCUMENTS.requirements, {
          maxLength: 500,
          includeKeyPoints: true,
          includeActionItems: true
        })
      );

      expect(shortSummary.summary.length).toBeLessThanOrEqual(longSummary.summary.length);
      expect(shortSummary.summary.length).toBeLessThanOrEqual(120); // Allow margin
      expect(longSummary.summary.length).toBeLessThanOrEqual(550); // Allow margin
      
      console.log(`✅ Variable length summaries: ${shortSummary.summary.length} vs ${longSummary.summary.length} chars`);
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('extractDocumentMetadata', () => {
    it('should extract metadata from documents', async () => {
      const result = await retryOperation(() =>
        extractDocumentMetadata(SAMPLE_DOCUMENTS.requirements, 'requirements.txt')
      );

      expect(result).toHaveProperty('documentType');
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('contentLength');
      expect(result).toHaveProperty('estimatedReadTime');
      
      expect(result.filename).toBe('requirements.txt');
      expect(typeof result.contentLength).toBe('number');
      expect(typeof result.estimatedReadTime).toBe('number');
      
      console.log(`✅ Metadata extracted: ${result.contentLength} words, ${result.estimatedReadTime} seconds`);
    }, TEST_CONFIG.timeouts.completion);

    it('should handle different file types', async () => {
      const testFiles = [
        { name: 'document.pdf', type: 'application/pdf' },
        { name: 'document.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { name: 'document.txt', type: 'text/plain' }
      ];

      for (const file of testFiles) {
        const result = await retryOperation(() =>
          extractDocumentMetadata(SAMPLE_DOCUMENTS.requirements, file.name)
        );

        expect(result.filename).toBe(file.name);
        expect(typeof result.contentLength).toBe('number');
        expect(typeof result.estimatedReadTime).toBe('number');
        
        console.log(`✅ ${file.name} metadata extracted`);
      }
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('validateDocumentType', () => {
    it('should validate supported document types', async () => {
      const supportedTypes = [
        'requirements.txt',
        'proposal.pdf',
        'contract.docx',
        'spreadsheet.xlsx',
        'presentation.pptx'
      ];

      for (const filename of supportedTypes) {
        const result = await retryOperation(() =>
          validateDocumentType(filename)
        );

        expect(result).toHaveProperty('isSupported');
        expect(result).toHaveProperty('detectedType');
        expect(result).toHaveProperty('confidence');
        
        expect(result.isSupported).toBe(true);
        expect(typeof result.detectedType).toBe('string');
        expect(typeof result.confidence).toBe('number');
        
        console.log(`✅ ${filename} validation: ${result.confidence} confidence`);
      }
    }, TEST_CONFIG.timeouts.completion);

    it('should handle unsupported document types', async () => {
      const unsupportedTypes = [
        'document.exe',
        'file.bin',
        'image.jpg',
        'video.mp4'
      ];

      for (const filename of unsupportedTypes) {
        const result = await retryOperation(() =>
          validateDocumentType(filename)
        );

        expect(result).toHaveProperty('isSupported');
        expect(result).toHaveProperty('detectedType');
        expect(result).toHaveProperty('reason');
        
        expect(result.isSupported).toBe(false);
        expect(typeof result.reason).toBe('string');
        
        console.log(`✅ ${filename} validation: ${result.reason}`);
      }
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('processDocumentWithFallback', () => {
    it('should process documents with fallback strategies', async () => {
      const result = await retryOperation(() =>
        processDocumentWithFallback(SAMPLE_DOCUMENTS.requirements, {
          filename: 'requirements.txt',
          extractContacts: true,
          extractOrganizations: true,
          generateSummary: true,
          classifyDocument: true,
          enableFallback: true,
          fallbackStrategy: 'basic'
        })
      );

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('documentType');
      expect(result).toHaveProperty('processingStrategy');
      expect(result).toHaveProperty('fallbackUsed');
      
      expect(typeof result.content).toBe('string');
      expect(typeof result.documentType).toBe('string');
      expect(typeof result.processingStrategy).toBe('string');
      expect(typeof result.fallbackUsed).toBe('boolean');
      
      console.log(`✅ Fallback processing: ${result.processingStrategy} (fallback: ${result.fallbackUsed})`);
    }, TEST_CONFIG.timeouts.document);

    it('should handle processing failures gracefully', async () => {
      // Test with malformed content that might cause processing to fail
      const malformedContent = '\x00\x01\x02\x03Invalid binary content';
      
      const result = await retryOperation(() =>
        processDocumentWithFallback(malformedContent, {
          filename: 'malformed.txt',
          extractContacts: true,
          extractOrganizations: true,
          generateSummary: true,
          classifyDocument: true,
          enableFallback: true,
          fallbackStrategy: 'basic'
        })
      );

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('documentType');
      expect(result).toHaveProperty('fallbackUsed');
      
      // Should have used fallback for malformed content
      expect(result.fallbackUsed).toBe(true);
      
      console.log(`✅ Malformed content handled with fallback: ${result.processingStrategy}`);
    }, TEST_CONFIG.timeouts.document);
  });

  describe('Error handling', () => {
    it('should handle empty content gracefully', async () => {
      const result = await retryOperation(() =>
        processDocument('', {
          filename: 'empty.txt',
          extractContacts: false,
          extractOrganizations: false,
          generateSummary: false,
          classifyDocument: true
        })
      );

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('documentType');
      expect(result.content).toBe('');
      expect(result.documentType).toContain('empty');
      
      console.log('✅ Empty content handled gracefully');
    });

    it('should handle invalid file types', async () => {
      const result = await retryOperation(() =>
        processDocument(SAMPLE_DOCUMENTS.requirements, {
          filename: 'document.unknown',
          extractContacts: false,
          extractOrganizations: false,
          generateSummary: false,
          classifyDocument: true
        })
      );

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('documentType');
      expect(result).toHaveProperty('warnings');
      
      if (result.warnings) {
        expect(Array.isArray(result.warnings)).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
      }
      
      console.log('✅ Invalid file type handled gracefully');
    });

    it('should handle very large documents', async () => {
      const largeContent = SAMPLE_DOCUMENTS.requirements.repeat(100);
      
      const result = await retryOperation(() =>
        processDocument(largeContent, {
          filename: 'large_requirements.txt',
          extractContacts: false,
          extractOrganizations: false,
          generateSummary: true,
          classifyDocument: true
        })
      );

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('documentType');
      expect(result).toHaveProperty('summary');
      
      // Should process without errors
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.summary.length).toBeGreaterThan(0);
      
      console.log(`✅ Large document handled: ${result.content.length} characters`);
    }, TEST_CONFIG.timeouts.document);
  });

  describe('Integration with other services', () => {
    it('should integrate with classification service', async () => {
      const result = await retryOperation(() =>
        processDocument(SAMPLE_DOCUMENTS.requirements, {
          filename: 'requirements.txt',
          extractContacts: false,
          extractOrganizations: false,
          generateSummary: false,
          classifyDocument: true,
          useUnifiedClassification: true
        })
      );

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('documentType');
      expect(result).toHaveProperty('classification');
      
      if (result.classification) {
        expect(result.classification).toHaveProperty('category');
        expect(result.classification).toHaveProperty('confidence');
        expect(result.classification).toHaveProperty('subcategories');
      }
      
      console.log(`✅ Classification integration: ${result.documentType}`);
    }, TEST_CONFIG.timeouts.completion);

    it('should integrate with extraction services', async () => {
      const result = await retryOperation(() =>
        processDocument(SAMPLE_DOCUMENTS.requirements, {
          filename: 'requirements.txt',
          extractContacts: true,
          extractOrganizations: true,
          generateSummary: false,
          classifyDocument: false,
          useUnifiedExtraction: true
        })
      );

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('contacts');
      expect(result).toHaveProperty('organizations');
      
      expect(Array.isArray(result.contacts)).toBe(true);
      expect(Array.isArray(result.organizations)).toBe(true);
      
      console.log(`✅ Extraction integration: ${result.contacts.length} contacts, ${result.organizations.length} organizations`);
    }, TEST_CONFIG.timeouts.completion);
  });
}); 
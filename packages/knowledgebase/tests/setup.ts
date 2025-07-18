// Jest setup file for knowledgebase package
import 'jest';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.BLOB_READ_WRITE_TOKEN = 'test_token';
process.env.OPENAI_API_KEY = 'test_openai_key';

// Global test utilities
declare global {
  var testUtils: {
    createMockFile: (name: string, content: string, type?: string) => File;
    createMockFileMetadata: (overrides?: any) => any;
    createMockSearchResult: (overrides?: any) => any;
  };
}

global.testUtils = {
  createMockFile: (name: string, content: string, type = 'application/pdf') => {
    const blob = new Blob([content], { type });
    const file = new File([blob], name, { type });
    
    // Mock additional properties
    Object.defineProperty(file, 'size', { value: content.length });
    Object.defineProperty(file, 'lastModified', { value: Date.now() });
    
    return file;
  },

  createMockFileMetadata: (overrides = {}) => ({
    filename: 'test-document.pdf',
    fileType: 'pdf',
    mimeType: 'application/pdf',
    size: 1024000,
    uploadedAt: new Date().toISOString(),
    organizationId: 'test-org-123',
    ...overrides,
  }),

  createMockSearchResult: (overrides = {}) => ({
    id: 'result-123',
    content: 'This is a test search result content.',
    similarity: 0.85,
    source: {
      fileId: 'file-123',
      filename: 'test-document.pdf',
      chunkIndex: 0,
    },
    metadata: {
      fileType: 'pdf',
      uploadedAt: new Date().toISOString(),
      extractedAt: new Date().toISOString(),
      highlights: ['test'],
    },
    ...overrides,
  }),
}; 
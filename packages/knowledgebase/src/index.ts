// Main exports for knowledgebase package
// Supports both standalone and composition modes

// Export all components
export { default as KnowledgebaseApp } from './components/KnowledgebaseApp';
export { default as DocumentUpload } from './components/DocumentUpload';
export { default as SearchInterface } from './components/SearchInterface';
export { default as DocumentViewer } from './components/DocumentViewer';
export { default as DocumentList } from './components/DocumentList';

// Export all services
export {
  DocumentService,
  TextExtractionService,
  EmbeddingService,
  SemanticAnalysisService,
  SearchService,
} from './lib/services';

// Export all types
export type {
  // Core types
  EntityType,
  FileType,
  ProcessingStatus,
  DataType,
  
  // Content types
  FileMetadata,
  ExtractedContent,
  ContentChunk,
  
  // Processing types
  ProcessingProgress,
  ProcessingResult,
  
  // Search types
  SearchQuery,
  SearchFilters,
  SearchResult,
  SearchResponse,
  
  // Analysis types
  SemanticSection,
  DocumentClassification,
  
  // Configuration types
  DocumentServiceConfig,
  EmbeddingServiceConfig,
  SearchServiceConfig,
  KnowledgebaseConfig,
  
  // API types
  UploadRequest,
  UploadResponse,
  ProcessingStatusResponse,
  
  // Component prop types
  DocumentUploadProps,
  SearchInterfaceProps,
  DocumentViewerProps,
  
  // Database types
  FileDataRecord,
  SectionRecord,
  VectorRecord,
  
  // Error types
  KnowledgebaseError,
  ValidationError,
  
  // Event types
  ProcessingEvent,
  SearchEvent,
} from './lib/types';

// Default export for easy standalone usage
export { default } from './components/KnowledgebaseApp';

// Package version and metadata
export const version = '0.1.0';
export const packageName = '@platform/knowledgebase';

// Utility functions for external integrations
export const createKnowledgebaseConfig = (overrides: Partial<any> = {}) => ({
  document: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedFileTypes: ['pdf', 'docx', 'txt', 'html', 'md'],
    chunkSize: 1000,
    chunkOverlap: 200,
    enableAutoProcessing: true,
    enableDeduplication: true,
  },
  embedding: {
    model: 'text-embedding-3-small',
    dimensions: 1536,
    batchSize: 100,
    maxRetries: 3,
    timeout: 30000,
  },
  search: {
    defaultLimit: 10,
    maxLimit: 100,
    defaultThreshold: 0.7,
    enableHybridSearch: true,
    enableCaching: true,
    cacheTimeout: 300000, // 5 minutes
  },
  ui: {
    theme: 'light' as const,
    showAdvancedFeatures: true,
    defaultPageSize: 20,
  },
  ...overrides,
});

// Helper function to validate entity types
export const isValidEntityType = (entityType: string): boolean => {
  const validTypes = ['knowledgebase', 'polysec', 'opportunity', 'proposal', 'organization'];
  return validTypes.includes(entityType);
};

// Helper function to validate file types
export const isValidFileType = (fileType: string): boolean => {
  const validTypes = ['pdf', 'docx', 'txt', 'html', 'md', 'csv', 'xlsx', 'pptx'];
  return validTypes.includes(fileType);
};

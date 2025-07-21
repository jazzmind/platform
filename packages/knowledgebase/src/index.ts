// Export main components for external use
export {
  DocumentUpload,
  DocumentList,
  DocumentPreview,
  DocumentViewer,
  SearchInterface,
  SearchResults,
  TextDiffViewer,
  KnowledgebaseApp,
} from './components';

// Export types for external use
export type {
  FileMetadata,
  ProcessingResult,
  SearchResult,
  EntityType,
  DocumentListProps,
  DocumentViewerProps,
  SearchInterfaceProps,
} from './lib/types';

// Export services for advanced usage
export { DocumentService } from './lib/services/DocumentService';
export { SearchService } from './lib/services/SearchService';
export { ProcessingService } from './lib/services/ProcessingService';

// Export AI utilities
export { MODELS, generateText } from './lib/ai';

// Export database client
export { prisma } from './lib/db';

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

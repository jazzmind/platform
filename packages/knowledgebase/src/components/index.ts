// Core UI components for knowledgebase
export { default as KnowledgebaseApp } from './KnowledgebaseApp';
export { default as DocumentUpload } from './DocumentUpload';
export { default as SearchInterface } from './SearchInterface';
export { default as DocumentViewer } from './DocumentViewer';
export { default as DocumentList } from './DocumentList';

// Re-export types for convenience
export type {
  DocumentUploadProps,
  SearchInterfaceProps,
  DocumentViewerProps,
  FileMetadata,
  SearchResult,
  SearchResponse,
} from '../lib/types';

// Enhanced components with improved UI and cross-package compatibility
export { DocumentUpload } from './DocumentUpload';
export { DocumentList } from './DocumentList';
export { DocumentPreview } from './DocumentPreview';
export { DocumentViewer } from './DocumentViewer';
export { SearchInterface } from './SearchInterface';
export { SearchResults } from './SearchResults';
export { TextDiffViewer } from './TextDiffViewer';
export { default as KnowledgebaseApp } from './KnowledgebaseApp';

// Re-export types for convenience
export type {
  DocumentUploadProps,
  SearchInterfaceProps,
  DocumentViewerProps,
  FileMetadata,
  SearchResult,
  SearchResponse,
} from '../lib/types';

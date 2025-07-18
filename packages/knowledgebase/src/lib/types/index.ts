// Core entity types
export type EntityType = 'knowledgebase' | 'polysec' | 'opportunity' | 'proposal' | 'organization';

export type FileType = 'pdf' | 'docx' | 'txt' | 'html' | 'md' | 'csv' | 'xlsx' | 'pptx';

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type DataType = 'extractedText' | 'chunk' | 'fileMetadata' | 'semanticSection';

// File and content interfaces
export interface FileMetadata {
  filename: string;
  fileType: FileType;
  mimeType: string;
  size: number;
  uploadedAt: string;
  uploadedBy?: string;
  organizationId: string;
}

export interface ExtractedContent {
  text: string;
  metadata: {
    title?: string;
    description?: string;
    author?: string;
    pages?: number;
    wordCount?: number;
    extractedAt: string;
    processingVersion?: string;
    // Additional metadata fields for different file types
    fileInfo?: {
      producer?: string;
      creator?: string;
      creationDate?: string;
    };
    warnings?: string[];
    encoding?: string;
    htmlElements?: {
      headings: number;
      paragraphs: number;
      links: number;
      images: number;
    };
    format?: string;
  };
}

export interface ContentChunk {
  id: string;
  content: string;
  chunkIndex: number;
  totalChunks: number;
  startOffset?: number;
  endOffset?: number;
  contentHash: string;
  metadata?: Record<string, unknown>;
}

// Processing and progress interfaces
export interface ProcessingProgress {
  stage: 'uploading' | 'extracting' | 'chunking' | 'embedding' | 'analyzing' | 'completing';
  current: number;
  total: number;
  message: string;
  percentage: number;
  estimatedTimeRemaining?: number;
}

export interface ProcessingResult {
  success: boolean;
  fileId: string;
  processingId: string;
  documentsProcessed: number;
  chunksCreated: number;
  embeddingsGenerated: number;
  sectionsIdentified: number;
  processingTime: number;
  error?: string;
}

// Search and embedding interfaces
export interface SearchQuery {
  query: string;
  entityType: EntityType;
  entityId: string;
  limit?: number;
  threshold?: number;
  filters?: SearchFilters;
}

export interface SearchFilters {
  fileTypes?: FileType[];
  dateRange?: {
    start: string;
    end: string;
  };
  tags?: string[];
  contentTypes?: DataType[];
}

export interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  source: {
    fileId: string;
    filename: string;
    chunkIndex?: number;
    sectionTitle?: string;
  };
  metadata: {
    fileType: FileType;
    uploadedAt: string;
    extractedAt: string;
    highlights?: string[];
  };
  context?: {
    before?: string;
    after?: string;
  };
}

export interface SearchResponse {
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
  query: string;
  suggestions?: string[];
  facets?: {
    fileTypes: Array<{ type: FileType; count: number }>;
    dates: Array<{ date: string; count: number }>;
  };
}

// Semantic analysis interfaces
export interface SemanticSection {
  id: string;
  title: string;
  content: string;
  keywords: string[];
  category?: string;
  confidence: number;
  order: number;
  metadata?: Record<string, unknown>;
}

export interface DocumentClassification {
  documentType: 'policy' | 'procedure' | 'specification' | 'reference' | 'template' | 'report' | 'other';
  confidence: number;
  reasoning: string;
  suggestedTags: string[];
  priority: 'high' | 'medium' | 'low';
  keyTopics: string[];
}

// Service configuration interfaces
export interface DocumentServiceConfig {
  maxFileSize: number;
  allowedFileTypes: FileType[];
  chunkSize: number;
  chunkOverlap: number;
  enableAutoProcessing: boolean;
  enableDeduplication: boolean;
}

export interface EmbeddingServiceConfig {
  model: string;
  dimensions: number;
  batchSize: number;
  maxRetries: number;
  timeout: number;
}

export interface SearchServiceConfig {
  defaultLimit: number;
  maxLimit: number;
  defaultThreshold: number;
  enableHybridSearch: boolean;
  enableCaching: boolean;
  cacheTimeout: number;
}

// API request/response interfaces
export interface UploadRequest {
  file: File;
  entityType: EntityType;
  entityId: string;
  organizationId: string;
  options?: {
    autoProcess?: boolean;
    tags?: string[];
    description?: string;
  };
}

export interface UploadResponse {
  success: boolean;
  fileId: string;
  processingId: string;
  message: string;
  estimatedProcessingTime?: number;
}

export interface ProcessingStatusResponse {
  processingId: string;
  status: ProcessingStatus;
  progress?: ProcessingProgress;
  result?: ProcessingResult;
  error?: {
    message: string;
    code: string;
    details?: Record<string, unknown>;
  };
}

// Component prop interfaces
export interface DocumentUploadProps {
  entityType: EntityType;
  entityId: string;
  organizationId: string;
  onUploadStart?: (fileId: string) => void;
  onUploadProgress?: (progress: ProcessingProgress) => void;
  onUploadComplete?: (result: ProcessingResult) => void;
  onUploadError?: (error: string) => void;
  maxFileSize?: number;
  allowedFileTypes?: FileType[];
  className?: string;
}

export interface SearchInterfaceProps {
  entityType: EntityType;
  entityId: string;
  organizationId: string;
  onResultSelect?: (result: SearchResult) => void;
  onSearch?: (query: string, results: SearchResult[]) => void;
  placeholder?: string;
  showFilters?: boolean;
  showSuggestions?: boolean;
  className?: string;
}

export interface DocumentViewerProps {
  fileId: string;
  organizationId: string;
  onClose?: () => void;
  showMetadata?: boolean;
  showSections?: boolean;
  enableSearch?: boolean;
  className?: string;
}

// Database record interfaces (matching Prisma schema)
export interface FileDataRecord {
  id: string;
  fileId: string;
  entityType: string;
  entityId: string;
  dataType: string;
  chunkIndex?: number;
  totalChunks?: number;
  content?: string;
  contentHash?: string;
  metadata?: Record<string, unknown>;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SectionRecord {
  id: string;
  sectionGroupId: string;
  entityType: string;
  entityId: string;
  type: string;
  title: string;
  content?: string;
  version: number;
  order: number;
  isActive: boolean;
  createdBy?: string;
  organizationId: string;
  createdAt: Date;
  modifiedAt: Date;
}

export interface VectorRecord {
  id: string;
  entityType: string;
  entityId: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
  contentHash?: string;
  vector: number[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Error interfaces
export interface KnowledgebaseError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  operation?: string;
}

export interface ValidationError extends KnowledgebaseError {
  field?: string;
  value?: unknown;
}

// Utility types
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Event types for real-time updates
export interface ProcessingEvent {
  type: 'progress' | 'complete' | 'error';
  processingId: string;
  data: ProcessingProgress | ProcessingResult | KnowledgebaseError;
  timestamp: string;
}

export interface SearchEvent {
  type: 'search' | 'result';
  query: string;
  results?: SearchResult[];
  timestamp: string;
}

// Service configurations
export interface EmbeddingServiceConfig {
  model: string;
  dimensions: number;
  batchSize: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface SearchServiceConfig {
  defaultLimit: number;
  maxLimit: number;
  similarityThreshold: number;
}

// Configuration and settings
export interface KnowledgebaseConfig {
  document: DocumentServiceConfig;
  embedding: EmbeddingServiceConfig;
  search: SearchServiceConfig;
  ui: {
    theme: 'light' | 'dark' | 'auto';
    showAdvancedFeatures: boolean;
    defaultPageSize: number;
  };
}

// All types are exported automatically with their interface declarations above 
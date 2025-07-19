// Prisma-based types (will be auto-generated later)
export enum FileType {
  PDF = 'PDF',
  DOCX = 'DOCX',
  TXT = 'TXT'
}

export enum ProcessingStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',  
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED'
}

export interface PolicyDocument {
  id: string;
  title: string;
  version?: string;
  uploadDate: Date;
  fileType: FileType;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  content: any; // JSON
  sections: any; // JSON
  status: ProcessingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityQuestion {
  id: string;
  question: string;
  category?: string;
  framework?: string;
  answer?: string;
  sources?: any; // JSON
  confidence?: number;
  documentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceFramework {
  id: string;
  name: string;
  requirements: any; // JSON
  controls: any; // JSON
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

// Document content structure
export interface DocumentContent {
  text: string;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    createdDate?: string;
    modifiedDate?: string;
    pageCount?: number;
  };
  images?: Array<{
    id: string;
    description?: string;
    base64?: string;
  }>;
}

// Document sections for search
export interface DocumentSection {
  id: string;
  title?: string;
  content: string;
  pageNumber?: number;
  startIndex: number;
  endIndex: number;
  level: number; // heading level (1-6)
}

// Document upload request
export interface DocumentUploadRequest {
  file: File;
  title?: string;
  version?: string;
}

// Document upload response
export interface DocumentUploadResponse {
  id: string;
  status: ProcessingStatus;
  message: string;
  fileUrl?: string;
}

// Document processing result
export interface DocumentProcessingResult {
  content: DocumentContent;
  sections: DocumentSection[];
  status: ProcessingStatus;
  error?: string;
}

// Document search filters
export interface DocumentSearchFilters {
  fileType?: FileType;
  status?: ProcessingStatus;
  dateFrom?: Date;
  dateTo?: Date;
  query?: string;
}

// Document with computed fields
export interface DocumentWithMetrics extends PolicyDocument {
  sectionsCount: number;
  questionsCount: number;
  lastModified: Date;
}

// File validation result
export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  fileType?: FileType;
  size: number;
} 
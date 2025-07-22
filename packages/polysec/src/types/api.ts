import { FileType, ProcessingStatus } from './document';

// API Response wrapper
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Document Upload API
export interface DocumentUploadApiRequest {
  file: File;
  title?: string;
  version?: string;
}

export interface DocumentUploadApiResponse {
  id: string;
  status: ProcessingStatus;
  message: string;
  fileUrl?: string;
}

// Question Processing API
export interface QuestionProcessingRequest {
  questions: string[];
  framework?: string;
  documentIds?: string[]; // Optional: limit to specific documents
}

export interface QuestionAnswer {
  question: string;
  answer: string;
  sources: string[]; // Array of "documentId:sectionId" references
  confidence: number; // 0-1 score
}

export interface QuestionProcessingResponse {
  answers: QuestionAnswer[];
  totalProcessed: number;
  processingTime: number; // milliseconds
}

// Compliance Analysis API
export interface ComplianceAnalysisRequest {
  framework: string; // "soc2", "iso27001", etc.
  scope: 'all_documents' | 'selected_documents';
  documentIds?: string[]; // Required if scope is 'selected_documents'
}

export interface ComplianceGap {
  requirement: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  recommendations: string[];
}

export interface ComplianceAnalysisResponse {
  coverage: number; // 0-1 percentage
  gaps: ComplianceGap[];
  recommendations: string[];
  totalRequirements: number;
  coveredRequirements: number;
  analysisDate: string;
}

// Document Search API
export interface DocumentSearchRequest {
  query?: string;
  fileType?: FileType;
  status?: ProcessingStatus;
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
  limit?: number;
  offset?: number;
}

export interface DocumentSearchResult {
  id: string;
  title: string;
  fileName: string;
  fileType: FileType;
  fileSize: number;
  fileUrl: string;
  status: ProcessingStatus;
  version?: string;
  uploadDate: string;
  sectionsCount: number;
  relevanceScore?: number; // For semantic search
}

export interface DocumentSearchResponse {
  documents: DocumentSearchResult[];
  total: number;
  hasMore: boolean;
}

// File Validation
export interface FileValidationResponse {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileType?: FileType;
  size: number;
  maxSizeAllowed: number;
}

// Document Processing Status
export interface ProcessingStatusResponse {
  id: string;
  status: ProcessingStatus;
  progress: number; // 0-100 percentage
  currentStep: string;
  error?: string;
  completedAt?: string;
} 
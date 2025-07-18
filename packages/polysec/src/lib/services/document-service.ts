import { FileType, ProcessingStatus } from '../../types';
import type { 
  DocumentUploadRequest, 
  DocumentUploadResponse, 
  FileValidationResult,
  PolicyDocument
} from '../../types';

// Phase 1: Mock database - will be replaced with Prisma in Phase 2
const mockDocuments = new Map<string, PolicyDocument>();
let documentCounter = 1;

export class DocumentService {
  
  // File validation constants
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt'];

  /**
   * Validates uploaded file
   */
  async validateFile(file: File): Promise<FileValidationResult> {
    const errors: string[] = [];
    
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      errors.push(`File size exceeds ${this.MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
    }
    
    // Check file extension
    let detectedFileType: FileType | undefined;
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        detectedFileType = FileType.PDF;
        break;
      case 'docx':
        detectedFileType = FileType.DOCX;
        break;
      case 'txt':
        detectedFileType = FileType.TXT;
        break;
      default:
        errors.push(`Unsupported file type: ${extension || 'unknown'}`);
    }
    
    // Check if file is empty
    if (file.size === 0) {
      errors.push('File is empty');
    }

    return {
      isValid: errors.length === 0,
      errors,
      fileType: detectedFileType,
      size: file.size
    };
  }

  /**
   * Mock file upload for Phase 1
   */
  async uploadFile(file: File): Promise<string> {
    // Phase 1: Return mock URL - will use Vercel blob in Phase 2
    return `https://mock-storage.example.com/files/${Date.now()}_${file.name}`;
  }

  /**
   * Processes uploaded document
   */
  async uploadDocument(request: DocumentUploadRequest): Promise<DocumentUploadResponse> {
    try {
      // Validate file
      const validation = await this.validateFile(request.file);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }

      // Upload to mock storage
      const fileUrl = await this.uploadFile(request.file);

      // Create document ID
      const documentId = `doc_${documentCounter++}`;

      // Create mock document record
      const document: PolicyDocument = {
        id: documentId,
        title: request.title || request.file.name,
        version: request.version,
        uploadDate: new Date(),
        fileType: validation.fileType!,
        fileName: request.file.name,
        fileSize: request.file.size,
        fileUrl,
        content: {
          text: `[${validation.fileType} Content Placeholder]\nThis is mock content for ${request.file.name}`,
          metadata: {
            title: request.title || request.file.name,
            createdDate: new Date().toISOString()
          }
        },
        sections: [
          {
            id: 'section_1',
            title: 'Introduction',
            content: `This is a mock section for ${request.file.name}`,
            startIndex: 0,
            endIndex: 100,
            level: 1
          }
        ],
        status: ProcessingStatus.COMPLETED, // Phase 1: immediate completion
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in mock database
      mockDocuments.set(documentId, document);

      return {
        id: documentId,
        status: ProcessingStatus.COMPLETED,
        message: 'Document uploaded and processed successfully (Phase 1 mock)',
        fileUrl
      };
    } catch (error) {
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets document by ID
   */
  async getDocument(id: string): Promise<PolicyDocument | null> {
    return mockDocuments.get(id) || null;
  }

  /**
   * Lists documents with optional filtering
   */
  async listDocuments(filters?: {
    status?: ProcessingStatus;
    fileType?: FileType;
    limit?: number;
    offset?: number;
  }): Promise<PolicyDocument[]> {
    let documents = Array.from(mockDocuments.values());
    
    // Apply filters
    if (filters?.status) {
      documents = documents.filter(doc => doc.status === filters.status);
    }
    
    if (filters?.fileType) {
      documents = documents.filter(doc => doc.fileType === filters.fileType);
    }

    // Apply pagination
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    
    return documents
      .sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime())
      .slice(offset, offset + limit);
  }

  /**
   * Deletes document
   */
  async deleteDocument(id: string): Promise<boolean> {
    return mockDocuments.delete(id);
  }

  /**
   * Gets processing status
   */
  async getProcessingStatus(id: string) {
    const document = mockDocuments.get(id);

    if (!document) {
      throw new Error('Document not found');
    }

    return {
      status: document.status,
      error: undefined // Phase 1: no errors in mock
    };
  }

  /**
   * Gets document count for dashboard
   */
  async getDocumentCount(): Promise<number> {
    return mockDocuments.size;
  }

  /**
   * Gets recent documents for dashboard
   */
  async getRecentDocuments(limit: number = 5): Promise<PolicyDocument[]> {
    return this.listDocuments({ limit });
  }
} 
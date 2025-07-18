import { NextRequest, NextResponse } from 'next/server';
import { DocumentService } from '../../../lib/services/document-service';
import { FileType, ProcessingStatus } from '../../../types';
import type { ApiResponse, DocumentSearchResponse, DocumentSearchResult } from '../../../types';

const documentService = new DocumentService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const fileType = searchParams.get('fileType') as FileType | null;
    const status = searchParams.get('status') as ProcessingStatus | null;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    // Get documents from service
    const documents = await documentService.listDocuments({
      fileType: fileType || undefined,
      status: status || undefined,
      limit,
      offset
    });

    // Transform to search results
    const searchResults: DocumentSearchResult[] = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      fileName: doc.fileName,
      fileType: doc.fileType,
      status: doc.status,
      uploadDate: doc.uploadDate.toISOString(),
      sectionsCount: Array.isArray(doc.sections) ? doc.sections.length : 0
    }));

    // Get total count for pagination
    const totalCount = await documentService.getDocumentCount();

    const response: DocumentSearchResponse = {
      documents: searchResults,
      total: totalCount,
      hasMore: (offset || 0) + (limit || 50) < totalCount
    };

    return NextResponse.json<ApiResponse<DocumentSearchResponse>>({
      success: true,
      data: response,
      message: 'Documents retrieved successfully'
    });

  } catch (error) {
    console.error('Documents list error:', error);
    
    return NextResponse.json<ApiResponse<never>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve documents'
    }, { status: 500 });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 
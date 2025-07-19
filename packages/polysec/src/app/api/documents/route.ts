import { NextRequest, NextResponse } from 'next/server';
import { PolicyDocumentService } from '../../../lib/services/document-service';
import { FileType, ProcessingStatus } from '../../../types';
import type { ApiResponse, DocumentSearchResponse, DocumentSearchResult } from '../../../types';

const policyService = new PolicyDocumentService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const fileType = searchParams.get('fileType') as FileType | null;
    const status = searchParams.get('status') as ProcessingStatus | null;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;
    const organizationId = searchParams.get('organizationId') || 'default-org';

    console.log(`📚 PolySec API: Fetching documents for organization ${organizationId}`);

    // Get documents from policy service
    const documents = await policyService.listDocuments(organizationId, {
      limit,
      offset
    });

    // Apply client-side filtering (since knowledgebase integration handles basic filtering)
    let filteredDocuments = documents;
    
    if (fileType) {
      filteredDocuments = filteredDocuments.filter(doc => doc.fileType === fileType);
    }
    
    if (status) {
      filteredDocuments = filteredDocuments.filter(doc => doc.status === status);
    }

    // Transform to search results
    const searchResults: DocumentSearchResult[] = filteredDocuments.map(doc => ({
      id: doc.id,
      title: doc.title,
      fileName: doc.fileName,
      fileType: doc.fileType,
      status: doc.status,
      uploadDate: doc.uploadDate.toISOString(),
      sectionsCount: Array.isArray(doc.sections) ? doc.sections.length : 0
    }));

    const response: DocumentSearchResponse = {
      documents: searchResults,
      total: filteredDocuments.length,
      hasMore: false // Simple implementation
    };

    console.log(`✅ PolySec API: Retrieved ${searchResults.length} documents`);

    return NextResponse.json<ApiResponse<DocumentSearchResponse>>({
      success: true,
      data: response,
      message: 'Policy documents retrieved successfully'
    });

  } catch (error) {
    console.error('PolySec documents list error:', error);
    
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
import { NextRequest, NextResponse } from 'next/server';
import { DocumentService } from '../../../../lib/services/document-service';
import type { ApiResponse, PolicyDocument } from '../../../../types';

const documentService = new DocumentService();

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Get document by ID
    const document = await documentService.getDocument(id);

    if (!document) {
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Document not found'
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<PolicyDocument>>({
      success: true,
      data: document,
      message: 'Document retrieved successfully'
    });

  } catch (error) {
    console.error('Document get error:', error);
    
    return NextResponse.json<ApiResponse<never>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve document'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Delete document
    const success = await documentService.deleteDocument(id);

    if (!success) {
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Document not found or could not be deleted'
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<{ id: string }>>({
      success: true,
      data: { id },
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Document delete error:', error);
    
    return NextResponse.json<ApiResponse<never>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete document'
    }, { status: 500 });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 
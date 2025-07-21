import { NextRequest, NextResponse } from 'next/server';
import { PolicyDocumentService } from '../../../../lib/services/document-service';
import type { ApiResponse, PolicyDocument } from '../../../../types';

const policyService = new PolicyDocumentService();

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || 'default-org';
    
    console.log(`📄 PolySec API: Fetching document ${id} for organization ${organizationId}`);
    
    // Get document by ID
    const document = await policyService.getDocument(id, organizationId);

    if (!document) {
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Policy document not found'
      }, { status: 404 });
    }

    console.log(`✅ PolySec API: Retrieved document ${document.title}`);

    return NextResponse.json<ApiResponse<PolicyDocument>>({
      success: true,
      data: document,
      message: 'Policy document retrieved successfully'
    });

  } catch (error) {
    console.error('PolySec document get error:', error);
    
    return NextResponse.json<ApiResponse<never>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve document'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || 'default-org';
    
    console.log(`🗑️ PolySec API: Deleting document ${id} for organization ${organizationId}`);
    
    // Delete document using policy service
    await policyService.deleteDocument(id, organizationId);

    console.log(`✅ PolySec API: Successfully deleted document ${id}`);

    return NextResponse.json<ApiResponse<{ documentId: string }>>({
      success: true,
      data: { documentId: id },
      message: 'Policy document deleted successfully'
    });

  } catch (error) {
    console.error('PolySec document delete error:', error);
    
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
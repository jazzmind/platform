import { NextRequest, NextResponse } from 'next/server';
import { PolicyDocumentService } from '../../../lib/services/document-service';
import { FileType, ProcessingStatus } from '../../../types';

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
    const entityType = searchParams.get('entityType') || 'polysec';
    const entityId = searchParams.get('entityId') || 'policy-database';

    console.log(`📚 PolySec API: Fetching documents for organization ${organizationId}`);

    // Get documents from policy service
    const policyDocuments = await policyService.listDocuments(organizationId, {
      limit,
      offset
    });

    // Apply client-side filtering
    let filteredDocuments = policyDocuments;
    
    if (fileType) {
      filteredDocuments = filteredDocuments.filter(doc => doc.fileType === fileType);
    }
    
    if (status) {
      filteredDocuments = filteredDocuments.filter(doc => doc.status === status);
    }

    // Transform to knowledgebase format
    const documents = filteredDocuments.map(doc => ({
      fileId: doc.id,
      metadata: {
        filename: doc.fileName || doc.title,
        fileType: doc.fileType,
        mimeType: `application/${doc.fileType}`,
        size: doc.fileSize || 0,
        uploadedAt: doc.uploadDate.toISOString(),
        organizationId,
      },
      uploadedAt: doc.uploadDate.toISOString(),
      title: doc.title,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize || 0,
      status: doc.status,
      version: doc.version,
    }));

    console.log(`✅ PolySec API: Retrieved ${documents.length} documents`);

    // Return in knowledgebase format
    return NextResponse.json({
      documents,
      total: documents.length,
      hasMore: false,
    });

  } catch (error) {
    console.error('PolySec documents list error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to retrieve documents',
      details: error instanceof Error ? error.message : 'Unknown error'
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
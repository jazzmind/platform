import { NextRequest, NextResponse } from 'next/server';
import { PolicyDocumentService } from '../../../../../lib/services/document-service';

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
    
    console.log(`📖 PolySec Preview API: Loading document ${id} for organization ${organizationId}`);
    
    // Get document by ID
    const document = await policyService.getDocument(id, organizationId);

    if (!document) {
      return NextResponse.json({
        error: 'Policy document not found'
      }, { status: 404 });
    }

    // Transform sections to the format expected by knowledgebase DocumentViewer
    const sections = (document.sections || []).map((section: any, index: number) => ({
      id: section.id || `section-${index}`,
      title: section.title || `Section ${index + 1}`,
      content: section.content || '',
      order: index,
      level: section.level || 1,
      startIndex: section.startIndex,
      endIndex: section.endIndex,
      pageNumber: section.pageNumber,
    }));

    // Transform document content to expected format
    const documentContent = {
      fileId: document.id,
      fileType: document.fileType,
      metadata: {
        filename: document.fileName || document.title,
        fileType: document.fileType,
        mimeType: `application/${document.fileType}`,
        size: document.fileSize || 0,
        uploadedAt: document.uploadDate.toISOString(),
        organizationId,
      },
      content: document.content?.text || document.content || 'No content available',
      sections,
      downloadUrl: document.fileUrl,
      wordCount: document.content?.text ? 
        document.content.text.split(/\s+/).filter((word: string) => word.length > 0).length : 
        undefined,
      chunkCount: sections.length,
    };

    console.log(`✅ PolySec Preview API: Retrieved document ${document.title} with ${sections.length} sections`);

    return NextResponse.json(documentContent);

  } catch (error) {
    console.error('PolySec document preview error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to load document preview'
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
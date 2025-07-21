import { NextRequest, NextResponse } from 'next/server';
import { PolicyDocumentService } from '../../../../lib/services/document-service';

const policyService = new PolicyDocumentService();

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const version = formData.get('version') as string;
    const organizationId = formData.get('organizationId') as string || 'default-org';
    const entityType = formData.get('entityType') as string || 'polysec';
    const entityId = formData.get('entityId') as string || 'default-polysec';

    // Validate required fields
    if (!file) {
      return NextResponse.json({
        error: 'No file provided'
      }, { status: 400 });
    }

    console.log(`📄 PolySec Upload: Processing ${file.name} for organization ${organizationId}`);

    // Upload document using policy service
    const result = await policyService.uploadDocument({
      file,
      title: title || undefined,
      version: version || undefined
    }, organizationId);

    console.log(`✅ PolySec Upload: Successfully processed ${file.name}`);

    // Transform to knowledgebase format
    const processingResult = {
      success: true,
      fileId: result.id,
      filename: file.name,
      fileType: file.name.split('.').pop()?.toLowerCase() || 'pdf',
      size: file.size,
      uploadedAt: new Date().toISOString(),
      status: 'processing',
      message: 'Document uploaded and processing started',
      metadata: {
        title: title || file.name,
        version: version || '1.0',
        organizationId,
        entityType,
        entityId,
      }
    };

    return NextResponse.json(processingResult);

  } catch (error) {
    console.error('PolySec document upload error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 
import { NextRequest, NextResponse } from 'next/server';
import { DocumentService } from '../../../../lib/services/DocumentService';

interface RouteParams {
  params: Promise<{
    fileId: string;
  }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { fileId } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || 'default-org';

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Delete API: Deleting document ${fileId} for org ${organizationId}`);

    const documentService = new DocumentService();
    await documentService.deleteDocument(fileId, organizationId);

    console.log(`✅ Delete API: Successfully deleted document ${fileId}`);

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });

  } catch (error) {
    console.error('Document deletion error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
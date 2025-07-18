import { NextRequest, NextResponse } from 'next/server';
import { DocumentService } from '../../../../lib/services/document-service';
import type { ApiResponse, DocumentUploadApiResponse } from '../../../../types';

const documentService = new DocumentService();

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const version = formData.get('version') as string;

    // Validate required fields
    if (!file) {
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }

    // Upload document
    const result = await documentService.uploadDocument({
      file,
      title: title || undefined,
      version: version || undefined
    });

    // Return success response
    return NextResponse.json<ApiResponse<DocumentUploadApiResponse>>({
      success: true,
      data: result,
      message: 'Document uploaded successfully'
    });

  } catch (error) {
    console.error('Document upload error:', error);
    
    return NextResponse.json<ApiResponse<never>>({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
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
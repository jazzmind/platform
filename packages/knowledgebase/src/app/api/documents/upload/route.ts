import { NextRequest, NextResponse } from 'next/server';
import { DocumentService } from '../../../../lib/services/DocumentService';
import type { EntityType } from '../../../../lib/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const entityType = formData.get('entityType') as EntityType || 'knowledgebase';
    const entityId = formData.get('entityId') as string || 'default';
    const organizationId = formData.get('organizationId') as string || 'default-org';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const documentService = new DocumentService();
    
    const result = await documentService.uploadDocument({
      file,
      entityType,
      entityId,
      organizationId,
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Document upload error:', error);
    
    return NextResponse.json(
      { 
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
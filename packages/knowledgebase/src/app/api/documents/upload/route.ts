import { NextRequest, NextResponse } from 'next/server';
import { ProcessingService } from '../../../../lib/services/ProcessingService';
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

    console.log(`🚀 Upload API: Starting full document processing for ${file.name}`);
    
    // Get file content as buffer  
    const fileContent = Buffer.from(await file.arrayBuffer());
    console.log(`📁 Upload API: File buffer created, size: ${fileContent.length} bytes`);
    
    // Use ProcessingService to handle full pipeline: upload → extract → chunk → embed
    const processingService = new ProcessingService();
    
    const result = await processingService.processDocument(
      fileContent,
      file.name,
      entityType,
      entityId,
      organizationId
    );
    
    console.log(`✅ Upload API: Processing completed for ${file.name}`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Document upload and processing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Upload and processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
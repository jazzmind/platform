import { NextRequest, NextResponse } from 'next/server';
import { DocumentService } from '../../../lib/services/DocumentService';
import type { EntityType } from '../../../lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') || 'knowledgebase';
    const entityId = searchParams.get('entityId') || 'default';
    const organizationId = searchParams.get('organizationId') || 'default-org';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const documentService = new DocumentService();
    
    const result = await documentService.listDocuments(
      entityType as EntityType,
      entityId,
      organizationId,
      {
        limit,
        offset,
      }
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('Document list error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to list documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
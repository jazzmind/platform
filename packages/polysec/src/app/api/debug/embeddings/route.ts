import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@platform/knowledgebase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || 'default-org';

    console.log(`🔍 Debug: Checking embeddings for organization ${organizationId}`);

    // Check what's in the database
    const fileDataCount = await prisma.fileData.count({
      where: {
        organizationId,
        entityType: 'polysec'
      }
    });

    const vectorCount = await prisma.vector.count({
      where: {
        entityType: 'polysec'
      }
    });

    const chunkCount = await prisma.fileData.count({
      where: {
        organizationId,
        entityType: 'polysec',
        dataType: 'chunk'
      }
    });

    const metadataCount = await prisma.fileData.count({
      where: {
        organizationId,
        entityType: 'polysec',
        dataType: 'fileMetadata'
      }
    });

    // Get sample data
    const sampleFiles = await prisma.fileData.findMany({
      where: {
        organizationId,
        entityType: 'polysec'
      },
      take: 5,
      select: {
        fileId: true,
        dataType: true,
        entityType: true,
        entityId: true,
        metadata: true
      }
    });

    const sampleVectors = await prisma.vector.findMany({
      where: {
        entityType: 'polysec'
      },
      take: 5,
      select: {
        id: true,
        entityType: true,
        entityId: true,
        sourceEntityType: true,
        sourceEntityId: true,
        metadata: true
      }
    });

    const debugInfo = {
      organizationId,
      counts: {
        totalFileData: fileDataCount,
        totalVectors: vectorCount,
        chunks: chunkCount,
        metadata: metadataCount
      },
      samples: {
        fileData: sampleFiles,
        vectors: sampleVectors
      },
      analysis: {
        hasDocuments: metadataCount > 0,
        hasChunks: chunkCount > 0,
        hasEmbeddings: vectorCount > 0,
        readyForSearch: vectorCount > 0 && chunkCount > 0
      }
    };

    console.log(`✅ Debug results:`, debugInfo);

    return NextResponse.json(debugInfo);

  } catch (error) {
    console.error('Debug embeddings error:', error);
    return NextResponse.json(
      { 
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
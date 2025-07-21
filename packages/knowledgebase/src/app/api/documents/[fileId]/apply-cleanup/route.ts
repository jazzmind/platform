import { NextRequest, NextResponse } from 'next/server';
import { TextExtractionService } from '../../../../../lib/services/TextExtractionService';
import { ChunkingService } from '../../../../../lib/services/ChunkingService';
import { EmbeddingService } from '../../../../../lib/services/EmbeddingService';
import { prisma } from '../../../../../lib/db';

interface RouteParams {
  params: Promise<{
    fileId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  console.log(`🔴 Apply Cleanup API: POST request received`);
  
  try {
    const { fileId } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || 'default-org';
    
    console.log(`🔴 Apply Cleanup API: fileId=${fileId}, organizationId=${organizationId}`);
    
    const { cleanedText } = await request.json();

    if (!fileId) {
      console.log(`🔴 Apply Cleanup API: Missing fileId`);
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    if (!cleanedText || typeof cleanedText !== 'string') {
      console.log(`🔴 Apply Cleanup API: Missing or invalid cleaned text`);
      return NextResponse.json(
        { error: 'Cleaned text is required' },
        { status: 400 }
      );
    }

    console.log(`💾 Apply Cleanup API: Saving cleaned text for document ${fileId}, text length: ${cleanedText.length}`);

    // Get file metadata
    const fileData = await prisma.fileData.findFirst({
      where: {
        fileId,
        organizationId,
        dataType: 'fileMetadata',
      },
    });

    if (!fileData) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get existing chunks to find their IDs for deletion
    const existingChunks = await prisma.fileData.findMany({
      where: {
        fileId,
        organizationId,
        dataType: 'chunk',
      },
      select: { id: true },
    });

    const chunkIds = existingChunks.map(chunk => chunk.id);
    console.log(`💾 Apply Cleanup API: Deleting ${chunkIds.length} existing chunks and vectors`);

    // Initialize services
    const chunkingService = new ChunkingService();
    const embeddingService = new EmbeddingService();

    // Create new chunks from cleaned text
    const extractedContent = {
      text: cleanedText,
      metadata: {
        title: (fileData.metadata as any)?.filename || 'AI-Cleaned Document',
        pages: 1,
        wordCount: cleanedText.split(/\s+/).length,
        extractedAt: new Date().toISOString(),
        format: 'ai-cleaned',
      },
    };

    const newChunks = await chunkingService.createChunks(
      extractedContent,
      fileId,
      'knowledgebase',
      'default'
    );

    console.log(`💾 Apply Cleanup API: Created ${newChunks.length} new chunks from cleaned text`);

    // Use transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // 1. Delete existing vectors for old chunks
      if (chunkIds.length > 0) {
        await tx.vector.deleteMany({
          where: {
            sourceEntityId: { in: chunkIds },
          },
        });
      }

      // 2. Delete existing chunks
      await tx.fileData.deleteMany({
        where: {
          fileId,
          organizationId,
          dataType: 'chunk',
        },
      });

      // 3. Save new chunks to database
      for (let i = 0; i < newChunks.length; i++) {
        const chunk = newChunks[i];
        
        await tx.fileData.create({
          data: {
            fileId,
            entityType: 'knowledgebase',
            entityId: 'default',
            dataType: 'chunk',
            organizationId,
            content: chunk.content,
            chunkIndex: i,
            metadata: {
              chunkId: chunk.id,
              wordCount: chunk.content.split(/\s+/).filter(word => word.length > 0).length,
              charCount: chunk.content.length,
              startOffset: chunk.startOffset || 0,
              endOffset: chunk.endOffset || chunk.content.length,
              aiCleaned: true, // Mark that this chunk was AI-cleaned
              cleanedAt: new Date().toISOString(),
            },
          },
        });
      }
    });

    // Generate new embeddings for the cleaned chunks
    console.log(`💾 Apply Cleanup API: Generating embeddings for ${newChunks.length} new chunks`);
    
    try {
      await embeddingService.generateEmbeddings(
        newChunks,
        'knowledgebase',
        'default',
        organizationId
      );
      console.log(`✅ Apply Cleanup API: Successfully generated embeddings`);
    } catch (embeddingError) {
      console.warn(`⚠️ Apply Cleanup API: Failed to generate embeddings, but chunks were saved:`, embeddingError);
      // Continue anyway - embeddings can be generated later
    }

    console.log(`✅ Apply Cleanup API: Successfully applied cleaned text for ${fileId}`);

    return NextResponse.json({
      success: true,
      data: {
        fileId,
        chunksCreated: newChunks.length,
        chunksDeleted: chunkIds.length,
        textLength: cleanedText.length,
        aiCleaned: true,
      },
      message: 'Cleaned text applied successfully',
    });

  } catch (error) {
    console.error('Apply Cleanup API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to apply cleaned text',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
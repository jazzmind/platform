import { NextRequest, NextResponse } from 'next/server';
import { DocumentService } from '../../../../../lib/services/DocumentService';
import { prisma } from '../../../../../lib/db';

/**
 * Reassemble chunks while removing overlapping text
 * Assumes chunks have ~200 character overlap as configured in ChunkingService
 */
function reassembleChunksWithoutOverlap(chunks: string[]): string {
  if (chunks.length === 0) return '';
  if (chunks.length === 1) return chunks[0];

  let result = chunks[0];
  
  for (let i = 1; i < chunks.length; i++) {
    const currentChunk = chunks[i];
    const overlapLength = Math.min(200, result.length, currentChunk.length);
    
    // Find the best overlap point by checking different overlap lengths
    let bestOverlap = 0;
    let bestScore = 0;
    
    for (let overlap = Math.min(50, overlapLength); overlap <= overlapLength; overlap++) {
      const endOfResult = result.slice(-overlap);
      const startOfCurrent = currentChunk.slice(0, overlap);
      
      // Calculate similarity score (simple character match)
      let score = 0;
      const minLength = Math.min(endOfResult.length, startOfCurrent.length);
      for (let j = 0; j < minLength; j++) {
        if (endOfResult[j] === startOfCurrent[j]) {
          score++;
        }
      }
      
      // Normalize score by length
      const normalizedScore = score / minLength;
      
      // Prefer longer overlaps if similarity is good (>70%)
      if (normalizedScore > 0.7 && overlap > bestOverlap) {
        bestOverlap = overlap;
        bestScore = normalizedScore;
      }
    }
    
    // If we found a good overlap, remove it; otherwise just append with separator
    if (bestOverlap > 0 && bestScore > 0.7) {
      result += currentChunk.slice(bestOverlap);
    } else {
      // No good overlap found, add with paragraph separator
      result += '\n\n' + currentChunk;
    }
  }
  
  return result;
}

interface RouteParams {
  params: Promise<{
    fileId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const documentService = new DocumentService();
    
    // Get document list to find the file
    const documentList = await documentService.listDocuments(
      'knowledgebase',
      'default', 
      organizationId,
      { limit: 1000 }
    );

    const document = documentList.documents.find(doc => doc.fileId === fileId);
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    console.log(`👁️ Preview API: Getting content for document ${fileId}`);

    // Get document chunks to reconstruct the content
    const chunks = await prisma.fileData.findMany({
      where: {
        fileId,
        organizationId,
        dataType: 'chunk',
      },
      orderBy: {
        chunkIndex: 'asc',
      },
    });

    console.log(`👁️ Preview API: Found ${chunks.length} chunks for document ${fileId}`);

    // Get the first chunk for preview (markdown formatted)
    const firstChunk = chunks.length > 0 ? chunks[0] : null;
    const previewContent = firstChunk ? firstChunk.content || '' : '';

    // Reconstruct the full text from chunks, removing overlap
    let fullText = '';
    if (chunks.length > 0) {
      fullText = reassembleChunksWithoutOverlap(chunks.map(chunk => chunk.content || ''));
    }

    // Return document preview data
    return NextResponse.json({
      fileId,
      filename: document.metadata.filename,
      fileType: document.metadata.fileType,
      fileSize: document.metadata.size,
      uploadedAt: document.uploadedAt,
      metadata: document.metadata,
      content: fullText,
      previewContent: previewContent, // First chunk with markdown formatting
      downloadUrl: (document.metadata as any).blobUrl, // URL for downloading original file
      chunkCount: chunks.length,
      previewAvailable: previewContent.length > 0,
      wordCount: fullText.split(/\s+/).filter(word => word.length > 0).length,
    });

  } catch (error) {
    console.error('Document preview error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get document preview',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
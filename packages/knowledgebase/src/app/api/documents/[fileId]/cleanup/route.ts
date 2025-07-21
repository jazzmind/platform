import { NextRequest, NextResponse } from 'next/server';
import { TextExtractionService } from '../../../../../lib/services/TextExtractionService';
import { prisma } from '../../../../../lib/db';

interface RouteParams {
  params: Promise<{
    fileId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    console.log(`🤖 AI Cleanup API: Processing document ${fileId}`);

    // Get the current document content
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

    // Get all chunks for this document to reconstruct full text
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

    console.log(`🤖 AI Cleanup API: Found ${chunks.length} chunks for document ${fileId}`);

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: 'No content found for document' },
        { status: 404 }
      );
    }

    // Reconstruct the full text from chunks (using content field directly)
    const originalText = chunks
      .map(chunk => chunk.content || '')
      .filter(content => content.trim().length > 0)
      .join('\n\n')
      .trim();

    console.log(`🤖 AI Cleanup API: Reconstructed text length: ${originalText.length} characters`);

    if (!originalText || originalText.length < 10) {
      return NextResponse.json(
        { 
          error: 'No meaningful text content found',
          details: `Found ${chunks.length} chunks but reconstructed text is too short (${originalText.length} chars)`
        },
        { status: 400 }
      );
    }

    // Use AI to clean up the text
    const textExtractionService = new TextExtractionService();
    const fileName = (fileData.metadata as any)?.filename || 'document';
    
    const cleanedText = await textExtractionService.cleanupTextWithAI(originalText, fileName);

    console.log(`✅ AI Cleanup API: Successfully cleaned up text for ${fileId}`);

    return NextResponse.json({
      success: true,
      data: {
        fileId,
        fileName,
        originalText,
        cleanedText,
        originalLength: originalText.length,
        cleanedLength: cleanedText.length,
      },
      message: 'Text cleanup completed successfully',
    });

  } catch (error) {
    console.error('AI Cleanup API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to cleanup document text',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
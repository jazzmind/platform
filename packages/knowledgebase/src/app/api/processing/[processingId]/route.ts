import { NextRequest, NextResponse } from 'next/server';
import { ProcessingService } from '../../../../lib/services/ProcessingService';

interface RouteParams {
  params: Promise<{
    processingId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { processingId } = await params;

    if (!processingId) {
      return NextResponse.json(
        { error: 'Processing ID is required' },
        { status: 400 }
      );
    }

    const processingService = new ProcessingService();
    const status = processingService.getProcessingStatus(processingId);

    if (!status) {
      return NextResponse.json(
        { error: 'Processing job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      processingId,
      status,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Processing status error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get processing status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
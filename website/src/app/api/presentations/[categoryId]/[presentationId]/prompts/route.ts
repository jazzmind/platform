import { NextRequest, NextResponse } from 'next/server';
import { readPromptsFile } from '../../../../../presentations/[categoryId]/[presentationId]/DynamicTab/PromptsReader';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string; presentationId: string }> }
) {
  try {
    const { categoryId, presentationId } = await params;
    
    // Read prompts from the file
    const prompts = await readPromptsFile(categoryId, presentationId);
    
    // Return the prompts as JSON
    return NextResponse.json(prompts);
  } catch (error) {
    console.error('Error in prompts API route:', error);
    return NextResponse.json(
      { error: 'Failed to load prompts' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string; presentationId: string }> }
) {
  try {
    const { categoryId, presentationId } = await params;
    
    // First try to read from public directory
    const publicDirPath = path.join(process.cwd(), 'public', categoryId, presentationId);
    let presentationPath = path.join(publicDirPath, 'presentation.md');
    let content = '';
    
    try {
      content = await fs.readFile(presentationPath, 'utf-8');
    } catch (err) {
      // If not found in public dir, try the legacy location
      console.log(`Presentation not found in public dir: ${presentationPath}, trying legacy location: ${err}`);
      
      try {
        presentationPath = path.join(process.cwd(), '..', categoryId, presentationId, 'presentation.md');
        content = await fs.readFile(presentationPath, 'utf-8');
      } catch (err) {
        console.error(`Presentation content not found at path: ${presentationPath}: ${err}`);
        // Return empty content if file not found
        return NextResponse.json({ content: '' });
      }
    }
    
    // Return the content
    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error in content API route:', error);
    return NextResponse.json(
      { error: 'Failed to load presentation content', content: '' },
      { status: 500 }
    );
  }
} 
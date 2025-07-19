import { NextRequest, NextResponse } from 'next/server';
import { TextExtractionService } from '../../../lib/services/TextExtractionService';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    console.log('🧪 API: Testing PDF extraction in Next.js environment');
    
    const service = new TextExtractionService();
    
    // Load the actual PDF file
    const pdfPath = join(process.cwd(), 'tests/Practera Modern Slavery Policy 2024.pdf');
    console.log(`📄 API: Loading PDF from: ${pdfPath}`);
    
    const pdfBuffer = readFileSync(pdfPath);
    console.log(`📄 API: PDF loaded - ${pdfBuffer.length} bytes`);
    
    // Extract text from the real PDF
    const result = await service.extractText(pdfBuffer, 'pdf', 'Practera Modern Slavery Policy 2024.pdf');
    
    console.log(`✅ API: Extraction completed`);
    console.log(`📊 API: Result - ${result.text.length} chars, ${result.metadata.wordCount} words, ${result.metadata.pages} pages`);
    console.log(`🔄 API: Processing version: ${result.metadata.processingVersion}`);
    
    // Check if we got real extraction (not fallback)
    const isRealExtraction = result.metadata.processingVersion === '1.0';
    
    // Check for expected content
    const hasExpectedContent = result.text.includes('Practera') && 
                               result.text.includes('modern slavery') && 
                               result.text.includes('human rights');
    
    const response = {
      success: true,
      extraction: {
        isRealExtraction,
        hasExpectedContent,
        processingVersion: result.metadata.processingVersion,
        textLength: result.text.length,
        wordCount: result.metadata.wordCount,
        pages: result.metadata.pages,
        textPreview: result.text.substring(0, 500),
        containsPractera: result.text.includes('Practera'),
        containsModernSlavery: result.text.includes('modern slavery'),
        containsHumanRights: result.text.includes('human rights'),
        containsForcedLabour: result.text.includes('forced labour'),
        containsHumanTrafficking: result.text.includes('human trafficking'),
        errorDetails: result.metadata.errorDetails || null,
        warnings: result.metadata.warnings || null,
      },
      message: isRealExtraction 
        ? '🎉 SUCCESS: Real PDF text extraction is WORKING!' 
        : '⚠️ Using fallback - PDF library has compatibility issues'
    };
    
    console.log(`📋 API: Response:`, response);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ API: PDF extraction test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorDetails: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.substring(0, 500) : 'No stack trace'
      },
      message: '❌ PDF extraction failed'
    }, { status: 500 });
  }
} 
import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    console.log('🧪 API: Testing PDF extraction with fileConversion.ts approach');
    
    // Load the actual PDF file
    const pdfPath = join(process.cwd(), 'tests/Practera Modern Slavery Policy 2024.pdf');
    console.log(`📄 API: Loading PDF from: ${pdfPath}`);
    
    const fileBuffer = readFileSync(pdfPath);
    console.log(`📄 API: PDF loaded - ${fileBuffer.length} bytes`);
    
    // Create a Blob from the buffer (simulating file upload)
    const file = new Blob([fileBuffer], { type: 'application/pdf' });
    
    // Use the exact same approach as fileConversion.ts
    const pdfData = new Uint8Array(await file.arrayBuffer());
    
    console.log('📄 API: Importing pdfjs-dist...');
    
    // Dynamic import PDF.js legacy build for Node.js compatibility
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    console.log('📄 API: Configuring PDF.js worker...');
    
    // For legacy build, use the relative worker path that works
    pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.mjs';
    
    console.log('📄 API: Loading PDF document...');
    
    // Configure PDF.js for server-side rendering
    const loadingTask = pdfjs.getDocument({ 
      data: pdfData,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    });
    
    const pdf = await loadingTask.promise;
    console.log(`📄 API: PDF loaded successfully - ${pdf.numPages} pages`);
    
    let textContent = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`📄 API: Processing page ${i}/${pdf.numPages}...`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ');
      
      if (pageText.trim()) {
        textContent += `# Page ${i}\n\n${pageText}\n\n`;
      }
    }
    
    console.log(`📄 API: Extracted ${textContent.length} characters total`);
    console.log(`📄 API: First 500 chars: "${textContent.substring(0, 500)}..."`);
    
    if (!textContent.trim()) {
      throw new Error('No text content extracted from PDF');
    }
    
    // Check for expected content
    const hasExpectedContent = textContent.includes('Practera') && 
                               textContent.includes('modern slavery') && 
                               textContent.includes('human rights');
    
    const response = {
      success: true,
      extraction: {
        isRealExtraction: true,
        hasExpectedContent,
        processingVersion: '1.0',
        textLength: textContent.length,
        pages: pdf.numPages,
        textPreview: textContent.substring(0, 500),
        containsPractera: textContent.includes('Practera'),
        containsModernSlavery: textContent.includes('modern slavery'),
        containsHumanRights: textContent.includes('human rights'),
        containsForcedLabour: textContent.includes('forced labour'),
        containsHumanTrafficking: textContent.includes('human trafficking'),
      },
      message: '🎉 SUCCESS: Real PDF text extraction is WORKING!'
    };
    
    console.log(`📋 API: Response:`, response);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ API: PDF extraction failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: '❌ PDF extraction failed'
    }, { status: 500 });
  }
} 
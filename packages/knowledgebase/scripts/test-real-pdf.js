const fs = require('fs');
const path = require('path');

// Test PDF extraction with real PDF file outside of Jest
async function testRealPdfExtraction() {
  console.log('🧪 Testing REAL PDF extraction outside of Jest...');
  
  try {
    // Load the actual PDF file
    const pdfPath = path.join(__dirname, '../tests/Practera Modern Slavery Policy 2024.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    console.log(`📄 PDF file loaded: ${pdfBuffer.length} bytes`);
    
    // Use the same approach as fileConversion.ts
    const pdfData = new Uint8Array(pdfBuffer);
    
    console.log('📄 Importing pdfjs-dist legacy build...');
    
    // Dynamic import PDF.js legacy build for Node.js
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    console.log('📄 Configuring PDF.js worker...');
    
    // For legacy build, use the relative worker path as suggested by the error
    pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.mjs';
    
    console.log('📄 Worker configuration:', pdfjs.GlobalWorkerOptions);
    
    console.log('📄 Loading PDF document...');
    
    // Configure PDF.js for server-side rendering - explicitly disable worker
    const loadingTask = pdfjs.getDocument({ 
      data: pdfData,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      disableWorker: true
    });
    
    const pdf = await loadingTask.promise;
    console.log(`📄 PDF loaded successfully - ${pdf.numPages} pages`);
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`📄 Processing page ${i}/${pdf.numPages}...`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map(item => item.str || '')
        .join(' ');
      
      if (pageText.trim()) {
        fullText += pageText + '\n\n';
      }
    }
    
    console.log(`📄 Extracted ${fullText.length} characters total`);
    console.log(`📄 First 500 chars: "${fullText.substring(0, 500)}..."`);
    
    // Check for the specific text from the PDF (case insensitive)
    const expectedText = "at practera, we are committed to upholding human rights and preventing modern slavery in all its forms";
    
    if (fullText.includes('Practera')) {
      console.log('✅ SUCCESS: Found "Practera" in extracted text!');
    } else {
      console.log('❌ ERROR: "Practera" not found in extracted text');
    }
    
    if (fullText.includes('modern slavery')) {
      console.log('✅ SUCCESS: Found "modern slavery" in extracted text!');
    } else {
      console.log('❌ ERROR: "modern slavery" not found in extracted text');
    }
    
    if (fullText.includes('human rights')) {
      console.log('✅ SUCCESS: Found "human rights" in extracted text!');
    } else {
      console.log('❌ ERROR: "human rights" not found in extracted text');
    }
    
    // Check for the specific paragraph
    const normalizedExtracted = fullText.replace(/\s+/g, ' ').toLowerCase();
    const normalizedExpected = expectedText.replace(/\s+/g, ' ').toLowerCase();
    
    // Check for the key phrase more flexibly
    if (normalizedExtracted.includes('at practera') && normalizedExtracted.includes('committed to upholding human rights')) {
      console.log('🎉 SUCCESS: Real PDF text extraction is WORKING!');
      console.log('✅ Found the expected text content from the PDF');
      return true;
    } else {
      console.log('❌ ERROR: Expected specific text not found');
      console.log(`📄 Looking for: "${normalizedExpected}"`);
      console.log(`📄 First 1000 chars found: "${normalizedExtracted.substring(0, 1000)}"`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ PDF extraction failed:', error);
    return false;
  }
}

// Run the test
testRealPdfExtraction()
  .then(success => {
    if (success) {
      console.log('\n🎉 MISSION ACCOMPLISHED: PDF text extraction is working!');
      process.exit(0);
    } else {
      console.log('\n❌ MISSION FAILED: PDF text extraction is not working');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Test failed with error:', error);
    process.exit(1);
  }); 
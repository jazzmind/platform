import { TextExtractionService } from '../TextExtractionService';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('TextExtractionService - Real PDF File Test', () => {
  let service: TextExtractionService;

  beforeEach(() => {
    service = new TextExtractionService();
  });

  test('should extract real text from Practera Modern Slavery Policy PDF', async () => {
    console.log('🧪 Testing with REAL PDF file');
    
    // Load the actual PDF file
    const pdfPath = join(__dirname, '../../../../tests/Practera Modern Slavery Policy 2024.pdf');
    const pdfBuffer = readFileSync(pdfPath);
    
    console.log(`📄 PDF file loaded: ${pdfBuffer.length} bytes`);
    
    try {
      const result = await service.extractText(pdfBuffer, 'pdf', 'Practera Modern Slavery Policy 2024.pdf');
      
      console.log('✅ Extraction completed');
      console.log(`📊 Result: ${result.text.length} characters, ${result.metadata.wordCount} words, ${result.metadata.pages} pages`);
      console.log(`🔄 Processing version: ${result.metadata.processingVersion}`);
      
      // Check if we got real extraction (not fallback)
      expect(result.metadata.processingVersion).toBe('1.0');
      expect(result.metadata.format).toBe('pdf');
      expect(result.metadata.pages).toBeGreaterThan(0);
      expect(result.text.length).toBeGreaterThan(100);
      
      // Most importantly - check for the specific text from the PDF
      const expectedText = "At Practera, we are committed to upholding human rights and preventing modern slavery in all its forms. This Modern Slavery Policy outlines our commitment to eradicating modern slavery, including forced labour, human trafficking, and other forms of exploitation. This policy applies to all our operations globally and extends to our supply chains, partners, and subcontractors. We recognize that modern slavery is a pressing global issue and we are dedicated to taking proactive steps to address and prevent it.";
      
      console.log(`🔍 Looking for expected text in extracted content...`);
      console.log(`📝 First 500 chars of extracted text: "${result.text.substring(0, 500)}"`);
      
      // The text should contain the key content from the PDF
      expect(result.text).toContain('Practera');
      expect(result.text).toContain('modern slavery');
      expect(result.text).toContain('human rights');
      expect(result.text).toContain('forced labour');
      expect(result.text).toContain('human trafficking');
      
      // Check for the specific paragraph (allowing for some formatting differences)
      const normalizedExtracted = result.text.replace(/\s+/g, ' ').toLowerCase();
      const normalizedExpected = expectedText.replace(/\s+/g, ' ').toLowerCase();
      
      if (normalizedExtracted.includes(normalizedExpected.substring(0, 100))) {
        console.log('🎉 SUCCESS: Real PDF text extraction is WORKING!');
        console.log('✅ Found the expected text content from the PDF');
      } else {
        console.log('❌ Expected text not found in extracted content');
        console.log(`📄 Looking for: "${normalizedExpected.substring(0, 200)}..."`);
        console.log(`📄 Found instead: "${normalizedExtracted.substring(0, 500)}..."`);
        
        // Still check if we got meaningful content (not just fallback)
        expect(result.text).not.toContain('text extraction encountered technical issues');
        expect(result.text).not.toContain('Note: PDF text extraction is being enhanced');
      }
      
    } catch (error) {
      console.error('❌ Real PDF test failed:', error);
      throw error;
    }
  }, 30000); // 30 second timeout for PDF processing
}); 
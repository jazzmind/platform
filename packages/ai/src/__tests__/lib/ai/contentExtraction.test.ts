import { extractContentFromFile, ExtractedContent } from '../../../lib/ai/contentExtraction';

// Mock pdfreader instead of pdf-parse2
const mockPdfReader = {
  parseBuffer: jest.fn()
};

jest.mock('pdfreader', () => ({
  PdfReader: jest.fn(() => mockPdfReader)
}));

// Setup default mock implementation
beforeEach(() => {
  jest.clearAllMocks();
  
  // Mock successful PDF parsing with proper page and text items
  mockPdfReader.parseBuffer.mockImplementation((buffer, callback) => {
    // First, send a page item
    callback(null, { page: 1 });
    // Then send text items for that page
    callback(null, { page: 1, text: 'Sample PDF content' });
    callback(null, { page: 1, text: ' extracted successfully' });
    callback(null, { page: 1, text: ' from the document.' });
    callback(null, { page: 1, text: ' This is a longer text' });
    callback(null, { page: 1, text: ' content that demonstrates' });
    callback(null, { page: 1, text: ' proper PDF parsing.' });
    // End of parsing
    callback(null, null);
  });
});

describe('Content Extraction', () => {
  describe('extractContentFromFile', () => {
    it('should extract PDF content successfully using pdfreader', async () => {
      const mockBuffer = Buffer.from('mock-pdf-content');
      
      const result: ExtractedContent = await extractContentFromFile(mockBuffer, 'pdf');
      
      expect(result.text).toContain('Sample PDF content');
      expect(result.text).toContain('extracted successfully');
      expect(result.metadata?.pages).toBe(1);
      expect(result.metadata?.title).toBe('PDF Document');
      expect(mockPdfReader.parseBuffer).toHaveBeenCalledWith(mockBuffer, expect.any(Function));
    });

    it('should handle PDF parsing errors gracefully', async () => {
      const mockBuffer = Buffer.from('invalid-pdf-content');
      
      // Mock pdfreader to throw an error for this test
      mockPdfReader.parseBuffer.mockImplementation((buffer, callback) => {
        callback(new Error('Invalid PDF format'), null);
      });
      
      const result: ExtractedContent = await extractContentFromFile(mockBuffer, 'pdf');
      
      expect(result.text).toContain('[PDF PROCESSING FAILED]');
      expect(result.text).toContain('Invalid PDF format');
      expect(result.metadata?.title).toContain('extraction failed');
    });

    it('should handle large PDF files', async () => {
      // Create a large buffer (>50MB)
      const largeBuffer = Buffer.alloc(60 * 1024 * 1024); // 60MB
      
      const result: ExtractedContent = await extractContentFromFile(largeBuffer, 'pdf');
      
      expect(result.text).toContain('[LARGE PDF UPLOADED');
      expect(result.text).toContain('60.00 MB');
      expect(result.metadata?.title).toBe('Large PDF Document');
    });

    it('should handle empty PDF (no text found)', async () => {
      const mockBuffer = Buffer.from('empty-pdf-content');
      
      // Mock PDF with no text content
      mockPdfReader.parseBuffer.mockImplementation((buffer, callback) => {
        callback(null, { page: 1 });
        // No text items, just end
        callback(null, null);
      });
      
      const result: ExtractedContent = await extractContentFromFile(mockBuffer, 'pdf');
      
      expect(result.text).toContain('[PDF UPLOADED - NO TEXT FOUND]');
      expect(result.metadata?.pages).toBe(1);
    });

    it('should handle text file extraction', async () => {
      const mockFile = new File(['Hello world content'], 'test.txt', { type: 'text/plain' });
      
      const result: ExtractedContent = await extractContentFromFile(mockFile, 'text');
      
      expect(result.text).toContain('Hello world content');
    });

    it('should handle unsupported file types', async () => {
      const mockBuffer = Buffer.from('unknown-content');
      
      await expect(extractContentFromFile(mockBuffer, 'unknown'))
        .rejects.toThrow('Unsupported file type: unknown');
    });
  });
}); 
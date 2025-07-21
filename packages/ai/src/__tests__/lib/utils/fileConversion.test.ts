import { convertToMarkdown, getMimeType } from '@/src/lib/utils/fileConversion';

// Mock PDF.js to avoid worker issues in tests
jest.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: jest.fn(() => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: jest.fn(() => Promise.resolve({
        getTextContent: jest.fn(() => Promise.resolve({
          items: [{ str: 'Test PDF content' }]
        }))
      }))
    })
  }))
}));

describe('fileConversion', () => {
  describe('getMimeType', () => {
    it('should detect PDF files correctly', () => {
      const pdfFile = new File([''], 'test.pdf', { type: 'application/pdf' });
      expect(getMimeType(pdfFile)).toBe('application/pdf');
    });

    it('should fall back to extension detection', () => {
      const pdfFile = new File([''], 'test.pdf', { type: '' });
      expect(getMimeType(pdfFile)).toBe('application/pdf');
    });
  });

  describe('convertToMarkdown', () => {
    it('should handle text files without worker issues', async () => {
      const textFile = new Blob(['Hello world'], { type: 'text/plain' });
      const result = await convertToMarkdown(textFile, 'text/plain');
      
      expect(result.content).toBe('Hello world');
      expect(result.format).toBe('markdown');
    });

    it('should handle PDF files with fallback on worker failure', async () => {
      const pdfFile = new Blob(['fake pdf data'], { type: 'application/pdf' });
      
      // This should not throw an error even if PDF processing fails
      const result = await convertToMarkdown(pdfFile, 'application/pdf');
      
      // Should return some content (either extracted text or fallback message)
      expect(result.content).toBeDefined();
      expect(result.format).toBe('markdown');
    });

    it('should handle markdown files', async () => {
      const markdownFile = new Blob(['# Hello\n\nThis is markdown'], { type: 'text/markdown' });
      const result = await convertToMarkdown(markdownFile, 'text/markdown');
      
      expect(result.content).toBe('# Hello\n\nThis is markdown');
      expect(result.format).toBe('markdown');
    });

    it('should throw error for unsupported types', async () => {
      const unsupportedFile = new Blob([''], { type: 'application/unknown' });
      
      await expect(convertToMarkdown(unsupportedFile, 'application/unknown'))
        .rejects.toThrow('Unsupported MIME type');
    });
  });
}); 
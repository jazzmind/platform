/**
 * Test wrapper for pdfjs-dist to handle ES module issues in Jest
 * Uses dynamic imports to avoid import.meta issues
 */

// Define the minimal interface we need for testing
export interface PDFDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPageProxy>;
}

export interface PDFPageProxy {
  getTextContent(): Promise<TextContent>;
}

export interface TextContent {
  items: Array<{ str: string }>;
}

export interface GlobalWorkerOptions {
  workerSrc: string;
}

// Create a wrapper that uses dynamic imports
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjs: any = null;

async function loadPdfjs() {
  if (!pdfjs) {
    try {
      // Use dynamic import to avoid ES module issues at parse time
      pdfjs = await import('pdfjs-dist');
      
      // Configure worker for Node.js environment
      if (pdfjs.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerSrc = '';
      }
    } catch (error) {
      console.warn('Failed to load pdfjs-dist, using mock implementation:', error);
      
      // Fallback mock implementation for testing
      pdfjs = {
        getDocument: jest.fn().mockImplementation(() => ({
          promise: Promise.resolve({
            numPages: 1,
            getPage: jest.fn().mockImplementation(() => Promise.resolve({
              getTextContent: jest.fn().mockImplementation(() => Promise.resolve({
                items: [
                  { str: 'Mock PDF content for testing' },
                  { str: 'This is a test document' }
                ]
              }))
            }))
          })
        })),
        GlobalWorkerOptions: {
          workerSrc: 'mock-worker.js'
        },
        version: '4.10.38'
      };
    }
  }
  return pdfjs;
}

// Export a function to get the document
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getDocument(src: any) {
  const pdfjsLib = await loadPdfjs();
  return pdfjsLib?.getDocument(src);
}

// Export GlobalWorkerOptions as a getter/setter
export const GlobalWorkerOptions = {
  get workerSrc() {
    return pdfjs?.GlobalWorkerOptions?.workerSrc || '';
  },
  set workerSrc(value: string) {
    if (pdfjs?.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = value;
    }
  }
};

// Export version
export const version = '4.10.38';

// Default export
export default {
  getDocument,
  GlobalWorkerOptions,
  version
}; 
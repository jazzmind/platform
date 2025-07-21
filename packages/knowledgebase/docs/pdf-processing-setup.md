# PDF Processing Setup Guide

This document explains how to configure PDF text extraction using `pdfjs-dist` in a Next.js environment. This setup overcomes common compatibility issues between PDF.js and Next.js webpack bundling.

## Overview

The solution extracts structured content from PDFs and converts it to markdown format using:
- `pdfjs-dist` legacy build for Node.js compatibility
- Custom webpack configuration to handle ES module issues
- DOM polyfills for server-side rendering
- TurndownService for HTML to markdown conversion

## Required Dependencies

Add these dependencies to your `package.json`:

```json
{
  "dependencies": {
    "pdfjs-dist": "^4.10.38",
    "turndown": "^7.2.0"
  },
  "devDependencies": {
    "@types/turndown": "^5.0.5"
  }
}
```

Install with:
```bash
npm install pdfjs-dist turndown @types/turndown
```

## Next.js Configuration

### 1. Webpack Configuration (`next.config.js`)

Add webpack externals configuration to handle the legacy build:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing config...
  
  // Configure webpack to handle pdfjs-dist legacy build
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Configure externals for server-side rendering
      config.externals = config.externals || [];
      config.externals.push({
        // Treat canvas as external to avoid server-side issues
        canvas: 'commonjs canvas',
      });
      
      // Handle pdfjs-dist legacy build imports
      config.resolve = config.resolve || {};
      config.resolve.alias = config.resolve.alias || {};
      
      // Don't try to bundle the legacy build - let it be dynamically imported
      config.externals.push(function ({ request }, callback) {
        if (request === 'pdfjs-dist/legacy/build/pdf.mjs') {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      });
    }
    
    return config;
  },
};

module.exports = nextConfig;
```

**Key Points:**
- Uses `externals` to prevent webpack from bundling the legacy build
- Treats `canvas` as external to avoid server-side rendering issues
- Only applies to server-side builds (`isServer` check)

## Implementation

### 2. DOM Polyfills

Add DOM polyfills for server-side environment before importing PDF.js:

```typescript
// Add necessary DOM polyfills for Node.js environment
if (typeof globalThis.DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor() {}
    static fromMatrix() { return new DOMMatrix(); }
  };
}

if (typeof globalThis.Path2D === 'undefined') {
  (globalThis as any).Path2D = class Path2D {
    constructor() {}
  };
}

if (typeof globalThis.CanvasGradient === 'undefined') {
  (globalThis as any).CanvasGradient = class CanvasGradient {};
}

if (typeof globalThis.CanvasPattern === 'undefined') {
  (globalThis as any).CanvasPattern = class CanvasPattern {};
}
```

**Why needed:** PDF.js expects browser DOM APIs that don't exist in Node.js

### 3. PDF.js Import and Worker Configuration

```typescript
// Use legacy build with webpack externals configuration
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

// Configure worker for legacy build
pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.mjs';

// Configure PDF.js for server-side
const loadingTask = pdfjs.getDocument({ 
  data: pdfData,
  useWorkerFetch: false,
  isEvalSupported: false,
  useSystemFonts: true
});
```

**Critical Details:**
- Must use **legacy build** (`pdfjs-dist/legacy/build/pdf.mjs`) to avoid ES module issues
- Worker path `'./pdf.worker.mjs'` works with the legacy build
- Server-side options disable features that don't work in Node.js

### 4. TurndownService Configuration

```typescript
import TurndownService from 'turndown';

const turndownService = new TurndownService({
  headingStyle: 'atx',           // Use # for headings
  bulletListMarker: '-',         // Use - for bullets
  codeBlockStyle: 'fenced',      // Use ``` for code blocks
  fence: '```',
  emDelimiter: '*',              // Use * for emphasis
  strongDelimiter: '**',         // Use ** for strong
  linkStyle: 'inlined'           // Inline links
});
```

## Complete Implementation Example

```typescript
import TurndownService from 'turndown';

export class TextExtractionService {
  private turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined'
    });
  }

  private async extractFromPDF(buffer: Buffer, filename: string) {
    try {
      // Add DOM polyfills (see section 2 above)
      
      const pdfData = new Uint8Array(buffer);
      
      // Import and configure PDF.js (see section 3 above)
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.mjs';
      
      const loadingTask = pdfjs.getDocument({ 
        data: pdfData,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      });
      
      const pdf = await loadingTask.promise;
      
      // Extract structured HTML content
      let htmlContent = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        
        htmlContent += `<div class="page" data-page="${i}">\n`;
        htmlContent += `<h1>Page ${i}</h1>\n`;
        
        // Process text items with basic structure detection
        let currentY = -1;
        let currentParagraph = '';
        
        for (const item of content.items) {
          const textItem = item as any;
          const text = textItem.str;
          
          if (!text.trim()) continue;
          
          const itemY = Math.round(textItem.transform[5]);
          
          if (currentY !== -1 && Math.abs(itemY - currentY) > 5) {
            if (currentParagraph.trim()) {
              htmlContent += this.formatTextAsHtml(currentParagraph.trim());
              currentParagraph = '';
            }
          }
          
          currentParagraph += (currentParagraph ? ' ' : '') + text;
          currentY = itemY;
        }
        
        if (currentParagraph.trim()) {
          htmlContent += this.formatTextAsHtml(currentParagraph.trim());
        }
        
        htmlContent += `</div>\n\n`;
      }
      
      // Convert HTML to markdown
      const markdownText = this.turndownService.turndown(htmlContent);
      
      return {
        text: markdownText,
        metadata: {
          title: filename,
          pages: pdf.numPages,
          wordCount: markdownText.split(/\s+/).length,
          extractedAt: new Date().toISOString(),
          processingVersion: '1.0',
          format: 'pdf',
        },
      };
      
    } catch (error) {
      // Handle errors with fallback
      console.error('PDF extraction failed:', error);
      throw error;
    }
  }

  private formatTextAsHtml(text: string): string {
    if (!text.trim()) return '';
    
    // Detect headings based on common patterns
    if (text.match(/^[A-Z\s]{3,}$/) && text.length < 100) {
      return `<h3>${text}</h3>\n`;
    }
    
    if (text.match(/^\d+\./) || text.match(/^[A-Za-z]\./)) {
      return `<li>${text}</li>\n`;
    }
    
    if (text.match(/^-\s/) || text.match(/^•\s/)) {
      return `<li>${text.substring(2)}</li>\n`;
    }
    
    return `<p>${text}</p>\n`;
  }
}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. "Object.defineProperty called on non-object"
**Cause:** Webpack trying to bundle the legacy build
**Solution:** Ensure webpack externals are configured correctly (see section 1)

#### 2. "DOMMatrix is not defined"
**Cause:** Missing DOM polyfills in Node.js environment
**Solution:** Add DOM polyfills before importing PDF.js (see section 2)

#### 3. "No GlobalWorkerOptions.workerSrc specified"
**Cause:** Worker not configured properly
**Solution:** Set `pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.mjs'`

#### 4. ES Module Import Errors
**Cause:** Using regular build instead of legacy build
**Solution:** Use `pdfjs-dist/legacy/build/pdf.mjs` import path

### Verification

Test your setup with this simple verification:

```typescript
// Create a test API endpoint
export async function GET() {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.mjs';
    
    return Response.json({ 
      success: true, 
      version: pdfjs.version,
      message: 'PDF.js loaded successfully' 
    });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
```

## Version Compatibility

This setup has been tested with:
- Next.js 15.4.1
- Node.js 18+
- pdfjs-dist 4.10.38
- turndown 7.2.0

## Performance Considerations

- PDF processing is CPU-intensive - consider implementing timeouts
- Large PDFs may require memory management
- Consider caching extracted content
- Use streaming for very large files

## Security Notes

- Validate PDF files before processing
- Set maximum file size limits
- Consider sandboxing PDF processing
- Be aware that malformed PDFs can cause memory issues

## Future Enhancements

Potential improvements to consider:
- OCR support for scanned PDFs
- Better structure detection (tables, lists, etc.)
- Image extraction
- Metadata preservation
- Multi-language support 
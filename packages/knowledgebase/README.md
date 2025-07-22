# @jazzmind/knowledgebase

A comprehensive document management and semantic search package designed for AI-powered knowledge bases. Built for dual-mode operation: standalone application or composable package for integration into larger platforms.

## Features

- 🔄 **Dual-Mode Design**: Works standalone or as composable components
- 📁 **Multi-Format Support**: PDF, DOCX, TXT, HTML, MD, and more
- 🔍 **Semantic Search**: AI-powered vector search with similarity matching
- 🧠 **Smart Processing**: Automatic text extraction, chunking, and analysis
- 🏢 **Multi-Tenant**: Organization-based data isolation
- 🎨 **Modern UI**: Beautiful, responsive interface with Tailwind CSS
- ⚡ **Real-Time**: Progress tracking and live search results
- 🔒 **Secure**: File encryption, access control, and audit logging

## Quick Start

> ℹ️ **Note:** For PDF processing setup, see the [PDF Processing Setup Guide](./docs/pdf-processing-setup.md) for complete configuration instructions.

### Standalone Mode

```tsx
import { KnowledgebaseApp } from '@jazzmind/knowledgebase';

export default function Page() {
  return (
    <KnowledgebaseApp
      entityType="polysec"
      entityId="policy-db"
      organizationId="your-org-id"
    />
  );
}
```

### Component Mode

```tsx
import { DocumentUpload, SearchInterface } from '@jazzmind/knowledgebase';

export default function MyApp() {
  const handleUploadComplete = (result) => {
    console.log('Document processed:', result);
  };

  const handleSearchResults = (query, results) => {
    console.log('Search results:', results);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <DocumentUpload
        entityType="polysec"
        entityId="policy-db"
        organizationId="your-org-id"
        onUploadComplete={handleUploadComplete}
        maxFileSize={100 * 1024 * 1024} // 100MB
        allowedFileTypes={['pdf', 'docx', 'txt']}
      />
      
      <SearchInterface
        entityType="polysec"
        entityId="policy-db"
        organizationId="your-org-id"
        onSearch={handleSearchResults}
        showFilters={true}
        showSuggestions={true}
      />
    </div>
  );
}
```

### Service Integration

```tsx
import { DocumentService, SearchService } from '@jazzmind/knowledgebase';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const docService = new DocumentService(prisma);
const searchService = new SearchService(prisma);

// Upload and process a document
const uploadResult = await docService.uploadDocument({
  file: fileObject,
  entityType: 'polysec',
  entityId: 'policy-db',
  organizationId: 'your-org-id',
  options: {
    autoProcess: true,
    tags: ['security', 'policy'],
  },
});

// Search documents
const searchResults = await searchService.search('data protection', {
  entityType: 'polysec',
  entityId: 'policy-db',
  limit: 10,
  threshold: 0.7,
});
```

## Setup & Configuration

### Prerequisites

- Node.js 18+
- Next.js 15.4.1+
- PostgreSQL (for vector storage)
- Vercel Blob Storage (for file storage)

### Installation

```bash
npm install @jazzmind/knowledgebase
```

### Required Dependencies

The package requires several peer dependencies:

```bash
npm install pdfjs-dist turndown @types/turndown
```

### Next.js Configuration

> 🚨 **Important:** PDF processing requires specific webpack configuration for Next.js compatibility.

Add to your `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        canvas: 'commonjs canvas',
      });
      
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

### Environment Variables

```bash
# Required
DATABASE_URL="postgresql://..."
BLOB_READ_WRITE_TOKEN="vercel_blob_token"
OPENAI_API_KEY="sk-..."

# Optional
NEXT_PUBLIC_APP_NAME="My Knowledge Base"
MAX_FILE_SIZE="104857600" # 100MB
```

### Database Setup

Run Prisma migrations:

```bash
npx prisma generate
npx prisma db push
```

### Complete Setup Guide

For detailed PDF processing configuration, troubleshooting, and advanced setup options, see:

📚 **[PDF Processing Setup Guide](./docs/pdf-processing-setup.md)**

This guide covers:
- Webpack configuration details
- DOM polyfills for server-side rendering
- Worker configuration
- Common issues and solutions
- Performance optimization

## Architecture

The knowledgebase follows a layered architecture designed for flexibility and scalability:

```
┌─────────────────────────────────────┐
│           Web Interface             │
├─────────────────────────────────────┤
│            Service Layer            │
├─────────────────────────────────────┤
│          Processing Layer           │
├─────────────────────────────────────┤
│           Storage Layer             │
└─────────────────────────────────────┘
```

### Core Components

- **DocumentService**: File upload, storage, and lifecycle management
- **TextExtractionService**: Content extraction from multiple file formats
- **EmbeddingService**: Vector generation and similarity search
- **SemanticAnalysisService**: AI-powered content analysis and sectioning
- **SearchService**: Hybrid search with ranking and filtering

### Data Storage

- **Vercel Blob Storage**: Secure file storage with encryption
- **FileData Table**: Metadata, chunks, and extracted content
- **Vector Index**: Embeddings for semantic search
- **Sections Table**: Structured content analysis

## Components

### KnowledgebaseApp

Main application component for standalone mode.

```tsx
interface KnowledgebaseAppProps {
  entityType?: string;
  entityId?: string;
  organizationId?: string;
  className?: string;
}
```

### DocumentUpload

Drag-and-drop file upload with progress tracking.

```tsx
interface DocumentUploadProps {
  entityType: EntityType;
  entityId: string;
  organizationId: string;
  onUploadStart?: (fileId: string) => void;
  onUploadProgress?: (progress: ProcessingProgress) => void;
  onUploadComplete?: (result: ProcessingResult) => void;
  onUploadError?: (error: string) => void;
  maxFileSize?: number;
  allowedFileTypes?: FileType[];
  className?: string;
}
```

### SearchInterface

Semantic search with filters and suggestions.

```tsx
interface SearchInterfaceProps {
  entityType: EntityType;
  entityId: string;
  organizationId: string;
  onResultSelect?: (result: SearchResult) => void;
  onSearch?: (query: string, results: SearchResult[]) => void;
  placeholder?: string;
  showFilters?: boolean;
  showSuggestions?: boolean;
  className?: string;
}
```

### DocumentViewer

Full-featured document viewer with search and navigation.

```tsx
interface DocumentViewerProps {
  fileId: string;
  organizationId: string;
  onClose?: () => void;
  showMetadata?: boolean;
  showSections?: boolean;
  enableSearch?: boolean;
  className?: string;
}
```

### DocumentList

Document library with management actions.

```tsx
interface DocumentListProps {
  entityType: string;
  entityId: string;
  organizationId: string;
  refreshKey?: number;
  className?: string;
  onDocumentSelect?: (fileId: string) => void;
  onDocumentDelete?: (fileId: string) => void;
}
```

## Configuration

### Environment Variables

```bash
# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=your_blob_token

# OpenAI for embeddings and analysis
OPENAI_API_KEY=your_openai_key

# Database
DATABASE_URL=your_database_url
```

### Configuration Object

```tsx
import { createKnowledgebaseConfig } from '@jazzmind/knowledgebase';

const config = createKnowledgebaseConfig({
  document: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedFileTypes: ['pdf', 'docx', 'txt', 'html', 'md'],
    chunkSize: 1000,
    chunkOverlap: 200,
    enableAutoProcessing: true,
    enableDeduplication: true,
  },
  embedding: {
    model: 'text-embedding-3-small',
    dimensions: 1536,
    batchSize: 100,
    maxRetries: 3,
    timeout: 30000,
  },
  search: {
    defaultLimit: 10,
    maxLimit: 100,
    defaultThreshold: 0.7,
    enableHybridSearch: true,
    enableCaching: true,
    cacheTimeout: 300000,
  },
});
```

## API Reference

### Upload Document

```http
POST /api/documents/upload
Content-Type: multipart/form-data

{
  "file": File,
  "entityType": "polysec",
  "entityId": "policy-db",
  "organizationId": "org-123"
}
```

### Search Documents

```http
POST /api/search
Content-Type: application/json

{
  "query": "data protection policy",
  "entityType": "polysec",
  "entityId": "policy-db",
  "limit": 10,
  "threshold": 0.7
}
```

### Processing Status

```http
GET /api/processing/{processingId}/status

{
  "status": "processing",
  "progress": {
    "stage": "embedding",
    "current": 3,
    "total": 5,
    "message": "Generating embeddings...",
    "percentage": 60
  }
}
```

## Integration Examples

### PolySec Integration

```tsx
import { DocumentUpload, SearchInterface } from '@jazzmind/knowledgebase';

export default function PolicyManager() {
  return (
    <div className="policy-manager">
      <h1>Security Policy Management</h1>
      
      <DocumentUpload
        entityType="polysec"
        entityId="policy-database"
        organizationId="your-org"
        onUploadComplete={(result) => {
          console.log('Policy document uploaded:', result);
        }}
      />
      
      <SearchInterface
        entityType="polysec"
        entityId="policy-database"
        organizationId="your-org"
        placeholder="Search security policies..."
        showFilters={true}
        onSearch={(query, results) => {
          console.log(`Found ${results.length} policies for: ${query}`);
        }}
      />
    </div>
  );
}
```

### ProposalHub Integration

```tsx
import { DocumentService, SearchService } from '@jazzmind/knowledgebase';

// Service-level integration
export class ProposalKnowledgeManager {
  constructor(private docService: DocumentService, private searchService: SearchService) {}
  
  async addProposalDocument(proposalId: string, file: File) {
    return this.docService.uploadDocument({
      file,
      entityType: 'proposal',
      entityId: proposalId,
      organizationId: 'your-org',
    });
  }
  
  async searchProposalContent(proposalId: string, query: string) {
    return this.searchService.search(query, {
      entityType: 'proposal',
      entityId: proposalId,
      limit: 5,
    });
  }
}
```

## Development

### Prerequisites

- Node.js 18+
- TypeScript 5+
- Next.js 15+
- Prisma ORM
- Tailwind CSS

### Installation

```bash
cd platform/packages/knowledgebase
npm install
```

### Development Server

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Type Checking

```bash
npm run type-check
```

## 🚀 Ready for Parallel Development

**The knowledgebase package is ready for integration TODAY!** PolySec and other projects can start building immediately while we continue enhancing the underlying functionality.

### Current Status: MVP Complete ✅

**What Works Right Now:**
- ✅ Full UI component library (upload, search, document management)
- ✅ Real file upload and storage to Vercel blob
- ✅ Document metadata management
- ✅ Complete TypeScript integration
- ✅ Mock data for rapid UI development

**What's Coming Soon:**
- 🔄 Real text extraction (PDF, DOCX, TXT processing)
- 🔄 Database-backed search functionality  
- 🔄 Document content viewing
- 📅 AI-powered semantic search
- 📅 Vector embeddings and similarity matching

### Start Building Today

```tsx
// This works immediately for PolySec:
import { DocumentUpload, SearchInterface } from '@jazzmind/knowledgebase';

export default function PolicyManager() {
  return (
    <div>
      {/* Real file upload - works now */}
      <DocumentUpload
        entityType="polysec"
        entityId="policy-database"
        organizationId="your-org"
        onUploadComplete={(result) => {
          // File is actually uploaded and stored
          console.log('Policy uploaded:', result.fileId);
        }}
      />
      
      {/* Functional search UI - enhanced over time */}
      <SearchInterface
        entityType="polysec"
        entityId="policy-database"
        organizationId="your-org"
        onSearch={(query, results) => {
          // Mock results now, real search soon
          updatePolicyResults(results);
        }}
      />
    </div>
  );
}
```

## Development Roadmap

### Phase 1: MVP Foundation ✅ **COMPLETE**
- [x] Document upload and storage
- [x] Component architecture  
- [x] UI library complete
- [x] TypeScript definitions
- [x] **Ready for integration**

### Phase 2: Core Processing 🚧 **IN PROGRESS**
- [ ] Real text extraction implementation
- [ ] Database text search
- [ ] Document content display
- [ ] Processing progress tracking
- [ ] **Enhances existing features without breaking changes**

### Phase 3: AI-Powered Features 📅 **PLANNED**
- [ ] OpenAI embeddings integration
- [ ] Vector similarity search
- [ ] Semantic content analysis
- [ ] Intelligent answer generation
- [ ] **Backward compatible upgrades**

### Phase 4: Enterprise Features 📅 **FUTURE**
- [ ] Advanced analytics and reporting
- [ ] Multi-language support
- [ ] OCR for scanned documents
- [ ] Real-time collaboration
- [ ] **Production-scale enhancements**

## Integration Strategy

### Immediate Benefits (Phase 1)
- Complete UI framework for document management
- Real file storage and metadata handling
- Full TypeScript support and type safety
- Mock data allows rapid frontend development

### Progressive Enhancement (Phase 2+)
- Mock search → Database search → Vector search
- Static content → Extracted content → AI-analyzed content
- Basic features → Advanced features
- **Zero breaking changes between phases**

## Contributing

1. Follow the existing code style and patterns
2. Add comprehensive type definitions
3. Include tests for new functionality
4. Update documentation for API changes
5. Test both standalone and composition modes

## License

This package is part of the Platform project and follows the same licensing terms.

---

Built with ❤️ for modern document management and AI-powered search.

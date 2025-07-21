// Core services for knowledgebase functionality
// Note: Some services may require external Prisma client with proper schema

// Export types
export * from '../types';

// Export real services
export { DocumentService } from './DocumentService';
export { ProcessingService } from './ProcessingService';
export { SearchService } from './SearchService';
export { TextExtractionService } from './TextExtractionService';
export { EmbeddingService } from './EmbeddingService';
export { ChunkingService } from './ChunkingService'; 
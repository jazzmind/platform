// Real knowledgebase service integration
import { 
  ProcessingService,
  DocumentService,
  SearchService,
  prisma,
  type EntityType,
  type ProcessingResult,
  type SearchResult,
  MODELS,
  generateText
} from '@jazzmind/knowledgebase';
import { PolicyDocument, DocumentUploadRequest, DocumentUploadResponse, ProcessingStatus } from '../../types';

export class PolicyDocumentService {
  private readonly entityType: EntityType = 'polysec';
  private readonly entityId = 'policy-database';
  private processingService: ProcessingService;
  private documentService: DocumentService;
  private searchService: SearchService;

  constructor() {
    // Initialize real knowledgebase services
    this.processingService = new ProcessingService(prisma);
    this.documentService = new DocumentService(prisma);
    this.searchService = new SearchService(prisma);
  }

  /**
   * Upload and process a policy document using real knowledgebase processing
   */
  async uploadDocument(request: DocumentUploadRequest, organizationId: string = 'default-org'): Promise<DocumentUploadResponse> {
    try {
      console.log(`🔒 PolicyDocumentService: Processing ${request.file.name} with REAL knowledgebase services`);
      
      // Convert File to Buffer for knowledgebase processing
      const fileBuffer = Buffer.from(await request.file.arrayBuffer());
      
      // Use REAL ProcessingService for full AI-powered pipeline:
      // - Text extraction (PDF, DOCX, TXT)
      // - Content chunking
      // - Vector embedding generation  
      // - Database storage
      const result: ProcessingResult = await this.processingService.processDocument(
        fileBuffer,
        request.file.name,
        this.entityType,
        this.entityId,
        organizationId
      );

      console.log(`✅ PolicyDocumentService: REAL processing completed:`, result);

      return {
        id: result.fileId || `policy-${Date.now()}`,
        status: result.success ? ProcessingStatus.COMPLETED : ProcessingStatus.FAILED,
        message: result.success 
          ? `Policy document processed with AI: ${result.chunksCreated || 0} sections, ${result.embeddingsGenerated || 0} embeddings created.`
          : `AI processing failed: ${result.error}`,
        fileUrl: result.fileId || undefined
      };

    } catch (error) {
      console.error('Real policy document processing failed:', error);
      
      // More detailed error handling
      if (error && typeof error === 'object' && 'code' in error) {
        const knowledgebaseError = error as any;
        console.error(`❌ ProcessingService error details:`, {
          code: knowledgebaseError.code,
          message: knowledgebaseError.message,
          details: knowledgebaseError.details,
          operation: knowledgebaseError.operation,
          timestamp: knowledgebaseError.timestamp
        });
        throw new Error(`Document processing failed [${knowledgebaseError.code}]: ${knowledgebaseError.message}`);
      }
      
      throw new Error(`AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all policy documents using real DocumentService
   */
  async listDocuments(organizationId: string = 'default-org', options?: {
    limit?: number;
    offset?: number;
  }): Promise<PolicyDocument[]> {
    try {
      console.log(`📚 PolicyDocumentService: Fetching REAL documents from database for ${organizationId}`);
      
      const result = await this.documentService.listDocuments(
        this.entityType,
        this.entityId,
        organizationId,
        {
          limit: options?.limit || 50,
          offset: options?.offset || 0
        }
      );

      console.log(`✅ PolicyDocumentService: Found ${result.documents?.length || 0} REAL documents in database`);

      // Transform knowledgebase FileData to PolicyDocument format
      return (result.documents || []).map(doc => this.transformToPolicy(doc));

    } catch (error) {
      console.error('Failed to list real policy documents:', error);
      return [];
    }
  }

  /**
   * Get a specific policy document using real DocumentService
   */
  async getDocument(id: string, organizationId: string = 'default-org'): Promise<PolicyDocument | null> {
    try {
      console.log(`📄 PolicyDocumentService: Getting REAL document ${id} from database`);
      
      // Since DocumentService doesn't have getDocumentDetails, we list all and filter
      // This could be optimized with a direct query method later
      const result = await this.documentService.listDocuments(
        this.entityType,
        this.entityId,
        organizationId,
        { limit: 1000 } // Get all to find the specific one
      );

      const document = result.documents?.find(doc => doc.fileId === id);
      if (!document) {
        console.log(`❌ PolicyDocumentService: Document ${id} not found in database`);
        return null;
      }
      
      console.log(`✅ PolicyDocumentService: Found REAL document ${id}: ${document.metadata.filename || 'Unknown'}`);
      
      // Get the full document with content from chunks
      const policyDoc = this.transformToPolicy(document);
      
      // Load real content from chunks
      const contentData = await this.getDocumentContent(id, organizationId);
      
      // Update the policy document with real content
      policyDoc.content.text = contentData.fullText;
      policyDoc.sections = contentData.sections;
      
      return policyDoc;
    } catch (error) {
      console.error('Failed to get real policy document:', error);
      return null;
    }
  }

  /**
   * Search policy documents using REAL semantic search with pgvector
   */
  async searchPolicies(
    query: string, 
    organizationId: string = 'default-org',
    options?: {
      limit?: number;
      threshold?: number;
    }
  ): Promise<SearchResult[]> {
    try {
      console.log(`🔍 PolicyDocumentService: REAL semantic search for: "${query}"`);
      console.log(`🔍 Search parameters: entityType="${this.entityType}", entityId="${this.entityId}", organizationId="${organizationId}"`);
      console.log(`🔍 Search options:`, options);
      
      // Use REAL SearchService with pgvector similarity search
      const results = await this.searchService.search(
        query,
        this.entityType,
        this.entityId,
        {
          limit: options?.limit || 10,
          threshold: options?.threshold || 0.7,
          organizationId,
          includeMetadata: true
        }
      );

      console.log(`✅ PolicyDocumentService: REAL search found ${results.length} relevant sections`);
      
      if (results.length === 0) {
        console.log(`⚠️ No search results found. Debugging info:`);
        console.log(`   - Query: "${query}"`);
        console.log(`   - EntityType: ${this.entityType}`);
        console.log(`   - EntityId: ${this.entityId}`);
        console.log(`   - Organization: ${organizationId}`);
        console.log(`   - Threshold: ${options?.threshold || 0.7}`);
        console.log(`   - This might mean no embeddings exist for this entity`);
      }
      
      return results;

    } catch (error) {
      console.error('Real policy search failed:', error);
      console.log(`❌ Search error details:`, {
        query,
        entityType: this.entityType,
        entityId: this.entityId,
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Answer security questions using REAL AI and semantic search
   */
  async answerSecurityQuestion(
    question: string,
    organizationId: string = 'default-org'
  ): Promise<{
    answer: string;
    confidence: number;
    sources: Array<{
      documentId: string;
      filename: string;
      section: string;
      relevance: number;
    }>;
  }> {
    try {
      console.log(`❓ PolicyDocumentService: Answering with REAL AI: "${question}"`);
      
      // Use REAL semantic search to find relevant policy sections
      const searchResults = await this.searchPolicies(question, organizationId, {
        limit: 5,
        threshold: 0.3  // Match library search threshold for broader results
      });

      console.log(`🔍 Question "${question}" found ${searchResults.length} search results`);
      if (searchResults.length > 0) {
        console.log(`📊 Top result similarity: ${searchResults[0].similarity}`);
        console.log(`📄 Top result preview: "${searchResults[0].content.substring(0, 150)}..."`);
      }

      if (searchResults.length === 0) {
        return {
          answer: "I couldn't find relevant information in your policy documents to answer this question. The AI search didn't return any matching content.",
          confidence: 0,
          sources: []
        };
      }

      // Use AI to generate a comprehensive answer from search results
      const contextContent = searchResults
        .map((result, index) => `[Source ${index + 1}: ${result.source?.filename || 'Policy Document'}]
${result.content}`)
        .join('\n\n');

      const prompt = `You are a security compliance expert. Based on the policy documents provided below, answer the following question in a comprehensive and professional manner.

Question: ${question}

Policy Documents Content:
${contextContent}

Instructions:
1. Provide a clear, comprehensive answer based ONLY on the information in the policy documents
2. If the documents contain relevant information, synthesize it into a cohesive response
3. Reference specific policies when applicable (e.g., "According to the Data Protection Policy...")
4. If the documents don't fully address the question, acknowledge what is covered and what isn't
5. Be specific and actionable where possible
6. Use professional, compliance-oriented language
7. Keep the answer focused and concise (2-3 paragraphs maximum)

Answer:`;

      console.log(`🤖 PolicyDocumentService: Generating AI answer for: "${question}"`);
      
      try {
        const aiAnswer = await generateText(prompt, MODELS.fast);
        
        // Calculate confidence based on REAL similarity scores and AI response quality
        const avgRelevance = searchResults.reduce((sum, r) => sum + r.similarity, 0) / searchResults.length;
        const hasSpecificAnswer = aiAnswer.length > 100 && !aiAnswer.includes("don't have enough information");
        const confidence = Math.min(avgRelevance * (hasSpecificAnswer ? 1.0 : 0.7), 0.95);

        // Format sources from REAL search results
        const sources = searchResults.map(result => ({
          documentId: result.source?.fileId || result.id || 'unknown',
          filename: result.source?.filename || result.metadata?.documentName || 'Unknown Policy',
          section: result.content.substring(0, 100) + '...',
          relevance: result.similarity
        }));

        console.log(`✅ PolicyDocumentService: AI answer generated with ${confidence.toFixed(3)} confidence`);

        return {
          answer: aiAnswer,
          confidence,
          sources
        };

      } catch (aiError) {
        console.error('AI answer generation failed, falling back to search results:', aiError);
        
        // Fallback to basic answer if AI fails
        const fallbackAnswer = `Based on your policy documents, I found the following relevant information:

${searchResults[0].content}

${searchResults.length > 1 ? `Additional relevant sections were found in ${searchResults.length - 1} other documents.` : ''}`;

        const avgRelevance = searchResults.reduce((sum, r) => sum + r.similarity, 0) / searchResults.length;
        const sources = searchResults.map(result => ({
          documentId: result.source?.fileId || result.id || 'unknown',
          filename: result.source?.filename || result.metadata?.documentName || 'Unknown Policy',
          section: result.content.substring(0, 100) + '...',
          relevance: result.similarity
        }));

        console.log(`✅ PolicyDocumentService: Fallback answer generated with ${avgRelevance.toFixed(3)} confidence`);

        return {
          answer: fallbackAnswer,
          confidence: avgRelevance,
          sources
        };
      }

    } catch (error) {
      console.error('Real AI question answering failed:', error);
      return {
        answer: "An error occurred while processing your question with the AI system.",
        confidence: 0,
        sources: []
      };
    }
  }

  /**
   * Delete a policy document using real DocumentService
   */
  async deleteDocument(id: string, organizationId: string = 'default-org'): Promise<boolean> {
    try {
      console.log(`🗑️ PolicyDocumentService: Deleting REAL document ${id} from database`);
      
      await this.documentService.deleteDocument(id, organizationId);
      console.log(`✅ PolicyDocumentService: REAL document ${id} deleted from database`);
      return true;
    } catch (error) {
      console.error('Failed to delete real policy document:', error);
      return false;
    }
  }

  /**
   * Transform knowledgebase FileData to PolicyDocument format
   */
  private transformToPolicy(fileData: any): PolicyDocument {
    // fileData structure: { fileId, metadata: FileMetadata, uploadedAt }
    const metadata = fileData.metadata || {};
    
    return {
      id: fileData.fileId,
      title: metadata.filename || 'Untitled Policy',
      version: metadata.version || '1.0',
      uploadDate: new Date(fileData.uploadedAt || Date.now()),
      fileType: this.mapFileType(metadata.fileType || 'unknown'),
      fileName: metadata.filename || 'Unknown',
      fileSize: metadata.size || 0,
      fileUrl: metadata.blobUrl || '',
      content: {
        text: 'Loading content...', // Will be loaded separately
        metadata: {
          mimeType: metadata.mimeType,
          uploadedBy: metadata.uploadedBy,
          organizationId: metadata.organizationId
        }
      },
      sections: [{
        id: 'section_1',
        title: 'Document Content',
        content: 'Content will be loaded from chunks...',
        startIndex: 0,
        endIndex: 0,
        level: 1
      }],
      status: ProcessingStatus.COMPLETED,
      createdAt: new Date(fileData.uploadedAt || Date.now()),
      updatedAt: new Date(fileData.uploadedAt || Date.now())
    };
  }

  /**
   * Get document content from chunks
   */
  private async getDocumentContent(fileId: string, organizationId: string): Promise<{
    fullText: string;
    sections: Array<{ id: string; title: string; content: string; startIndex: number; endIndex: number; level: number; }>;
  }> {
    try {
      // Get all chunks for this document
      const chunks = await prisma.fileData.findMany({
        where: {
          fileId,
          dataType: 'chunk',
          organizationId
        },
        orderBy: {
          chunkIndex: 'asc'
        }
      });

      if (chunks.length === 0) {
        return {
          fullText: 'No content available - document may still be processing.',
          sections: []
        };
      }

      // Combine all chunks into full text
      const fullText = chunks.map(chunk => chunk.content || '').join('\n\n');
      
      // Create sections from chunks
      const sections = chunks.map((chunk, index) => ({
        id: `chunk_${chunk.chunkIndex || index}`,
        title: `Section ${chunk.chunkIndex || index + 1}`,
        content: chunk.content || '',
        startIndex: index * 1000, // Approximate positions
        endIndex: (index + 1) * 1000,
        level: 1
      }));

      return { fullText, sections };
    } catch (error) {
      console.error('Failed to get document content:', error);
      return {
        fullText: 'Error loading content.',
        sections: []
      };
    }
  }

  /**
   * Map knowledgebase FileType to PolySec FileType enum
   */
  private mapFileType(fileType: any): any {
    // Convert knowledgebase FileType to PolySec FileType
    const typeStr = (typeof fileType === 'string' ? fileType : String(fileType)).toLowerCase();
    
    switch (typeStr) {
      case 'pdf': return 'PDF';
      case 'docx': return 'DOCX';
      case 'txt': return 'TXT';
      default: return 'TXT';
    }
  }
} 
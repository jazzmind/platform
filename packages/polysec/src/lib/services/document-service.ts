import { PolicyDocument, DocumentUploadRequest, DocumentUploadResponse, ProcessingStatus } from '../../types';

// Global document storage (in production, this would be a database)
const globalDocumentStore = new Map<string, PolicyDocument>();

export class PolicyDocumentService {
  private readonly entityType = 'polysec';
  private readonly entityId = 'policy-database';

  /**
   * Upload and process a policy document
   */
  async uploadDocument(request: DocumentUploadRequest, organizationId: string = 'default-org'): Promise<DocumentUploadResponse> {
    try {
      console.log(`🔒 PolicyDocumentService: Processing ${request.file.name}`);
      
      // Generate document ID
      const documentId = `policy-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      
      // Create mock policy document
      const policyDocument: PolicyDocument = {
        id: documentId,
        title: request.title || request.file.name,
        version: request.version,
        uploadDate: new Date(),
        fileType: this.mapFileType(request.file.name),
        fileName: request.file.name,
        fileSize: request.file.size,
        fileUrl: `mock://policy-storage/${documentId}`,
        content: {
          text: `Mock extracted content from ${request.file.name}. This will be replaced with real AI-powered text extraction.`,
          metadata: {
            extractedAt: new Date().toISOString(),
            processingVersion: '1.0'
          }
        },
        sections: [
          {
            id: 'section_1',
            title: 'Policy Overview',
            content: `This section contains the overview from ${request.file.name}`,
            startIndex: 0,
            endIndex: 100,
            level: 1
          },
          {
            id: 'section_2', 
            title: 'Security Requirements',
            content: `This section contains the security requirements from ${request.file.name}`,
            startIndex: 101,
            endIndex: 200,
            level: 1
          }
        ],
        status: ProcessingStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in global document store
      globalDocumentStore.set(documentId, policyDocument);
      
      console.log(`✅ PolicyDocumentService: Document processed successfully: ${documentId}`);
      console.log(`📊 Storage Status: ${globalDocumentStore.size} documents in store`);
      console.log(`🔑 Stored Document IDs:`, Array.from(globalDocumentStore.keys()));

      return {
        id: documentId,
        status: ProcessingStatus.COMPLETED,
        message: `Policy document "${request.file.name}" uploaded and processed successfully. Ready for AI analysis.`,
        fileUrl: policyDocument.fileUrl
      };

    } catch (error) {
      console.error('Policy document upload failed:', error);
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all policy documents
   */
  async listDocuments(organizationId: string = 'default-org', options?: {
    limit?: number;
    offset?: number;
  }): Promise<PolicyDocument[]> {
    try {
      console.log(`📚 PolicyDocumentService: Listing documents for organization ${organizationId}`);
      console.log(`📊 Storage Status: ${globalDocumentStore.size} documents in store`);
      
      const allDocs = Array.from(globalDocumentStore.values());
      const offset = options?.offset || 0;
      const limit = options?.limit || 50;
      
      const results = allDocs
        .sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime())
        .slice(offset, offset + limit);

      console.log(`✅ PolicyDocumentService: Found ${results.length} documents`);
      return results;

    } catch (error) {
      console.error('Failed to list policy documents:', error);
      return [];
    }
  }

  /**
   * Get a specific policy document
   */
  async getDocument(id: string, organizationId: string = 'default-org'): Promise<PolicyDocument | null> {
    try {
      console.log(`📄 PolicyDocumentService: Getting document ${id}`);
      console.log(`📊 Storage Status: ${globalDocumentStore.size} documents in store`);
      console.log(`🔑 Available Document IDs:`, Array.from(globalDocumentStore.keys()));
      
      const document = globalDocumentStore.get(id);
      
      if (document) {
        console.log(`✅ PolicyDocumentService: Found document ${id}: ${document.title}`);
      } else {
        console.log(`❌ PolicyDocumentService: Document ${id} not found in store`);
      }
      
      return document || null;
    } catch (error) {
      console.error('Failed to get policy document:', error);
      return null;
    }
  }

  /**
   * Search policy documents (mock implementation)
   */
  async searchPolicies(
    query: string, 
    organizationId: string = 'default-org',
    options?: {
      limit?: number;
      threshold?: number;
    }
  ): Promise<any[]> {
    try {
      console.log(`🔍 PolicyDocumentService: Searching policies for: "${query}"`);
      
      const allDocs = Array.from(globalDocumentStore.values());
      const results = [];
      
      // Mock search - find documents with query in title or content
      for (const doc of allDocs) {
        const searchText = `${doc.title} ${doc.content.text}`.toLowerCase();
        if (searchText.includes(query.toLowerCase())) {
          results.push({
            content: doc.content.text.substring(0, 200) + '...',
            similarity: 0.8, // Mock similarity score
            metadata: {
              entityId: doc.id,
              filename: doc.fileName
            }
          });
        }
      }

      console.log(`✅ PolicyDocumentService: Found ${results.length} relevant policy sections`);
      return results;

    } catch (error) {
      console.error('Policy search failed:', error);
      return [];
    }
  }

  /**
   * Answer security questions using mock AI
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
      console.log(`❓ PolicyDocumentService: Answering security question: "${question}"`);
      
      // Search for relevant policy sections
      const searchResults = await this.searchPolicies(question, organizationId, {
        limit: 3,
        threshold: 0.6
      });

      if (searchResults.length === 0) {
        return {
          answer: "I couldn't find relevant information in your policy documents to answer this question. Please upload more policy documents or refine your question.",
          confidence: 0,
          sources: []
        };
      }

      // Generate mock AI answer
      const answer = `Based on your uploaded policy documents, here's what I found regarding "${question}": 

${searchResults[0].content}

This information comes from your policy documentation and appears to address the key aspects of your question. For more detailed information, please refer to the source documents listed below.`;
      
      const confidence = Math.min(searchResults.length * 0.3, 0.9);

      const sources = searchResults.map(result => ({
        documentId: result.metadata?.entityId || 'unknown',
        filename: result.metadata?.filename || 'Unknown Policy',
        section: result.content.substring(0, 100) + '...',
        relevance: result.similarity
      }));

      console.log(`✅ PolicyDocumentService: Generated answer with ${confidence.toFixed(2)} confidence`);

      return {
        answer,
        confidence,
        sources
      };

    } catch (error) {
      console.error('Failed to answer security question:', error);
      return {
        answer: "An error occurred while processing your question. Please try again or contact support.",
        confidence: 0,
        sources: []
      };
    }
  }

  /**
   * Delete a policy document
   */
  async deleteDocument(id: string, organizationId: string = 'default-org'): Promise<boolean> {
    try {
      console.log(`🗑️ PolicyDocumentService: Deleting document ${id}`);
      
      const deleted = globalDocumentStore.delete(id);
      console.log(`📊 Storage Status after delete: ${globalDocumentStore.size} documents in store`);
      
      return deleted;
    } catch (error) {
      console.error('Failed to delete policy document:', error);
      return false;
    }
  }

  /**
   * Map file extensions to FileType
   */
  private mapFileType(filename: string): any {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'PDF';
      case 'docx': return 'DOCX';
      case 'txt': return 'TXT';
      default: return 'TXT';
    }
  }
} 
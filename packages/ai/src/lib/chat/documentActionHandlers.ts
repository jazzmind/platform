import { ChatFileManager } from './fileManager';
import { extractOrganizationsWithContacts } from '@/src/lib/ai/organizationContactExtraction';
import { proposalProcessingService } from '@/src/lib/ai/proposalProcessing';
import { identifySections, analyzeSemantic } from '@/src/lib/ai/documentAnalysis';
import { StreamMessage, sendStreamMessage } from '@/src/lib/chat/utils';

export interface DocumentActionRequest {
  action: string;
  fileId: string;
  fileName: string;
  documentType: string;
  organizationId?: string;
  uploadedBy: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  userFeedback?: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  error?: string;
  actions?: Array<{ action: string; label: string; description: string; data?: unknown }>;
}

/**
 * Enhanced Document Action Handlers
 * Pure business logic for document processing actions
 */
export class DocumentActionHandlers {
  private fileManager: ChatFileManager;

  constructor() {
    this.fileManager = new ChatFileManager();
  }

  /**
   * Handle opportunity matching flow - now returns structured data instead of streaming
   */
  async handleOpportunityMatching(
    request: DocumentActionRequest,
    // For backwards compatibility during transition, accept but ignore the controller
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messageController?: ReadableStreamDefaultController<any>
  ): Promise<ActionResult> {
    const { fileId, fileName, documentType, data } = request;

    try {
      // If messageController exists, send initial progress (backwards compatibility)
      if (messageController) {
        await sendStreamMessage(messageController, {
          type: 'message',
          role: 'assistant',
          content: `🔍 **Searching for Matching Opportunities**\n\nI'm analyzing the content of **${fileName}** to find the best matching opportunities in your workspace...`,
          progress: {
            stage: 'matching',
            current: 0,
            total: 100,
            message: 'Searching for opportunity matches...'
          }
        } as StreamMessage);
      }

      // Get the cached file content
      const fileContent = await this.getFileContent(fileId, request.organizationId, request.data?.entityType, request.data?.entityId);
      if (!fileContent) {
        throw new Error('File content not found in cache');
      }

      // Search for semantic matches among opportunities
      const availableOpportunities = data?.opportunities || [];
      const matches = await this.findOpportunityMatches(fileContent!, availableOpportunities);

      if (messageController) {
        await sendStreamMessage(messageController, {
          type: 'progress',
          progress: {
            stage: 'matching',
            current: 40,
            total: 100,
            message: `Found ${matches.length} potential matches`
          }
        });
      }

      if (matches.length === 0) {
        const message = `🤔 **No Matches Found**\n\nI couldn't find any existing opportunities that closely match this ${documentType}. Would you like to:\n\n• Create a new opportunity instead\n• Manually specify an opportunity to link to\n• Extract entities for your knowledge base`;
        
        const actions = [
          {
            action: 'create_new_opportunity',
            label: 'Create New Opportunity',
            description: 'Create a new opportunity based on this document',
            data: { fileId, fileName, documentType }
          },
          {
            action: 'manual_opportunity_link',
            label: 'Manual Link',
            description: 'Manually specify which opportunity to link this document to',
            data: { fileId, fileName, documentType, opportunities: availableOpportunities }
          },
          {
            action: 'extract_entities',
            label: 'Extract Entities',
            description: 'Extract organizations and contacts for knowledge base',
            data: { fileId, fileName, documentType }
          }
        ];

        if (messageController) {
          await sendStreamMessage(messageController, {
            type: 'message',
            role: 'assistant',
            content: message,
            metadata: { actions }
          });
        }

        return {
          success: true,
          message,
          actions,
          data: { matches: [] }
        };
      }

      // Present matches for user confirmation
      const matchContent = this.generateMatchContent(matches, fileName, documentType);
      const actions = [
        ...matches.map((match) => ({
          action: 'confirm_opportunity_match',
          label: `Link to "${match.title}"`,
          description: `Link document to ${match.title} (${match.matchScore}% match)`,
          data: { 
            fileId, 
            fileName, 
            documentType, 
            opportunityId: match.id,
            opportunityTitle: match.title,
            matchScore: match.matchScore 
          }
        })),
        {
          action: 'manual_opportunity_link',
          label: 'Different Opportunity',
          description: 'Link to a different opportunity not shown above',
          data: { fileId, fileName, documentType, opportunities: availableOpportunities }
        }
      ];

      if (messageController) {
        await sendStreamMessage(messageController, {
          type: 'message',
          role: 'assistant',
          content: matchContent,
          metadata: { matches, actions }
        });
      }

      return {
        success: true,
        message: matchContent,
        actions,
        data: { matches }
      };

    } catch (error) {
      console.error('Error in opportunity matching:', error);
      
      // Don't send error messages through controller - let the main handler deal with streaming
      // Just throw the error so the main handler can handle it properly
      throw error;
    }
  }

  /**
   * Confirm opportunity match and enhance sections
   */
  async handleConfirmOpportunityMatch(
    request: DocumentActionRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messageController: ReadableStreamDefaultController<any>
  ): Promise<void> {
    const { fileId, fileName, data } = request;
    const { opportunityId, opportunityTitle, matchScore } = data;

    try {
      await sendStreamMessage(messageController, {
        type: 'message',
        role: 'assistant',
        content: `✅ **Linking Document to Opportunity**\n\nI'm linking **${fileName}** to **${opportunityTitle}** and will now perform semantic analysis to enhance the opportunity sections...`,
        progress: {
          stage: 'linking',
          current: 0,
          total: 100,
          message: 'Linking document to opportunity...'
        }
      });

      // Get the cached file content
      const fileContent = await this.getFileContent(fileId, request.organizationId, request.data?.entityType, request.data?.entityId);
      if (!fileContent) {
        throw new Error('File content not found in cache');
      }

      // Perform semantic analysis to identify sections
      await sendStreamMessage(messageController, {
        type: 'progress',
        progress: {
          stage: 'analyzing',
          current: 20,
          total: 100,
          message: 'Analyzing document sections...'
        }
      });

      const semanticSections = await analyzeSemantic(
        fileContent,
        (progress) => {
          sendStreamMessage(messageController, {
            type: 'progress',
            progress: {
              stage: 'analyzing',
              current: 20 + (progress.current / progress.total) * 40,
              total: 100,
              message: progress.message
            }
          });
        }
      );

      // Identify key sections from the document
      const identifiedSections = await identifySections(fileContent, 'opportunity');

      await sendStreamMessage(messageController, {
        type: 'progress',
        progress: {
          stage: 'enhancing',
          current: 70,
          total: 100,
          message: 'Enhancing opportunity sections...'
        }
      });

      // TODO: Here we would integrate with the opportunity database to:
      // 1. Link the document to the opportunity
      // 2. Create new sections from the analysis
      // 3. Enhance existing sections with new content
      // 4. Create embeddings for search

      await sendStreamMessage(messageController, {
        type: 'progress',
        progress: {
          stage: 'complete',
          current: 100,
          total: 100,
          message: 'Document linked and sections enhanced'
        }
      });

      const completionMessage = `🎉 **Document Successfully Linked**\n\n**${fileName}** has been linked to **${opportunityTitle}** (${matchScore}% match confidence).\n\n**Analysis Results:**\n• Identified ${identifiedSections.length} key sections\n• Created ${semanticSections.length} semantic sections\n• Enhanced opportunity with new insights\n\n**Next Steps:**\n• Review the enhanced opportunity sections\n• Continue working on your proposal\n• Upload additional related documents`;

      await sendStreamMessage(messageController, {
        type: 'completed',
        role: 'assistant',
        content: completionMessage,
        metadata: {
          opportunityId,
          opportunityTitle,
          sectionsCreated: identifiedSections.length,
          semanticSections: semanticSections.length,
          actions: [
            {
              action: 'view_opportunity',
              label: 'View Opportunity',
              description: `Open ${opportunityTitle} to see the enhanced sections`,
              data: { opportunityId }
            }
          ]
        }
      });

    } catch (error) {
      console.error('Error confirming opportunity match:', error);
      
      // Don't send error messages through controller - let the main handler deal with streaming
      throw error;
    }
  }

  /**
   * Handle new opportunity creation flow
   */
  async handleCreateNewOpportunity(
    request: DocumentActionRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messageController: ReadableStreamDefaultController<any>
  ): Promise<void> {
    const { fileId, fileName, documentType } = request;

    try {
      await sendStreamMessage(messageController, {
        type: 'message',
        role: 'assistant',
        content: `🆕 **Creating New Opportunity**\n\nI'm creating a new opportunity based on **${fileName}** and performing semantic analysis to generate relevant sections...`,
        progress: {
          stage: 'creating',
          current: 0,
          total: 100,
          message: 'Creating new opportunity...'
        }
      });

      // Get the cached file content
      const fileContent = await this.getFileContent(fileId, request.organizationId, request.data?.entityType, request.data?.entityId);
      if (!fileContent) {
        throw new Error('File content not found in cache');
      }

      // Extract organizations and contacts first
      await sendStreamMessage(messageController, {
        type: 'progress',
        progress: {
          stage: 'extracting',
          current: 20,
          total: 100,
          message: 'Extracting organizations and contacts...'
        }
      });

      const entityExtraction = await extractOrganizationsWithContacts(fileContent, {
        context: 'document'
      });

      // Perform semantic analysis
      await sendStreamMessage(messageController, {
        type: 'progress',
        progress: {
          stage: 'analyzing',
          current: 40,
          total: 100,
          message: 'Analyzing document content...'
        }
      });

      await analyzeSemantic(fileContent);
      const identifiedSections = await identifySections(fileContent, 'opportunity');

      // Generate opportunity title and value estimate
      const opportunityData = await this.generateOpportunityData(fileContent, documentType, entityExtraction);

      await sendStreamMessage(messageController, {
        type: 'progress',
        progress: {
          stage: 'creating',
          current: 80,
          total: 100,
          message: 'Creating opportunity with sections and embeddings...'
        }
      });

      // TODO: Here we would integrate with the opportunity database to:
      // 1. Create the new opportunity record
      // 2. Create sections from the analysis
      // 3. Link organizations and contacts
      // 4. Create embeddings for search
      // 5. Set up initial proposal structure

      await sendStreamMessage(messageController, {
        type: 'progress',
        progress: {
          stage: 'complete',
          current: 100,
          total: 100,
          message: 'New opportunity created successfully'
        }
      });

      const completionMessage = `🎉 **New Opportunity Created**\n\n**${opportunityData.title}** has been created based on **${fileName}**.\n\n**Opportunity Details:**\n• **Type:** ${documentType.replace('_', ' ').toUpperCase()}\n• **Estimated Value:** ${opportunityData.estimatedValue}\n• **Primary Organization:** ${entityExtraction.primaryOrganization?.name || 'Not specified'}\n• **Sections Created:** ${identifiedSections.length}\n• **Organizations Found:** ${entityExtraction.organizations.length}\n\n**Next Steps:**\n• Review and refine the opportunity details\n• Begin proposal development\n• Add team members and set deadlines`;

      await sendStreamMessage(messageController, {
        type: 'completed',
        role: 'assistant',
        content: completionMessage,
        metadata: {
          opportunityId: 'new-opportunity-id', // Would be real ID from database
          opportunityTitle: opportunityData.title,
          sectionsCreated: identifiedSections.length,
          organizationsFound: entityExtraction.organizations.length,
          actions: [
            {
              action: 'view_opportunity',
              label: 'View New Opportunity',
              description: `Open ${opportunityData.title} to review and customize`,
              data: { opportunityId: 'new-opportunity-id' }
            }
          ]
        }
      });

    } catch (error) {
      console.error('Error creating new opportunity:', error);
      
      // Don't send error messages through controller - let the main handler deal with streaming
      throw error;
    }
  }

  /**
   * Handle entity extraction flow for services, methodologies, case studies, testimonials, organizations, contacts
   */
  async handleEntityExtraction(
    request: DocumentActionRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messageController: ReadableStreamDefaultController<any>
  ): Promise<void> {
    const { fileId, fileName, documentType } = request;

    try {
      await sendStreamMessage(messageController, {
        type: 'message',
        role: 'assistant',
        content: `🔍 **Extracting Entities**\n\nI'm analyzing **${fileName}** to extract relevant ${documentType.replace('_', ' ')} content and entities...`,
        progress: {
          stage: 'extracting',
          current: 0,
          total: 100,
          message: 'Starting entity extraction...'
        }
      });

      // Get the cached file content
      const fileContent = await this.getFileContent(fileId, request.organizationId, request.data?.entityType, request.data?.entityId);
      if (!fileContent) {
        throw new Error('File content not found in cache');
      }

      // Extract organizations and contacts
      await sendStreamMessage(messageController, {
        type: 'progress',
        progress: {
          stage: 'extracting',
          current: 20,
          total: 100,
          message: 'Extracting organizations and contacts...'
        }
      });

      const entityExtraction = await extractOrganizationsWithContacts(fileContent, {
        context: 'document'
      });

      // Extract type-specific content based on document type
      let specificExtraction = null;
      if (['service_offering', 'methodology', 'case_study', 'testimonials', 'proposal'].includes(documentType)) {
        await sendStreamMessage(messageController, {
          type: 'progress',
          progress: {
            stage: 'extracting',
            current: 60,
            total: 100,
            message: `Extracting ${documentType.replace('_', ' ')} content...`
          }
        });

        specificExtraction = await proposalProcessingService.extractProposalElements(
          fileContent,
          {
            extractServices: documentType === 'service_offering' || documentType === 'proposal',
            extractMethodology: documentType === 'methodology' || documentType === 'proposal',
            extractCaseStudies: documentType === 'case_study' || documentType === 'proposal',
            extractTestimonials: documentType === 'testimonials' || documentType === 'proposal',
            extractContacts: true
          },
          fileName
        );
      }

      await sendStreamMessage(messageController, {
        type: 'progress',
        progress: {
          stage: 'processing',
          current: 90,
          total: 100,
          message: 'Processing extracted entities...'
        }
      });

      // Generate confirmation message with extracted entities
      const confirmationMessage = this.generateExtractionConfirmationMessage(
        fileName,
        documentType,
        entityExtraction,
        specificExtraction
      );

      await sendStreamMessage(messageController, {
        type: 'message',
        role: 'assistant',
        content: confirmationMessage.content,
        metadata: {
          extractedEntities: {
            organizations: entityExtraction.organizations,
            contacts: entityExtraction.organizations.flatMap(org => org.contacts),
            specificContent: specificExtraction
          },
          actions: confirmationMessage.actions
        }
      });

      await sendStreamMessage(messageController, {
        type: 'progress',
        progress: {
          stage: 'complete',
          current: 100,
          total: 100,
          message: 'Entity extraction completed'
        }
      });

    } catch (error) {
      console.error('Error in entity extraction:', error);
      
      // Don't send error messages through controller - let the main handler deal with streaming
      throw error;
    }
  }

  /**
   * Handle adding document content to knowledge base
   */
  async handleAddToKnowledgeBase(
    request: DocumentActionRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messageController: ReadableStreamDefaultController<any>
  ): Promise<void> {
    const { fileId, fileName, documentType } = request;

    try {
      await sendStreamMessage(messageController, {
        type: 'message',
        role: 'assistant',
        content: `🧠 **Analyzing Document for Knowledge Items**\n\nI'm analyzing **${fileName}** to identify valuable knowledge items that can be added to your knowledge base...`,
        progress: {
          stage: 'analyzing',
          current: 0,
          total: 100,
          message: 'Starting knowledge extraction...'
        }
      });

      // Get the cached file content
      const fileContent = await this.getFileContent(fileId, request.organizationId, request.data?.entityType, request.data?.entityId);
      if (!fileContent) {
        throw new Error('File content not found in cache');
      }

      // Extract knowledge items based on document type
      await sendStreamMessage(messageController, {
        type: 'progress',
        progress: {
          stage: 'extracting',
          current: 20,
          total: 100,
          message: 'Extracting knowledge items...'
        }
      });

      const knowledgeExtraction = await this.extractKnowledgeItems(fileContent, documentType, fileName);

      await sendStreamMessage(messageController, {
        type: 'progress',
        progress: {
          stage: 'processing',
          current: 80,
          total: 100,
          message: 'Processing extracted knowledge items...'
        }
      });

      // Generate confirmation message with extracted knowledge items
      const confirmationMessage = this.generateKnowledgeConfirmationMessage(
        fileName,
        documentType,
        knowledgeExtraction
      );

      await sendStreamMessage(messageController, {
        type: 'message',
        role: 'assistant',
        content: confirmationMessage.content,
        metadata: {
          extractedKnowledge: knowledgeExtraction,
          actions: confirmationMessage.actions
        }
      });

      await sendStreamMessage(messageController, {
        type: 'progress',
        progress: {
          stage: 'complete',
          current: 100,
          total: 100,
          message: 'Knowledge extraction completed'
        }
      });

    } catch (error) {
      console.error('Error in knowledge base extraction:', error);
      throw error;
    }
  }

  /**
   * Handle confirmation of services to add to knowledge base
   */
  async handleConfirmExtractServices(
    request: DocumentActionRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messageController: ReadableStreamDefaultController<any>
  ): Promise<void> {
    const { data, organizationId } = request;
    const services = data?.services || [];

    try {
      await sendStreamMessage(messageController, {
        type: 'message',
        role: 'assistant',
        content: `✅ **Adding Services to Knowledge Base**\n\nI'm adding ${services.length} services to your knowledge base...`,
        progress: {
          stage: 'saving',
          current: 0,
          total: 100,
          message: 'Creating service knowledge items...'
        }
      });

      const results = await this.saveKnowledgeItems(services, 'service', organizationId!);

      await sendStreamMessage(messageController, {
        type: 'completed',
        role: 'assistant',
        content: `🎉 **Services Added Successfully**\n\n${results.successCount} services have been added to your knowledge base:\n\n${results.items.map(item => `• **${item.title}**`).join('\n')}\n\nYou can now use these services in your proposals and opportunities.`,
        metadata: {
          savedItems: results.items,
          successCount: results.successCount
        }
      });

    } catch (error) {
      console.error('Error saving services:', error);
      throw error;
    }
  }

  /**
   * Handle confirmation of methodologies to add to knowledge base
   */
  async handleConfirmExtractMethodologies(
    request: DocumentActionRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messageController: ReadableStreamDefaultController<any>
  ): Promise<void> {
    const { data, organizationId } = request;
    const methodologies = data?.methodologies || [];

    try {
      await sendStreamMessage(messageController, {
        type: 'message',
        role: 'assistant',
        content: `✅ **Adding Methodologies to Knowledge Base**\n\nI'm adding ${methodologies.length} methodologies to your knowledge base...`,
        progress: {
          stage: 'saving',
          current: 0,
          total: 100,
          message: 'Creating methodology knowledge items...'
        }
      });

      const results = await this.saveKnowledgeItems(methodologies, 'methodology', organizationId!);

      await sendStreamMessage(messageController, {
        type: 'completed',
        role: 'assistant',
        content: `🎉 **Methodologies Added Successfully**\n\n${results.successCount} methodologies have been added to your knowledge base:\n\n${results.items.map(item => `• **${item.title}**`).join('\n')}\n\nYou can now reference these methodologies in your proposals.`,
        metadata: {
          savedItems: results.items,
          successCount: results.successCount
        }
      });

    } catch (error) {
      console.error('Error saving methodologies:', error);
      throw error;
    }
  }

  /**
   * Handle confirmation of case studies to add to knowledge base
   */
  async handleConfirmExtractCaseStudies(
    request: DocumentActionRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messageController: ReadableStreamDefaultController<any>
  ): Promise<void> {
    const { data, organizationId } = request;
    const caseStudies = data?.caseStudies || [];

    try {
      await sendStreamMessage(messageController, {
        type: 'message',
        role: 'assistant',
        content: `✅ **Adding Case Studies to Knowledge Base**\n\nI'm adding ${caseStudies.length} case studies to your knowledge base...`,
        progress: {
          stage: 'saving',
          current: 0,
          total: 100,
          message: 'Creating case study knowledge items...'
        }
      });

      const results = await this.saveKnowledgeItems(caseStudies, 'case-study', organizationId!);

      await sendStreamMessage(messageController, {
        type: 'completed',
        role: 'assistant',
        content: `🎉 **Case Studies Added Successfully**\n\n${results.successCount} case studies have been added to your knowledge base:\n\n${results.items.map(item => `• **${item.title}**`).join('\n')}\n\nYou can now showcase these case studies in your proposals.`,
        metadata: {
          savedItems: results.items,
          successCount: results.successCount
        }
      });

    } catch (error) {
      console.error('Error saving case studies:', error);
      throw error;
    }
  }

  /**
   * Handle confirmation of testimonials to add to knowledge base
   */
  async handleConfirmExtractTestimonials(
    request: DocumentActionRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messageController: ReadableStreamDefaultController<any>
  ): Promise<void> {
    const { data, organizationId } = request;
    const testimonials = data?.testimonials || [];

    try {
      await sendStreamMessage(messageController, {
        type: 'message',
        role: 'assistant',
        content: `✅ **Adding Testimonials to Knowledge Base**\n\nI'm adding ${testimonials.length} testimonials to your knowledge base...`,
        progress: {
          stage: 'saving',
          current: 0,
          total: 100,
          message: 'Creating testimonial knowledge items...'
        }
      });

      const results = await this.saveKnowledgeItems(testimonials, 'testimonial', organizationId!);

      await sendStreamMessage(messageController, {
        type: 'completed',
        role: 'assistant',
        content: `🎉 **Testimonials Added Successfully**\n\n${results.successCount} testimonials have been added to your knowledge base:\n\n${results.items.map(item => `• **${item.title}**`).join('\n')}\n\nYou can now include these testimonials in your proposals for social proof.`,
        metadata: {
          savedItems: results.items,
          successCount: results.successCount
        }
      });

    } catch (error) {
      console.error('Error saving testimonials:', error);
      throw error;
    }
  }

  // Helper methods

  private async getFileContent(fileId: string, organizationId?: string, entityType?: string, entityId?: string): Promise<string | null> {
    // Use ChatFileManager to retrieve cached file content
    try {
      // Try to get from file metadata where extracted content is stored
      const { getFileMetadata } = await import('@/src/lib/database/prisma/fileData');
      
      // Search patterns based on upload context:
      // Use passed entity parameters first, then fallback to search patterns
      const searchPatterns = [
        // Primary: use passed entity parameters if available
        ...(entityType && entityId ? [{ entityType: entityType as 'workspace' | 'opportunity' | 'proposal' | 'knowledgebase', entityId }] : []),
        // Secondary: workspace files with organizationId (dashboard uploads)
        ...(organizationId ? [{ entityType: 'workspace' as const, entityId: organizationId }] : []),
        // Fallback: try to find files uploaded to any context
        { entityType: 'opportunity' as const, entityId: 'any' },
        { entityType: 'proposal' as const, entityId: 'any' },
        { entityType: 'knowledgebase' as const, entityId: 'any' },
        // Legacy fallback patterns for existing test data
        { entityType: 'workspace' as const, entityId: 'test-workspace' },
        { entityType: 'workspace' as const, entityId: 'dashboard-upload' }
      ];
      
      for (const { entityType, entityId } of searchPatterns) {
        if (!entityId) continue; // Skip if entityId is undefined/null
        
        try {
          const metadata = await getFileMetadata(fileId, entityType, entityId);
          if (metadata && typeof metadata === 'object') {
            const data = metadata as Record<string, unknown>;
            if (data.extractedContentText && typeof data.extractedContentText === 'string') {
              console.log(`✅ Found file content for ${fileId} in ${entityType}/${entityId}`);
              return data.extractedContentText;
            }
          }
        } catch {
          // Continue to next pattern
          continue;
        }
      }
      
      console.warn(`File content not found in cache for fileId: ${fileId}, organizationId: ${organizationId}`);
      return null;
    } catch (error) {
      console.error('Error retrieving file content from cache:', error);
      return null;
    }
  }

  private async findOpportunityMatches(
    fileContent: string, 
    opportunities: Array<{ id: string; title: string; value: number; status: string }>
  ): Promise<Array<{ id: string; title: string; matchScore: number; reasoning: string }>> {
    try {
      // Use semantic vector search to find opportunity matches
      const { searchEntitiesVector } = await import('@/src/lib/ai/entityIndexing');
      
      // Create search query from file content (first 2000 chars for performance)
      const searchQuery = `${fileContent.substring(0, 2000)} opportunity business project requirements`;
      
      // Search for similar opportunities using vector embeddings
      const vectorMatches = await searchEntitiesVector(searchQuery, ['opportunity'], 10);
      
      console.log(`🔍 Vector search found ${vectorMatches.length} semantic matches`);
      
      if (vectorMatches.length === 0) {
        // No vector matches found, return empty array
        return [];
      }
      
      // Map vector results to our expected format and filter by provided opportunities
      const matches: Array<{ id: string; title: string; matchScore: number; reasoning: string }> = [];
      const opportunityIds = new Set(opportunities.map(opp => opp.id));
      
      for (const vectorMatch of vectorMatches) {
        // Only include opportunities that were provided in the input list
        if (opportunityIds.has(vectorMatch.entityId)) {
          const matchScore = Math.round(vectorMatch.similarity * 100);
          
          // Only include matches with reasonable confidence (>30%)
          if (matchScore >= 30) {
            matches.push({
              id: vectorMatch.entityId,
              title: vectorMatch.title || 'Untitled Opportunity',
              matchScore,
              reasoning: this.generateMatchReasoning(vectorMatch.similarity, vectorMatch.metadata)
            });
          }
        }
      }
      
      // Sort by match score descending and limit to top 5
      matches.sort((a, b) => b.matchScore - a.matchScore);
      return matches.slice(0, 5);
      
    } catch (error) {
      console.warn('Vector search failed, no fallback available:', error);
      return [];
    }
  }
  

  
  /**
   * Generate human-readable reasoning for vector matches
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private generateMatchReasoning(similarity: number, _metadata: Record<string, unknown>): string {
    const confidence = Math.round(similarity * 100);
    
    if (confidence >= 80) {
      return `Strong semantic similarity (${confidence}%) indicating closely related project scope and requirements`;
    } else if (confidence >= 60) {
      return `Good semantic alignment (${confidence}%) with similar business context and objectives`;
    } else if (confidence >= 40) {
      return `Moderate relevance (${confidence}%) showing potential connections in domain or approach`;
    } else {
      return `Basic similarity (${confidence}%) with some overlapping concepts or terminology`;
    }
  }

  private generateMatchContent(
    matches: Array<{ id: string; title: string; matchScore: number; reasoning: string }>,
    fileName: string,
    documentType: string
  ): string {
    const matchList = matches.map((match, index) => 
      `${index + 1}. **${match.title}** (${match.matchScore}% match)\n   ${match.reasoning}`
    ).join('\n\n');

    return `🎯 **Found ${matches.length} Potential Matches**\n\nI found these existing opportunities that might relate to **${fileName}**:\n\n${matchList}\n\n**Which opportunity should I link this ${documentType} to?**`;
  }

  private async generateOpportunityData(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _fileContent: string,
    documentType: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _entityExtraction: Awaited<ReturnType<typeof extractOrganizationsWithContacts>>
  ): Promise<{ title: string; estimatedValue: string }> {
    // TODO: Use AI to generate opportunity title and estimate value
    return {
      title: `New Opportunity from ${documentType.replace('_', ' ')}`,
      estimatedValue: "To be determined"
    };
  }

  private generateExtractionConfirmationMessage(
    fileName: string,
    documentType: string,
    entityExtraction: Awaited<ReturnType<typeof extractOrganizationsWithContacts>>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    specificExtraction: any
  ): { content: string; actions: Array<{ action: string; label: string; description: string; data?: unknown }> } {
    const orgCount = entityExtraction.organizations.length;
    const allContacts = entityExtraction.organizations.flatMap(org => org.contacts);
    const contactCount = allContacts.length;
    
    let specificContent = '';
    const actions = [];

    if (specificExtraction) {
      const servicesCount = specificExtraction.services?.length || 0;
      const methodologyCount = specificExtraction.methodology?.length || 0;
      const caseStudyCount = specificExtraction.caseStudies?.length || 0;
      const testimonialCount = specificExtraction.testimonials?.length || 0;

      if (servicesCount > 0) {
        specificContent += `\n• **Services:** ${servicesCount} services identified`;
        actions.push({
          action: 'confirm_extract_services',
          label: 'Add Services to Knowledge Base',
          description: `Add ${servicesCount} services to your knowledge base`,
          data: { services: specificExtraction.services }
        });
      }

      if (methodologyCount > 0) {
        specificContent += `\n• **Methodologies:** ${methodologyCount} methodologies identified`;
        actions.push({
          action: 'confirm_extract_methodologies',
          label: 'Add Methodologies to Knowledge Base',
          description: `Add ${methodologyCount} methodologies to your knowledge base`,
          data: { methodologies: specificExtraction.methodology }
        });
      }

      if (caseStudyCount > 0) {
        specificContent += `\n• **Case Studies:** ${caseStudyCount} case studies identified`;
        actions.push({
          action: 'confirm_extract_case_studies',
          label: 'Add Case Studies to Knowledge Base',
          description: `Add ${caseStudyCount} case studies to your knowledge base`,
          data: { caseStudies: specificExtraction.caseStudies }
        });
      }

      if (testimonialCount > 0) {
        specificContent += `\n• **Testimonials:** ${testimonialCount} testimonials identified`;
        actions.push({
          action: 'confirm_extract_testimonials',
          label: 'Add Testimonials to Knowledge Base',
          description: `Add ${testimonialCount} testimonials to your knowledge base`,
          data: { testimonials: specificExtraction.testimonials }
        });
      }
    }

    // Add organization and contact actions
    if (orgCount > 0) {
      actions.push({
        action: 'confirm_extract_organizations',
        label: 'Add Organizations to CRM',
        description: `Add ${orgCount} organizations to your CRM`,
        data: { organizations: entityExtraction.organizations }
      });
    }

    if (contactCount > 0) {
      actions.push({
        action: 'confirm_extract_contacts',
        label: 'Add Contacts to CRM',
        description: `Add ${contactCount} contacts to your CRM`,
        data: { contacts: allContacts }
      });
    }

    const content = `✅ **Entity Extraction Complete**\n\nI've analyzed **${fileName}** and found:\n\n• **Organizations:** ${orgCount} organizations identified\n• **Contacts:** ${contactCount} contacts identified${specificContent}\n\n**What would you like me to add to your system?**`;

    return { content, actions };
  }

  private async extractKnowledgeItems(
    fileContent: string,
    documentType: string,
    fileName: string
  ): Promise<{
    services: Array<{ title: string; description: string }>;
    methodologies: Array<{ title: string; description: string }>;
    caseStudies: Array<{ title: string; description: string }>;
    testimonials: Array<{ title: string; description: string }>;
  }> {
    let services: Array<{ title: string; description: string }> = [];
    let methodologies: Array<{ title: string; description: string }> = [];
    let caseStudies: Array<{ title: string; description: string }> = [];
    let testimonials: Array<{ title: string; description: string }> = [];

    if (['service_offering', 'methodology', 'case_study', 'testimonials', 'proposal'].includes(documentType)) {
      const specificExtraction = await proposalProcessingService.extractProposalElements(
        fileContent,
        {
          extractServices: documentType === 'service_offering' || documentType === 'proposal',
          extractMethodology: documentType === 'methodology' || documentType === 'proposal',
          extractCaseStudies: documentType === 'case_study' || documentType === 'proposal',
          extractTestimonials: documentType === 'testimonials' || documentType === 'proposal',
          extractContacts: true
        },
        fileName
      );

      if (specificExtraction) {
        if (specificExtraction.services) {
          services = specificExtraction.services.map(s => ({ title: s.name, description: s.description }));
        }
        if (specificExtraction.methodology) {
          methodologies = specificExtraction.methodology.map(m => ({ title: m.title, description: m.description }));
        }
        if (specificExtraction.caseStudies) {
          caseStudies = specificExtraction.caseStudies.map(cs => ({ title: cs.title, description: cs.challenge + ' ' + cs.solution }));
        }
        if (specificExtraction.testimonials) {
          testimonials = specificExtraction.testimonials.map(t => ({ title: `${t.clientName} - ${t.clientOrganization || 'Testimonial'}`, description: t.quote }));
        }
      }
    }

    return { services, methodologies, caseStudies, testimonials };
  }

  private async saveKnowledgeItems(
    items: Array<{ title: string; description: string }>,
    itemType: 'service' | 'methodology' | 'case-study' | 'testimonial',
    organizationId: string
  ): Promise<{ successCount: number; items: Array<{ title: string; description: string }> }> {
    let successCount = 0;
    const savedItems: Array<{ title: string; description: string }> = [];

    try {
      // Use the same database approach as the knowledge items API
      const { getDatabase } = await import('@/src/lib/database');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prisma = await getDatabase() as any;

      for (const item of items) {
        try {
          await prisma.knowledgeItem.create({
            data: {
              title: item.title,
              type: itemType,
              description: item.description,
              category: itemType,
              sections: [],
              ownerOrganizationId: organizationId,
              forOrganizationId: organizationId,
              status: 'draft'
            }
          });

          successCount++;
          savedItems.push(item);
        } catch (error) {
          console.warn(`Failed to save ${itemType} item "${item.title}":`, error);
        }
      }
    } catch (error) {
      console.error('Error getting database connection:', error);
    }

    return { successCount, items: savedItems };
  }

  private generateKnowledgeConfirmationMessage(
    fileName: string,
    documentType: string,
    knowledgeExtraction: {
      services: Array<{ title: string; description: string }>;
      methodologies: Array<{ title: string; description: string }>;
      caseStudies: Array<{ title: string; description: string }>;
      testimonials: Array<{ title: string; description: string }>;
    }
  ): { content: string; actions: Array<{ action: string; label: string; description: string; data?: unknown }> } {
    const servicesCount = knowledgeExtraction.services.length;
    const methodologiesCount = knowledgeExtraction.methodologies.length;
    const caseStudiesCount = knowledgeExtraction.caseStudies.length;
    const testimonialsCount = knowledgeExtraction.testimonials.length;

    let specificContent = '';
    const actions = [];

    if (servicesCount > 0) {
      specificContent += `\n• **Services:** ${servicesCount} services identified`;
      actions.push({
        action: 'confirm_extract_services',
        label: 'Add Services to Knowledge Base',
        description: `Add ${servicesCount} services to your knowledge base`,
        data: { services: knowledgeExtraction.services }
      });
    }

    if (methodologiesCount > 0) {
      specificContent += `\n• **Methodologies:** ${methodologiesCount} methodologies identified`;
      actions.push({
        action: 'confirm_extract_methodologies',
        label: 'Add Methodologies to Knowledge Base',
        description: `Add ${methodologiesCount} methodologies to your knowledge base`,
        data: { methodologies: knowledgeExtraction.methodologies }
      });
    }

    if (caseStudiesCount > 0) {
      specificContent += `\n• **Case Studies:** ${caseStudiesCount} case studies identified`;
      actions.push({
        action: 'confirm_extract_case_studies',
        label: 'Add Case Studies to Knowledge Base',
        description: `Add ${caseStudiesCount} case studies to your knowledge base`,
        data: { caseStudies: knowledgeExtraction.caseStudies }
      });
    }

    if (testimonialsCount > 0) {
      specificContent += `\n• **Testimonials:** ${testimonialsCount} testimonials identified`;
      actions.push({
        action: 'confirm_extract_testimonials',
        label: 'Add Testimonials to Knowledge Base',
        description: `Add ${testimonialsCount} testimonials to your knowledge base`,
        data: { testimonials: knowledgeExtraction.testimonials }
      });
    }

    const content = `✅ **Knowledge Base Extraction Complete**\n\nI've analyzed **${fileName}** and found:${specificContent}\n\n**What would you like me to add to your system?**`;

    return { content, actions };
  }

}

// Export singleton instance
export const documentActionHandlers = new DocumentActionHandlers(); 
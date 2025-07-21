import { ChatFileManager } from './fileManager';
import { classifyDocument } from '@/src/lib/ai/documentClassification';
import { enhancedAnalyzeDocument, createSemanticSectionEmbeddings } from '@/src/lib/ai/documentAnalysis';
import { generateDocumentSummary } from '@/src/lib/ai/contentGeneration';
import { rfpProcessingService } from '@/src/lib/ai/rfpProcessing';
import { StreamMessage, sendStreamMessage } from '@/src/lib/chat/utils';

export interface documentAnalysisOptions {
  workspaceId: string;
  uploadedBy: string;
  organizationId?: string;
  file?: File;  // Optional for backwards compatibility
  fileId?: string;  // New: use existing fileId instead of uploading
  entityType?: string;  // Original entityType for file lookup
  entityId?: string;  // Original entityId for file lookup
  userMessage?: string;
  context: {
    chatContext: "dashboard" | "opportunity" | "proposal" | "knowledgeBase";
    dashboardContext?: {
      opportunities: Array<{
        id: string;
        title: string;
        value: number;
        status: string;
        createdAt: string;
      }>;
      totalOpportunities: number;
      pipelineStages: string[];
    };
    opportunityContext?: {
      sections: Array<{
        title: string;
        content: string;
      }>;
      title: string;
      value: number;
      status: string;
    };
    proposalContext?: {
      sections: Array<{
        title: string;
        content: string;
      }>;
      title: string;
      value: number;
      status: string;
    };
    knowledgeBaseContext?: {
      sections: Array<{
        title: string;
        content: string;
      }>;
      title: string;
    };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  progressReporter: (progress: any) => Promise<void>;
}

export interface AnalysisStreamMessage extends StreamMessage {
  fileId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analysisResult?: any;
}

/**
 * Enhanced Dashboard Document Analysis
 * Implements the user's specified workflow:
 * 1. File hashing and cache checking (via ChatFileManager)
 * 2. Document classification with extended types
 * 3. Ask user what they want to do based on classification
 * 4. Different action flows based on document type and user choice
 */
export async function analyzeDocument(
  options: documentAnalysisOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messageController: ReadableStreamDefaultController<any>
): Promise<void> {
  const { uploadedBy, organizationId, file, fileId, context, progressReporter } = options;

  // Validate that we have either file or fileId
  if (!file && !fileId) {
    throw new Error('Either file or fileId must be provided');
  }

  const fileName = file?.name || `file-${fileId}`;
  console.log(`📄 Document analysis started for file: ${fileName} (context: ${context.chatContext})`);

  try {
    // Handle different flows: file upload vs existing fileId
    if (fileId) {
      // NEW FLOW: Analyze existing file using fileId
      await analyzeExistingFile(fileId, options, messageController);
      return;
    }

    if (!file) {
      throw new Error('File is required when fileId is not provided');
    }

    // EXISTING FLOW: Process uploaded file
    const fileManager = new ChatFileManager();
    
    // Send initial message based on context
    const initialMessage: AnalysisStreamMessage = getInitialMessage(file.name, context.chatContext);
    await sendStreamMessage(messageController, initialMessage);

    // Determine entity type and ID based on context
    let entityType: 'workspace' | 'opportunity' | 'proposal' | 'knowledgebase';
    let entityId: string;

    switch (context.chatContext) {
      case 'opportunity':
        entityType = 'opportunity';
        entityId = options.workspaceId; // This should be opportunityId
        break;
      case 'proposal':
        entityType = 'proposal';
        entityId = options.workspaceId; // This should be proposalId
        break;
      case 'knowledgeBase':
        entityType = 'knowledgebase';
        entityId = organizationId || 'default';
        break;
      default: // dashboard
        entityType = 'workspace';
        entityId = organizationId || 'default';
    }

    // Process the file with ChatFileManager (handles hashing, caching, basic analysis)
    const fileAnalysisResult = await fileManager.processUploadedFile(file, {
      entityType,
      entityId,
      uploadedBy,
      organizationId: organizationId || 'default',
      progressCallback: async (progress) => {
        const progressMessage: AnalysisStreamMessage = {
          type: 'progress',
          progress: {
            stage: progress.stage,
            current: Math.round(progress.current * 0.6), // Reserve 40% for context-specific analysis
            total: 100,
            message: progress.message
          }
        };
        await sendStreamMessage(messageController, progressMessage);
        await progressReporter(progressMessage);
      }
    });

    // Handle context-specific analysis
    if (context.chatContext === 'proposal') {
      await handleProposalAnalysis(file, fileAnalysisResult, entityId, messageController, progressReporter, options.userMessage);
    } else if (context.chatContext === 'opportunity') {
      await handleOpportunityAnalysis(file, fileAnalysisResult, entityId, messageController);
    } else {
      // Dashboard/workspace analysis (existing logic)
      await handleDashboardAnalysis(file, fileAnalysisResult, context, messageController);
    }

    // Final progress update
    await sendStreamMessage(messageController, {
      type: 'progress',
      progress: {
        stage: 'complete',
        current: 100,
        total: 100,
        message: 'Analysis complete'
      }
    });

  } catch (error) {
    console.error('Error in document analysis:', error);
    const errorMessage: AnalysisStreamMessage = {
      type: 'error',
      content: 'I encountered an error while analyzing the document. Please try again or contact support if the issue persists.',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    await sendStreamMessage(messageController, errorMessage);
    throw error;
  }
}

/**
 * Get initial message based on context
 */
function getInitialMessage(fileName: string, chatContext: string): AnalysisStreamMessage {
  let content: string;
  
  switch (chatContext) {
    case 'opportunity':
      content = `📄 I've received **${fileName}** and I'm processing it now. You can navigate away and I'll continue working...`;
      break;
    case 'proposal':
      content = `📄 I've received **${fileName}** and I'm analyzing its content. This may take a moment...`;
      break;
    default:
      content = `📄 I've received **${fileName}** and I'm analyzing it. Let me check if I've seen this file before...`;
  }

  return {
    type: 'message',
    role: 'assistant',
    content,
    progress: {
      stage: chatContext === 'dashboard' ? 'hashing' : 'processing',
      current: 0,
      total: 100,
      message: chatContext === 'dashboard' ? 'Checking file hash and cache...' : 'Starting document analysis...'
    }
  };
}

/**
 * Handle proposal-specific analysis
 */
async function handleProposalAnalysis(
  file: File,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fileAnalysisResult: any,
  proposalId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messageController: ReadableStreamDefaultController<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  progressReporter: any,
  userMessage?: string
): Promise<void> {
  // Get the extracted content for proposal-specific processing
  let documentContent = fileAnalysisResult.extractedContent.text;
  
  // Add user message as context if provided
  if (userMessage?.trim()) {
    documentContent = `User Context: ${userMessage}\n\n---\n\n${documentContent}`;
  }

  // Perform enhanced document analysis with progress updates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analysisResult = await enhancedAnalyzeDocument(
    documentContent,
    'proposal',
    proposalId,
    async (progress) => {
      const progressMessage: AnalysisStreamMessage = {
        type: 'progress',
        progress
      };
      await sendStreamMessage(messageController, progressMessage);
      await progressReporter(progressMessage);
    }
  );

  // Send analysis completion message
  const completionMessage: AnalysisStreamMessage = {
    type: 'message',
    role: 'assistant',
    content: `✅ Analysis complete! I found **${analysisResult.sections.length}** sections that match existing proposal sections and **${analysisResult.unmatched.length}** new sections.

**Document Analysis:**
- **Document Type:** ${fileAnalysisResult.classification.documentType} (confidence: ${Math.round(fileAnalysisResult.classification.confidence)}%)
- **Analysis Source:** ${fileAnalysisResult.wasFromCache ? `Cached (${fileAnalysisResult.cacheTimestamp})` : 'Fresh Analysis'}
- **Content Chunks:** ${fileAnalysisResult.chunks.length}

${fileAnalysisResult.wasFromCache ? '*ℹ️ This analysis was retrieved from cache. If the document type seems incorrect, use the reprocessing option below.*' : ''}`
  };
  await sendStreamMessage(messageController, completionMessage);

  // Generate next steps message based on document type
  const nextStepsMessage = getProposalNextStepsMessage(analysisResult);

  const nextStepsResponse: AnalysisStreamMessage = {
    type: 'message',
    role: 'assistant',
    content: nextStepsMessage,
    metadata: {
      analysisResult: {
        matchedSections: analysisResult.sections.length,
        unmatchedSections: analysisResult.unmatched.length,
        documentType: analysisResult.documentType
      },
      actions: [
        {
          label: 'Apply All Matches',
          action: 'apply_matches',
          description: `Update ${analysisResult.sections.length} sections with extracted content`
        },
        {
          label: 'Review Before Applying',
          action: 'review_matches',
          description: 'Show me what will be changed before applying'
        },
        {
          label: 'Handle Unmatched Content',
          action: 'handle_unmatched',
          description: `Organize ${analysisResult.unmatched.length} unmatched sections`
        },
        {
          label: 'Reprocess Document',
          action: 'reprocess_document',
          description: 'If the analysis is incorrect, reprocess with feedback',
          data: {
            fileId: fileAnalysisResult.fileId,
            fileName: file.name,
            currentAnalysis: {
              documentType: fileAnalysisResult.classification.documentType,
              confidence: fileAnalysisResult.classification.confidence
            }
          }
        }
      ]
    }
  };
  await sendStreamMessage(messageController, nextStepsResponse);

  // Store analysis results for later use
  const storageMessage: AnalysisStreamMessage = {
    type: 'storage',
    fileId: `temp_${Date.now()}`,
    analysisResult
  };
  await sendStreamMessage(messageController, storageMessage);

  // Create embeddings for semantic sections in the background
  if (analysisResult.sections.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const semanticSections = analysisResult.sections.map((section: any) => ({
      title: section.title,
      keywords: section.keywords,
      content: section.content
    }));
    
    createSemanticSectionEmbeddings(
      `chat_${Date.now()}`,
      'proposal',
      proposalId,
      semanticSections
    ).catch(error => {
      console.error('Background embedding creation failed:', error);
    });
  }
}

/**
 * Handle opportunity-specific analysis
 */
async function handleOpportunityAnalysis(
  file: File,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fileAnalysisResult: any,
  opportunityId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messageController: ReadableStreamDefaultController<any>
): Promise<void> {
  // Generate AI-powered content summary
  const contentSummary = fileAnalysisResult.summary?.executiveSummary || 
    await generateDocumentSummary(fileAnalysisResult.extractedContent.text, file.name);

  // Send completion message
  const completionMessage: AnalysisStreamMessage = {
    type: 'message',
    role: 'assistant',
    content: `✅ **${file.name}** has been successfully processed and added to your knowledge base!

**Processing Summary:**
- **Document Type:** ${fileAnalysisResult.classification.documentType} (confidence: ${Math.round(fileAnalysisResult.classification.confidence)}%)
- **Content Extracted:** ${fileAnalysisResult.extractedContent.text.length.toLocaleString()} characters
- **Chunks Created:** ${fileAnalysisResult.chunks.length}
- **Semantic Sections:** ${fileAnalysisResult.semanticSections?.length || 0}
- **Analysis Source:** ${fileAnalysisResult.wasFromCache ? `Cached (${fileAnalysisResult.cacheTimestamp})` : 'Fresh Analysis'}

**Content Summary:**
${contentSummary}

${fileAnalysisResult.wasFromCache ? '\n*ℹ️ This analysis was retrieved from cache. If the document type or content seems incorrect, use the "Reprocess Document" action below.*' : ''}`,
    metadata: {
      analysisResult: {
        matchedSections: 0,
        unmatchedSections: fileAnalysisResult.semanticSections?.length || 0,
        documentType: fileAnalysisResult.classification.documentType
      },
      uploadedFiles: [
        {
          fileId: fileAnalysisResult.fileId,
          originalName: file.name,
          fileType: 'unknown'
        }
      ],
      actions: [
        {
          label: 'View in Knowledge Base',
          action: 'view_knowledge_base',
          description: 'See the processed document in the Knowledge Base tab',
          data: {
            fileId: fileAnalysisResult.fileId,
            fileName: file.name
          }
        }
      ]
    }
  };
  await sendStreamMessage(messageController, completionMessage);

  // Provide next steps with action buttons
  const nextStepsMessage = `🚀 **You can now ask me questions about this document!** 

I'll use vector search to find relevant sections and provide intelligent answers. Try asking things like:
• "What are the key requirements in this document?"
• "What timeline is mentioned?"
• "Who are the stakeholders involved?"

**Additional Actions:**`;

  const actions = [
    {
      label: 'Identify Organizations & Contacts',
      action: 'identify_entities',
      description: 'Extract and identify organizations and contacts mentioned in this document'
    },
    {
      label: 'Enhance Opportunity',
      action: 'enhance_opportunity',
      description: 'Apply insights from this document to your opportunity sections'
    },
    {
      label: 'Reprocess Document',
      action: 'reprocess_document',
      description: 'If the analysis is incorrect, reprocess with feedback',
      data: {
        fileId: fileAnalysisResult.fileId,
        fileName: file.name,
        currentAnalysis: {
          documentType: fileAnalysisResult.classification.documentType,
          confidence: fileAnalysisResult.classification.confidence
        }
      }
    }
  ];

  // Add proposal enhancement if proposals exist (TODO: check database)
  const hasProposals = true;
  if (hasProposals) {
    actions.push({
      label: 'Enhance Proposal',
      action: 'enhance_proposal', 
      description: 'Apply insights from this document to enhance your proposal content'
    });
  }

  const nextStepsResponse: AnalysisStreamMessage = {
    type: 'message',
    role: 'assistant', 
    content: nextStepsMessage,
    metadata: {
      analysisResult: {
        matchedSections: 0,
        unmatchedSections: fileAnalysisResult.semanticSections?.length || 0,
        documentType: fileAnalysisResult.classification.documentType,
        fileId: fileAnalysisResult.fileId,
        fileName: file.name
      },
      uploadedFiles: [
        {
          fileId: fileAnalysisResult.fileId,
          originalName: file.name,
          fileType: 'unknown'
        }
      ],
      actions
    }
  };
  await sendStreamMessage(messageController, nextStepsResponse);
}

/**
 * Handle dashboard-specific analysis (existing logic)
 */
async function handleDashboardAnalysis(
  file: File,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fileAnalysisResult: any,
  context: documentAnalysisOptions['context'],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messageController: ReadableStreamDefaultController<any>
): Promise<void> {
    // Step 2: Enhanced document classification
    await sendStreamMessage(messageController, {
      type: 'progress',
      progress: {
        stage: 'classifying',
        current: 60,
        total: 100,
        message: 'Classifying document type...'
      }
    });

    const detailedClassification = await classifyDocument(
      file.name,
      fileAnalysisResult.extractedContent.text,
      []
    );

  // Check if this is an RFP document and handle with specialized processing
  if (detailedClassification.documentType === 'rfp') {
    console.log('🏢 Detected RFP document, processing with specialized RFP analysis');
    await handleRFPAnalysis(file, messageController, context);
    return;
  }

    // Step 3: Present classification and ask user what to do
    const classificationMessage = generateClassificationMessage(
      file.name,
      detailedClassification,
      fileAnalysisResult.wasFromCache,
      context
    );

    await sendStreamMessage(messageController, classificationMessage);

    // Step 4: Generate action options based on document type
    const actionOptions = generateActionOptions(
      detailedClassification.documentType,
      fileAnalysisResult.fileId,
      file.name,
      context
    );

    const actionMessage: AnalysisStreamMessage = {
      type: 'message',
      role: 'assistant',
      content: generateActionPrompt(detailedClassification.documentType),
      metadata: {
        analysisResult: {
          documentType: detailedClassification.documentType,
          fileId: fileAnalysisResult.fileId,
          fileName: file.name,
          confidence: detailedClassification.confidence,
          wasFromCache: fileAnalysisResult.wasFromCache,
          classification: detailedClassification
        },
        uploadedFiles: [
          {
            fileId: fileAnalysisResult.fileId,
            originalName: file.name,
            fileType: detailedClassification.documentType
          }
        ],
        actions: actionOptions
      }
    };

    await sendStreamMessage(messageController, actionMessage);
}

/**
 * Generate classification message based on document type
 */
function generateClassificationMessage(
  fileName: string,
  classification: Awaited<ReturnType<typeof classifyDocument>>,
  wasFromCache: boolean,
  context: documentAnalysisOptions['context']
): AnalysisStreamMessage {
  const cacheInfo = wasFromCache ? ' (using cached analysis)' : '';
  
  // Normalize confidence to percentage if it's a decimal (handles both 0.94 and 94 formats)
  const normalizedConfidence = classification.confidence <= 1 
    ? Math.round(classification.confidence * 100) 
    : Math.round(classification.confidence);
    
  const confidenceLevel = normalizedConfidence >= 80 ? 'high' : normalizedConfidence >= 60 ? 'medium' : 'low';
  
  let typeDescription = '';
  switch (classification.documentType) {
    case 'rfp':
      typeDescription = 'Request for Proposal (RFP) - a client document soliciting bids for a project';
      break;
    case 'requirements':
      typeDescription = 'Requirements Document - specifications and needs for a project';
      break;
    case 'proposal':
      typeDescription = 'Proposal Document - a response or proposal for a project';
      break;
    case 'transcript':
      typeDescription = 'Meeting/Call Transcript - conversation notes from meetings or calls';
      break;
    case 'service_offering':
      typeDescription = 'Service Offering - description of services, capabilities, or offerings';
      break;
    case 'methodology':
      typeDescription = 'Methodology Document - processes, frameworks, or procedural guides';
      break;
    case 'case_study':
      typeDescription = 'Case Study - client success story or project example';
      break;
    case 'testimonials':
      typeDescription = 'Testimonials - client feedback, reviews, or recommendations';
      break;
    case 'ideation':
      typeDescription = 'Ideation Document - brainstorming notes or preliminary ideas';
      break;
    case 'reference':
      typeDescription = 'Reference Material - supporting documentation or background information';
      break;
    default:
      typeDescription = 'Mixed or unclear content type';
  }

  let opportunityMatchInfo = '';
  if (context.chatContext === "dashboard") {
    opportunityMatchInfo = context.dashboardContext?.opportunities?.length 
      ? `\n\nI notice you have ${context.dashboardContext.opportunities.length} existing opportunities in your workspace that I can potentially match this document to.`
      : '';
  } 

  return {
    type: 'message',
    role: 'assistant',
    content: `📋 **Document Classification Complete${cacheInfo}**

I've analyzed **${fileName}** and determined it's a **${typeDescription}**.

**Analysis Details:**
- **Type:** ${classification.documentType.replace('_', ' ').toUpperCase()}
- **Confidence:** ${normalizedConfidence}% (${confidenceLevel})
- **Priority:** ${classification.priority.toUpperCase()}
- **Key Topics:** ${classification.keyTopics.join(', ') || 'None identified'}

**Reasoning:** ${classification.reasoning}${opportunityMatchInfo}`,
    progress: {
      stage: 'classified',
      current: 80,
      total: 100,
      message: `Classified as ${classification.documentType}`
    }
  };
}

/**
 * Generate action options based on document type
 */
function generateActionOptions(
  documentType: string,
  fileId: string,
  fileName: string,
  context: documentAnalysisOptions['context']
): Array<{ action: string; label: string; description: string; data?: unknown }> {
  const baseActions = [];

  // Type-specific primary actions
  switch (documentType) {
    case 'rfp':
    case 'requirements':
    case 'transcript':
      // High-priority documents that typically create or match opportunities
      if (context.dashboardContext?.opportunities?.length) {
        baseActions.push({
          action: 'match_to_opportunity',
          label: 'Match to Existing Opportunity',
          description: `Find and link this ${documentType} to an existing opportunity`,
          data: { 
            fileId, 
            fileName, 
            documentType,
            opportunities: context.dashboardContext.opportunities 
          }
        });
      }
      
      baseActions.push({
        action: 'create_new_opportunity',
        label: 'Create New Opportunity',
        description: `Create a new opportunity based on this ${documentType}`,
        data: { fileId, fileName, documentType }
      });
      break;

    case 'proposal':
      // Proposals typically match to opportunities but don't create new ones
      if (context.dashboardContext?.opportunities?.length) {
        baseActions.push({
          action: 'match_to_opportunity',
          label: 'Match to Existing Opportunity',
          description: 'Link this proposal to an existing opportunity',
          data: { 
            fileId, 
            fileName, 
            documentType,
            opportunities: context.dashboardContext.opportunities 
          }
        });
      }
      
      baseActions.push({
        action: 'extract_entities',
        label: 'Extract Organizations & Contacts',
        description: 'Extract client organizations and contacts from this proposal',
        data: { fileId, fileName, documentType }
      });
      break;

    case 'service_offering':
    case 'methodology':
    case 'case_study':
    case 'testimonials':
      // Knowledge base content
      baseActions.push({
        action: 'extract_content_for_knowledge_base',
        label: `Extract ${documentType.replace('_', ' ').toTitleCase()}`,
        description: `Extract and store ${documentType.replace('_', ' ')} content in your knowledge base`,
        data: { fileId, fileName, documentType }
      });
      
      baseActions.push({
        action: 'extract_entities',
        label: 'Extract Organizations & Contacts',
        description: `Extract any organizations and contacts mentioned in this ${documentType.replace('_', ' ')}`,
        data: { fileId, fileName, documentType }
      });
      break;

    default:
      // Generic options for unclear documents
      baseActions.push({
        action: 'extract_entities',
        label: 'Extract Organizations & Contacts',
        description: 'Extract any organizations and contacts from this document',
        data: { fileId, fileName, documentType }
      });
  }

  // Add universal actions
  baseActions.push({
    action: 'add_to_knowledge_base',
    label: 'Add to Knowledge Base',
    description: 'Store this document in your knowledge base for future reference',
    data: { fileId, fileName, documentType }
  });

  baseActions.push({
    action: 'reprocess_document',
    label: 'Reprocess Document',
    description: 'If the classification is incorrect, reprocess with feedback',
    data: { fileId, fileName, documentType }
  });

  return baseActions;
}

/**
 * Generate action prompt based on document type
 */
function generateActionPrompt(documentType: string): string {
  const typeSpecificPrompts = {
    rfp: "This RFP contains project requirements. You can match it to an existing opportunity or create a new one to track this potential project.",
    requirements: "This requirements document specifies project needs. You can match it to an existing opportunity or create a new one.",
    transcript: "This transcript contains valuable conversation insights. You can match it to an existing opportunity or create a new one if it represents a new project.",
    proposal: "This proposal document can be matched to an existing opportunity or analyzed for organizations and contacts.",
    service_offering: "This service offering can be extracted to your knowledge base for reuse in future proposals.",
    methodology: "This methodology can be stored in your knowledge base for consistent process documentation.",
    case_study: "This case study can be added to your knowledge base for showcasing capabilities.",
    testimonials: "These testimonials can be stored in your knowledge base for social proof in proposals.",
    ideation: "This ideation document contains ideas that might be useful for proposal development.",
    reference: "This reference material can be stored for future use.",
    other: "I can help you extract useful information from this document."
  };

  const prompt = typeSpecificPrompts[documentType as keyof typeof typeSpecificPrompts] || typeSpecificPrompts.other;

  return `🎯 **What would you like to do with this document?**

${prompt}

**Available Actions:**
Choose one of the actions below to proceed. Each action will use the existing document analysis and cached data for fast processing.`;
}

/**
 * Handle RFP-specific analysis with specialized processing
 */
async function handleRFPAnalysis(
  file: File,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messageController: ReadableStreamDefaultController<any>,
  context: documentAnalysisOptions['context']
): Promise<void> {
  try {
    // Send initial RFP message
    await sendStreamMessage(messageController, {
      type: 'message',
      role: 'assistant',
      content: `🏢 **Starting RFP Analysis: ${file.name}**\n\nI'm analyzing this RFP document to extract key information, match to opportunities, and provide strategic recommendations...`,
      progress: {
        stage: 'starting',
        current: 60,
        total: 100,
        message: 'Initializing RFP analysis...'
      }
    });

    // Process the RFP document using the specialized service
    const result = await rfpProcessingService.processRFPDocument({
      file,
      uploadedBy: context.dashboardContext ? 'dashboard-user' : 'unknown', // TODO: get from session
      organizationId: 'default', // TODO: get from session
      enableOpportunityMatching: true,
      progressReporter: async (progress) => {
        // Convert RFP progress to stream message
        await sendStreamMessage(messageController, {
          type: 'progress',
          progress: {
            stage: progress.stage,
            current: Math.max(60, progress.current), // Start from 60% since we reserved 40% for this
            total: 100,
            message: progress.message
          },
          metadata: progress.metadata
        });
      }
    });

    // Generate comprehensive RFP analysis response
    const analysisResponse = await generateRFPAnalysisResponse(result, file.name);
    
    // Send final analysis message
    await sendStreamMessage(messageController, {
      type: 'message',
      role: 'assistant',
      content: analysisResponse.content,
      metadata: {
        rfpAnalysis: result,
        actions: analysisResponse.actions,
        opportunityRecommendations: result.opportunityRecommendation,
        extractedEntities: result.extractedEntities,
        processingStats: result.processingMetadata
      }
    });

    console.log(`✅ RFP analysis completed for ${file.name}`);

  } catch (error) {
    console.error('Error in RFP document analysis:', error);
    
    // Handle specific error types with appropriate messages
    let errorContent = `❌ **RFP Analysis Failed**\n\n`;
    
    if (error instanceof Error && error.message.includes('Document too large')) {
      errorContent += `The RFP document is too large to process in its current form. `;
      errorContent += `The document contains approximately ${error.message.match(/~([0-9,]+) tokens/)?.[1] || 'many'} tokens, `;
      errorContent += `which exceeds our current processing limits.\n\n`;
      errorContent += `**Recommendations:**\n`;
      errorContent += `• Try breaking the document into smaller sections\n`;
      errorContent += `• Remove any unnecessary appendices or attachments\n`;
      errorContent += `• Contact support for assistance with large RFP processing\n`;
    } else {
      errorContent += `I encountered an error while analyzing the RFP document: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`;
      errorContent += `Please try uploading the document again or contact support if the issue persists.`;
    }
    
    // Send error as a regular message
    await sendStreamMessage(messageController, {
      type: 'message',
      role: 'assistant',
      content: errorContent,
      metadata: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error && error.message.includes('Document too large') ? 'document_too_large' : 'processing_error',
        actions: [
          {
            label: 'Try Again',
            action: 'retry_analysis',
            description: 'Retry the RFP analysis'
          }
        ]
      }
    });
  }
}

/**
 * Generate comprehensive RFP analysis response message
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateRFPAnalysisResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any,
  filename: string
): Promise<{
  content: string;
  actions: Array<{ label: string; action: string; description: string }>;
}> {
  const { documentSummary, opportunityRecommendation, semanticAnalysis, extractedEntities, processingMetadata } = result;

  let responseContent = `🏢 **RFP Analysis Complete: ${filename}**\n\n`;

  // Document Summary Section
  responseContent += `## 📋 Document Summary\n\n`;
  responseContent += `**Title:** ${documentSummary.title}\n\n`;
  responseContent += `**Executive Summary:**\n${documentSummary.executiveSummary}\n\n`;
  
  if (documentSummary.projectScope) {
    responseContent += `**Project Scope:**\n${documentSummary.projectScope}\n\n`;
  }

  // Key Requirements
  if (documentSummary.keyRequirements.length > 0) {
    responseContent += `**Key Requirements:**\n`;
    documentSummary.keyRequirements.forEach((req: string) => {
      responseContent += `• ${req}\n`;
    });
    responseContent += '\n';
  }

  // Timeline and Budget
  if (documentSummary.timeline || documentSummary.budget || documentSummary.submissionDeadline) {
    responseContent += `**Important Details:**\n`;
    if (documentSummary.timeline) responseContent += `• **Timeline:** ${documentSummary.timeline}\n`;
    if (documentSummary.budget) responseContent += `• **Budget:** ${documentSummary.budget}\n`;
    if (documentSummary.submissionDeadline) responseContent += `• **Submission Deadline:** ${documentSummary.submissionDeadline}\n`;
    responseContent += '\n';
  }

  // Opportunity Recommendations
  responseContent += `## 🎯 Opportunity Recommendations\n\n`;
  
  if (opportunityRecommendation.matchedOpportunities.length > 0) {
    responseContent += `**Existing Opportunity Matches:**\n`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    opportunityRecommendation.matchedOpportunities.forEach((match: any, index: number) => {
      responseContent += `${index + 1}. **${match.title}** (${match.confidence}% match)\n`;
      responseContent += `   ${match.reasoning}\n\n`;
    });
  }

  if (opportunityRecommendation.shouldCreateNew) {
    responseContent += `**💡 New Opportunity Recommended:**\n`;
    responseContent += `• **Title:** ${opportunityRecommendation.recommendedTitle}\n`;
    responseContent += `• **Priority:** ${opportunityRecommendation.priority?.toUpperCase()}\n`;
    if (opportunityRecommendation.estimatedValue) {
      responseContent += `• **Estimated Value:** $${opportunityRecommendation.estimatedValue.toLocaleString()}\n`;
    }
    responseContent += '\n';
  }

  // Semantic Analysis
  responseContent += `## 🔍 Document Analysis\n\n`;
  responseContent += `**Document Type:** ${semanticAnalysis.documentType.replace(/_/g, ' ').toUpperCase()} (${semanticAnalysis.confidence}% confidence)\n\n`;
  
  if (semanticAnalysis.keyTopics.length > 0) {
    responseContent += `**Key Topics:** ${semanticAnalysis.keyTopics.join(', ')}\n\n`;
  }

  // Technical Requirements
  if (semanticAnalysis.technicalRequirements.length > 0) {
    responseContent += `**Technical Requirements:**\n`;
    semanticAnalysis.technicalRequirements.forEach((req: string) => {
      responseContent += `• ${req}\n`;
    });
    responseContent += '\n';
  }

  // Compliance Requirements
  if (semanticAnalysis.complianceRequirements.length > 0) {
    responseContent += `**Compliance Requirements:**\n`;
    semanticAnalysis.complianceRequirements.forEach((req: string) => {
      responseContent += `• ${req}\n`;
    });
    responseContent += '\n';
  }

  // Extracted Entities Summary
  const entityCount = extractedEntities.organizations.length + extractedEntities.contacts.length;
  if (entityCount > 0) {
    responseContent += `## 📇 Extracted Information\n\n`;
    
    if (extractedEntities.organizations.length > 0) {
      responseContent += `**Organizations (${extractedEntities.organizations.length}):** `;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      responseContent += extractedEntities.organizations.map((org: any) => `${org.name} (${org.role})`).join(', ');
      responseContent += '\n\n';
    }

    if (extractedEntities.contacts.length > 0) {
      responseContent += `**Contacts (${extractedEntities.contacts.length}):** `;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      responseContent += extractedEntities.contacts.map((contact: any) => contact.name).join(', ');
      responseContent += '\n\n';
    }

    if (extractedEntities.dates.length > 0) {
      responseContent += `**Important Dates:**\n`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      extractedEntities.dates.forEach((date: any) => {
        responseContent += `• ${date.description}: ${date.date}\n`;
      });
      responseContent += '\n';
    }
  }

  // Processing Stats
  responseContent += `## 📊 Processing Summary\n\n`;
  responseContent += `• **File Size:** ${(processingMetadata.originalFileSize / 1024 / 1024).toFixed(2)} MB\n`;
  responseContent += `• **Processing Time:** ${(processingMetadata.processingTime / 1000).toFixed(1)} seconds\n`;
  responseContent += `• **Tokens Used:** ${processingMetadata.actualTokensUsed.toLocaleString()}\n`;
  responseContent += `• **Content Chunks:** ${processingMetadata.chunkCount}\n`;

  if (processingMetadata.warnings.length > 0) {
    responseContent += `\n**Warnings:**\n`;
    processingMetadata.warnings.forEach((warning: string) => {
      responseContent += `⚠️ ${warning}\n`;
    });
  }

  // Generate action buttons
  const actions = [
    {
      label: 'View Full Analysis',
      action: 'view_rfp_analysis',
      description: 'View detailed RFP analysis with all extracted information'
    }
  ];

  // Add opportunity-related actions
  if (opportunityRecommendation.shouldCreateNew) {
    actions.push({
      label: 'Create New Opportunity',
      action: 'create_opportunity_from_rfp',
      description: 'Create a new opportunity based on this RFP analysis'
    });
  }

  if (opportunityRecommendation.matchedOpportunities.length > 0) {
    actions.push({
      label: 'Add to Existing Opportunity',
      action: 'add_rfp_to_opportunity',
      description: 'Add this RFP analysis to an existing opportunity'
    });
  }

  // Add entity extraction actions
  if (entityCount > 0) {
    actions.push({
      label: 'Import Organizations & Contacts',
      action: 'import_rfp_entities',
      description: `Import ${entityCount} organizations and contacts from the RFP`
    });
  }

  // Add document actions
  actions.push({
    label: 'Generate Response Template',
    action: 'generate_rfp_response_template',
    description: 'Create a proposal response template based on RFP requirements'
  });

  return {
    content: responseContent,
    actions
  };
}

/**
 * Generate proposal-specific next steps message
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getProposalNextStepsMessage(analysisResult: any): string {
  if (analysisResult.documentType === 'requirements') {
    return `📋 This appears to be a **requirements document**. For your proposal, I can:

1. **Extract Requirements**: Identify key requirements you need to address
2. **Update Relevant Sections**: Apply requirements to appropriate proposal sections like scope, approach, and deliverables
3. **Create Compliance Matrix**: Map your proposal sections to specific requirements

This will help ensure your proposal fully addresses all requirements. How would you like to proceed?`;
  } else if (analysisResult.documentType === 'proposal') {
    return `📝 This appears to be another **proposal document**. I can help you:

1. **Compare Approaches**: Analyze different approaches and methodologies
2. **Extract Best Practices**: Find good examples for improving your proposal
3. **Identify Gaps**: Compare content to see what you might be missing
4. **Update Sections**: Apply relevant improvements to your proposal sections

What aspect would you like me to focus on?`;
  } else {
    return `📄 I've analyzed the document content. I can:

1. **Apply Matches**: Update ${analysisResult.sections.length} existing sections with relevant content
2. **Review Content**: Show you ${analysisResult.unmatched.length} pieces of content that might enhance other sections
3. **Improve Structure**: Help you organize content to strengthen your proposal

How would you like to proceed?`;
  }
}

/**
 * Analyze existing file using fileId (new architecture)
 */
async function analyzeExistingFile(
  fileId: string,
  options: documentAnalysisOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messageController: ReadableStreamDefaultController<any>
): Promise<void> {
  const { context, organizationId } = options;

  // Use passed entityType/entityId if available, otherwise derive from context
  let entityType: 'workspace' | 'opportunity' | 'proposal' | 'knowledgebase';
  let entityId: string;

  if (options.entityType && options.entityId) {
    // Use the original storage location parameters
    entityType = options.entityType as 'workspace' | 'opportunity' | 'proposal' | 'knowledgebase';
    entityId = options.entityId;
  } else {
    // Fallback to deriving from context (for backward compatibility)
    switch (context.chatContext) {
      case 'opportunity':
        entityType = 'opportunity';
        entityId = options.workspaceId;
        break;
      case 'proposal':
        entityType = 'proposal';
        entityId = options.workspaceId;
        break;
      case 'knowledgeBase':
        entityType = 'knowledgebase';
        entityId = organizationId || 'default';
        break;
      default: // dashboard
        entityType = 'workspace';
        entityId = options.workspaceId;
    }
  }

  // Get file metadata and content from database
  const { getFileMetadata } = await import('@/src/lib/database/prisma/fileData');
  const fileMetadata = await getFileMetadata(fileId, entityType, entityId);
  
  if (!fileMetadata || typeof fileMetadata !== 'object') {
    throw new Error(`File ${fileId} not found or no content available`);
  }

  const data = fileMetadata as Record<string, unknown>;
  const extractedContent = data.extractedContentText as string;
  
  if (!extractedContent) {
    throw new Error(`No extracted content found for file ${fileId}`);
  }

  // Send initial message
  await sendStreamMessage(messageController, {
    type: 'message',
    role: 'assistant',
    content: `📄 **Analyzing Document: ${fileId}**\n\nRetrieving file content and performing analysis...`,
    progress: {
      stage: 'loading',
      current: 10,
      total: 100,
      message: 'Loading file content...'
    }
  });

  // Perform simplified analysis since content is already processed
  await sendStreamMessage(messageController, {
    type: 'progress',
    progress: {
      stage: 'analyzing',
      current: 60,
      total: 100,
      message: 'Performing context-specific analysis...'
    }
  });

  // Get document type from metadata
  let documentType = 'document';
  if (data.analysis && typeof data.analysis === 'object') {
    const analysis = data.analysis as Record<string, unknown>;
    documentType = analysis.documentType as string || 'document';
  }

  // Simple completion message with actions
  const actionOptions = generateActionOptions(documentType, fileId, `file-${fileId}`, context);

  const completionMessage: AnalysisStreamMessage = {
    type: 'message',
    role: 'assistant',
    content: `✅ **Analysis Complete for ${fileId}**\n\n**Document Type:** ${documentType}\n**Content Length:** ${extractedContent.length.toLocaleString()} characters\n\nThis document is ready for analysis. What would you like to do?`,
    metadata: {
      analysisResult: {
        documentType,
        fileId,
        fileName: `file-${fileId}`,
        confidence: 0.8,
        wasFromCache: true
      },
      uploadedFiles: [
        {
          fileId,
          originalName: `file-${fileId}`,
          fileType: documentType
        }
      ],
      actions: actionOptions
    }
  };

  await sendStreamMessage(messageController, completionMessage);

  await sendStreamMessage(messageController, {
    type: 'progress',
    progress: {
      stage: 'complete',
      current: 100,
      total: 100,
      message: 'Analysis complete'
    }
  });
}

// Utility function for title case
declare global {
  interface String {
    toTitleCase(): string;
  }
}

String.prototype.toTitleCase = function(): string {
  return this.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}; 
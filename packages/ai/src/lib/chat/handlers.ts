import { NextResponse } from 'next/server';
import { analyzeIntent, dispatchChatAction, ChatContext } from '@/src/lib/ai/chatDispatcher';
import { checkOpportunityPermission, checkProposalPermission } from '@/src/lib/database';
import { searchKnowledgeBase } from '@/src/lib/ai/contentExtraction';
import { analyzeDocument } from './documentAnalysis';
import { extractEntitiesFromCSV as extractCSVEntities } from '@/src/lib/ai/documentExtraction';
import { documentActionHandlers } from './documentActionHandlers';
import { parseCSVContent, determineFileType } from './utils';

export interface ChatRequestData {
  entityType: string;
  entityId: string;
  message?: string;
  file?: File;
  tabContext?: string;
  tabLabel?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentContent?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recentMessages?: any[];
  question?: string;
  fileId?: string;
  fileName?: string;
  sseSessionId?: string; // Add SSE session ID support
  action?: string; // Action type for enhanced document actions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any; // Additional data for actions
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
}

export interface SessionData {
  user: {
    contact?: {
      id: string;
    } | null;
    role?: string | null;
    activeOrganizationId?: string | null;
  };
}

// Types for analysis results
interface OpportunityData {
  id?: string; // Temporary ID for linking
  title: string;
  value?: number | null;
  status?: string;
  description?: string | null;
  contactId?: string; // Link to associated contact
  organizationId?: string; // Link to associated organization
  estimatedHours?: number | null;
  deadline?: string | null;
  priority?: string | null;
  tags?: string[];
  // New fields for CSV import
  notes?: string | null;
  actionItem?: string | null;
  lastContact?: string | null;
  stage?: string | null;
}

interface ContactData {
  id?: string; // Temporary ID for linking
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  organization?: string | null;
  organizationId?: string; // Link to associated organization
  linkedin?: string | null;
  skills?: string[];
}

interface OrganizationData {
  id?: string; // Temporary ID for linking
  name: string;
  website?: string | null;
  sector?: string | null;
  size?: string | null;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;
  description?: string | null;
}

interface AnalysisResults {
  documentType: string;
  confidence: number;
  opportunities?: OpportunityData[];
  contacts?: ContactData[];
  organizations?: OrganizationData[];
  keyTopics?: string[];
  suggestedSections?: string[];
  shouldUpdateSections?: boolean;
  totalRows?: number;
  headers?: string[];
  error?: string;
}

/**
 * Handle chat message requests
 */
export async function handleChatMessage(requestData: ChatRequestData, session: SessionData) {
  const { entityType, entityId, message, tabContext, tabLabel, currentContent, recentMessages } = requestData;

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  if (!session.user.contact?.id) {
    return NextResponse.json({ error: 'User contact ID not found' }, { status: 401 });
  }

  // Use specific chat handlers to preserve exact behavior
//   if (entityType === 'opportunity') {
//     const result = await handleOpportunityChat({
//       opportunityId: entityId,
//       contactId: session.user.contact.id,
//       message,
//       action: 'chat',
//       additionalData: { tabContext, tabLabel, currentContent, recentMessages }
//     });
    
//     return NextResponse.json({
//       success: true,
//       response: result.response,
//       searchResults: result.searchResults,
//       knowledgeBaseStats: result.knowledgeBaseStats,
//       metadata: {
//         tabContext,
//         processingTime: Date.now()
//       }
//     });
//   } else if (entityType === 'proposal') {
//     const result = await handleProposalChat({
//       proposalId: entityId,
//       contactId: session.user.contact.id,
//       message,
//       action: 'chat',
//       additionalData: { tabContext, tabLabel, currentContent, recentMessages }
//     });
    
//     return NextResponse.json({
//       success: true,
//       response: result.response,
//       searchResults: result.searchResults,
//       knowledgeBaseStats: result.knowledgeBaseStats,
//       metadata: {
//         tabContext,
//         processingTime: Date.now()
//       }
//     });
//   } else {
    // Fallback to the generic chat dispatcher for other entity types
    const context: ChatContext = {
      entityType: entityType as 'opportunity' | 'proposal',
      entityId,
      tabContext: tabContext || undefined,
      tabLabel: tabLabel || undefined,
      currentContent: currentContent || [],
      userRole: session.user.role || undefined,
      userContactId: session.user.contact.id,
      recentMessages: recentMessages || []
    };

    console.log('Processing unified chat message:', {
      message: message.substring(0, 100) + '...',
      entityType,
      entityId,
      tabContext
    });

    // Analyze intent and dispatch
    const intent = await analyzeIntent(message, context);
    console.log("Intent:", intent);
    const result = await dispatchChatAction(intent, message, context);

    return {
      success: true,
      response: result.response,
      intent: {
        action: intent.action,
        confidence: intent.confidence,
        needsFollowUp: intent.needsFollowUp
      },
      actions: result.actions || [],
      metadata: {
        ...result.metadata,
        tabContext,
        processingTime: Date.now()
      }
    };
  }
// }

/**
 * Handle enhanced document actions
 */
export async function handleDocumentAction(requestData: ChatRequestData, session: SessionData) {
  const { action, fileId, fileName, data } = requestData;

  if (!action) {
    return NextResponse.json({ error: 'Action is required' }, { status: 400 });
  }

  if (!session.user.contact?.id) {
    return NextResponse.json({ error: 'User contact ID not found' }, { status: 401 });
  }

  console.log(`🔄 Document action: ${action} for file ${fileName || fileId}`);

  // Create streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const actionRequest = {
          action: action,
          fileId: fileId || '',
          fileName: fileName || '',
          documentType: data?.documentType || 'unknown',
          organizationId: session.user.activeOrganizationId || undefined,
          uploadedBy: session.user.contact!.id,
          data: data
        };

        switch (action) {
          case 'match_opportunity':
            await documentActionHandlers.handleOpportunityMatching(actionRequest, controller);
            break;
          case 'confirm_opportunity_match':
            await documentActionHandlers.handleConfirmOpportunityMatch(actionRequest, controller);
            break;
          case 'create_new_opportunity':
            await documentActionHandlers.handleCreateNewOpportunity(actionRequest, controller);
            break;
          case 'extract_entities':
            await documentActionHandlers.handleEntityExtraction(actionRequest, controller);
            break;
          case 'add_to_knowledge_base':
            await documentActionHandlers.handleAddToKnowledgeBase(actionRequest, controller);
            break;
          case 'confirm_extract_services':
            await documentActionHandlers.handleConfirmExtractServices(actionRequest, controller);
            break;
          case 'confirm_extract_methodologies':
            await documentActionHandlers.handleConfirmExtractMethodologies(actionRequest, controller);
            break;
          case 'confirm_extract_case_studies':
            await documentActionHandlers.handleConfirmExtractCaseStudies(actionRequest, controller);
            break;
          case 'confirm_extract_testimonials':
            await documentActionHandlers.handleConfirmExtractTestimonials(actionRequest, controller);
            break;
          default:
            throw new Error(`Unknown document action: ${action}`);
        }

        controller.close();
      } catch (error) {
        console.error('Error in document action:', error);
        const errorMessage = {
          type: 'error',
          content: 'I encountered an error processing this action. Please try again.',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * Handle document analysis requests with streaming response
 */
export async function handleDocumentAnalysis(requestData: ChatRequestData, session: SessionData) {
  const { entityType, entityId, file, message } = requestData;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!session.user.contact?.id) {
    return NextResponse.json({ error: 'User contact ID not found' }, { status: 401 });
  }

  console.log(`📄 Unified document analysis for ${entityType}: ${file.name}`);

  // Create streaming response using the specific library functions
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (entityType === 'opportunity') {
          await analyzeDocument(
            {
              workspaceId: entityId, // This is actually the opportunityId
              uploadedBy: session.user.contact!.id,
              organizationId: session.user.activeOrganizationId || undefined,
              file,
              context: {
                chatContext: "opportunity"
              },
              progressReporter: async () => {
                // Progress is already handled in the library function
              }
            },
            controller
          );
        } else if (entityType === 'proposal') {
          await analyzeDocument(
            {
              workspaceId: entityId, // This is actually the proposalId
              uploadedBy: session.user.contact!.id,
              organizationId: session.user.activeOrganizationId || undefined,
              file,
              userMessage: message || '',
              context: {
                chatContext: "proposal"
              },
              progressReporter: async () => {
                // Progress is already handled in the library function
              }
            },
            controller
          );
        } else if (entityType === 'workspace' || entityType === 'dashboard') {
          // Handle workspace/dashboard level document uploads with ChatFileManager
          await analyzeDocument(
            {
              workspaceId: entityId,
              uploadedBy: session.user.contact!.id,
              organizationId: session.user.activeOrganizationId || undefined,
              file,
              userMessage: message || '',
              context: {
                chatContext: "dashboard",
                dashboardContext: requestData.dashboardContext
              },
              progressReporter: async () => {
                // Progress is already handled in the library function
              }
            },
            controller
          );
        } else {
          throw new Error(`Unsupported entity type: ${entityType}`);
        }

        controller.close();
      } catch (error) {
        console.error('Error in document analysis:', error);
        const errorMessage = {
          type: 'error',
          content: 'I encountered an error while analyzing the document. Please try again.',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * Handle dashboard document analysis requests
 */
export async function handleDashboardDocumentAnalysis(requestData: ChatRequestData, session: SessionData) {
  const { file } = requestData;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!session.user.contact?.id) {
    return NextResponse.json({ error: 'User contact ID not found' }, { status: 401 });
  }

  console.log(`📄 Dashboard document analysis: ${file.name}`);

  try {
    // Extract dashboard context from request data
    const dashboardContext = requestData.dashboardContext || requestData.metadata?.dashboardContext;
    console.log('Dashboard context received:', dashboardContext);

    // Extract content from file based on type
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileType = determineFileType(file.type, file.name);
    
    let extractedText: string;
    
    // Handle text-based files directly, use AI only for complex formats
    if (fileType === 'text' || file.name.toLowerCase().endsWith('.csv') || 
        file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.md')) {
      // Extract text directly from text-based files
      extractedText = fileBuffer.toString('utf-8');
    } else {
      // Use AI content extraction for complex formats (PDFs, images, etc.)
      const { extractContentFromFile } = await import('@/src/lib/ai/contentExtraction');
      const extractedContent = await extractContentFromFile(fileBuffer, fileType);
      extractedText = extractedContent.text;
    }

    // Use progressive summarization for large documents to get faster classification
    const { summarizeProgressive, getChunkInfo } = await import('@/src/lib/ai/documentSummarization');
    const { detectDocumentType, classifyDocument } = await import('@/src/lib/ai/documentClassification');
    
    let documentType = detectDocumentType(extractedText);
    
    // For large documents or unknown types, use progressive summarization for faster classification
    const chunkInfo = getChunkInfo(extractedText);
    const isLargeDocument = chunkInfo.totalChunks > 3;
    
    if (documentType === 'other' || isLargeDocument) {
      console.log(`🔄 Using progressive summarization for classification (${chunkInfo.totalChunks} chunks, ~${chunkInfo.estimatedProcessingTime}s estimated)`);
      
      try {
        const progressiveResult = await summarizeProgressive(extractedText, file.name, {
          highConfidenceThreshold: 80,
          minimumConfidenceThreshold: 60
        });
        
        documentType = progressiveResult.classification.documentType;
        
        console.log(`✅ Progressive classification complete: ${documentType} (confidence: ${progressiveResult.finalConfidence}%, processed ${progressiveResult.processedChunks}/${progressiveResult.totalChunks} chunks, stopped early: ${progressiveResult.stoppedEarly})`);
      } catch (error) {
        console.error('Progressive summarization failed, falling back to simple detection:', error);
        // Keep the simple document type detection result
      }
    }


    
    if (documentType === 'transcript') {
      console.log('📞 Detected transcript file, processing with SSE transcript analysis');
      
      // Return streaming response for transcript analysis
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            await handleTranscriptAnalysis(
              file.name, 
              extractedText, 
              controller, 
              dashboardContext, 
              requestData.sseSessionId, // Pass SSE session ID
              session.user.activeOrganizationId || undefined // Pass the actual organization ID from session
            );
            controller.close();
          } catch (error) {
            console.error('Error in transcript SSE analysis:', error);
            const errorMessage = {
              type: 'error',
              content: 'I encountered an error while analyzing the transcript. Please try again.',
              error: error instanceof Error ? error.message : 'Unknown error'
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`));
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // FIRST PRIORITY: Check if content matches existing opportunities for intent clarification
    if (dashboardContext?.opportunities?.length) {
      const matchingOpportunities = await analyzeOpportunityMatches(extractedText, dashboardContext.opportunities);
      
      if (matchingOpportunities.length > 0) {
        return generateIntentClarificationResponse(file.name, extractedText, matchingOpportunities);
      }
    }

    // SECOND PRIORITY: No opportunity matches found, proceed with entity extraction
    const { extractOrganizationsWithContacts } = await import('@/src/lib/ai/organizationContactExtraction');

    // Process the results based on document type and content
    let analysisResults: AnalysisResults;
    
    if (fileType === 'text' && file.name.toLowerCase().endsWith('.csv')) {
      // Handle CSV files with direct parsing
      const { headers, rows } = parseCSVContent(extractedText);
      console.log(`📊 Parsing CSV with ${headers.length} columns and ${rows.length} rows`);
      
      // Use AI to intelligently map fields and extract entities
      const { opportunities, contacts, organizations } = await extractEntitiesFromCSV(headers, rows);
      
      analysisResults = {
        documentType: 'data_import',
        confidence: 0.95,
        opportunities,
        contacts,
        organizations,
        totalRows: rows.length,
        headers
      };
    } else {
      // Handle other document types with UNIFIED extraction approach
      const [organizationResults, classification] = await Promise.all([
        extractOrganizationsWithContacts(extractedText, { context: 'document' }),
        classifyDocument(file.name, extractedText)
      ]);

      // Convert unified results to the expected format
      const organizations: OrganizationData[] = organizationResults.organizations.map(org => ({
        id: `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: org.name,
        website: org.website || null,
        sector: org.sector || null,
        size: org.size || null,
        address: org.address ? {
          street: org.address.street || undefined,
          city: org.address.city || undefined,
          state: org.address.state || undefined,
          zip: org.address.zip || undefined,
          country: org.address.country || undefined
        } : null,
        description: org.description || null
      }));

      // Extract ALL contacts from organizations (unified approach ensures contacts are associated)
      const contacts: ContactData[] = organizationResults.organizations.flatMap(org => 
        org.contacts.map(contact => ({
          id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: contact.name,
          firstName: contact.firstName || undefined,
          lastName: contact.lastName || undefined,
          email: contact.email || null,
          phone: contact.phone || null,
          title: contact.title || null,
          organization: org.name,
          organizationId: organizations.find(o => o.name === org.name)?.id,
          linkedin: contact.linkedIn || null,
          skills: []
        }))
      );

      analysisResults = {
        documentType: classification.documentType,
        confidence: classification.confidence,
        organizations,
        contacts,
        keyTopics: classification.keyTopics,
        suggestedSections: classification.suggestedSections,
        shouldUpdateSections: classification.shouldUpdateSections
      };
    }

    // Generate response message based on analysis
    const responseMessage = generateAnalysisResponse(file.name, analysisResults);
    const actions = generateSuggestedActions(analysisResults);
    const metadata = {
      fileId: file.name, // In real implementation, this would be a proper file ID
      analysisType: fileType === 'text' && file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'document',
      documentType: analysisResults.documentType || 'unknown',
      confidence: analysisResults.confidence || 0,
      extractedEntities: {
        organizations: analysisResults.organizations?.length || 0,
        contacts: analysisResults.contacts?.length || 0,
        opportunities: analysisResults.opportunities?.length || 0
      },
      // Include the actual extracted data for the bulk import modal
      extractedData: {
        opportunities: analysisResults.opportunities || [],
        contacts: analysisResults.contacts || [],
        organizations: analysisResults.organizations || []
      }
    };

    return {
      response: responseMessage,
      actions,
      metadata
    };

  } catch (error) {
    console.error('Dashboard document analysis error:', error);
    return {
      response: `❌ **Analysis Failed**\n\nSorry, I encountered an error analyzing "${file.name}". Please try again or contact support if the issue persists.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`,
      actions: [
        {
          label: 'Try Again',
          action: 'retry_analysis',
          description: 'Retry the document analysis'
        }
      ],
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId: file.name
      }
    };
  }
}

/**
 * Handle transcript analysis and opportunity matching with SSE
 */
async function handleTranscriptAnalysis(
  filename: string,
  transcriptContent: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
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
  },
  sseSessionId?: string,
  organizationId?: string
) {
  const encoder = new TextEncoder();
  
  try {
    // Send initial message
    const initialMessage = {
      type: 'message',
      role: 'assistant',
      content: `📞 **Starting Transcript Analysis: ${filename}**\n\nI'm analyzing the transcript content and will match it to your existing opportunities...`,
      progress: {
        stage: 'starting',
        current: 0,
        total: 100,
        message: 'Starting transcript analysis...'
      }
    };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialMessage)}\n\n`));

    // Step 1: Analyze transcript content
    const step1Message = {
      type: 'message',
      role: 'assistant',
      content: `🧠 **Step 1:** Analyzing transcript content for key insights...`,
      progress: {
        stage: 'analysis',
        current: 20,
        total: 100,
        message: 'Extracting key insights from transcript...'
      }
    };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(step1Message)}\n\n`));

    const { processTranscript } = await import('@/src/lib/ai/transcriptProcessing');
    
    // Step 2: Search for relevant opportunities
    const step2Message = {
      type: 'message',
      role: 'assistant',
      content: `🔍 **Step 2:** Finding relevant opportunities using vector search...`,
      progress: {
        stage: 'search',
        current: 40,
        total: 100,
        message: 'Searching for relevant opportunities...'
      }
    };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(step2Message)}\n\n`));

    // Step 3: AI matching
    const step3Message = {
      type: 'message',
      role: 'assistant',
      content: `🤖 **Step 3:** Using AI to analyze opportunity matches...`,
      progress: {
        stage: 'matching',
        current: 60,
        total: 100,
        message: 'Analyzing opportunity matches...'
      }
    };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(step3Message)}\n\n`));

    // Process the transcript with enhanced options
    const result = await processTranscript(transcriptContent, {
      filename,
      // Use vector search with the actual organization ID from session
      organizationId,
      // Keep existing opportunities as fallback for compatibility
      existingOpportunities: dashboardContext?.opportunities?.map(opp => ({
        id: opp.id,
        title: opp.title,
        status: opp.status,
        value: opp.value
      })),
      sseSessionId // Pass SSE session ID to transcript processing service
    });

    // Step 4: Generate final response
    const step4Message = {
      type: 'message',
      role: 'assistant',
      content: `📊 **Step 4:** Generating comprehensive analysis report...`,
      progress: {
        stage: 'reporting',
        current: 80,
        total: 100,
        message: 'Generating analysis report...'
      }
    };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(step4Message)}\n\n`));

    // Generate response message
    let responseMessage = `📞 **Transcript Analysis Complete: ${filename}**\n\n`;
    
    // Add summary
    responseMessage += `**Summary:**\n${result.analysis.summary}\n\n`;
    
    // Add key topics
    if (result.analysis.keyTopics.length > 0) {
      responseMessage += `**Key Topics:** ${result.analysis.keyTopics.join(', ')}\n\n`;
    }
    
    // Add participants
    if (result.analysis.participants.length > 0) {
      responseMessage += `**Participants:**\n`;
      result.analysis.participants.forEach(participant => {
        responseMessage += `- ${participant.identifier}${participant.role ? ` (${participant.role})` : ''}\n`;
      });
      responseMessage += '\n';
    }
    
    // Add business context
    if (result.analysis.businessContext.requirements.length > 0) {
      responseMessage += `**Requirements Identified:**\n`;
      result.analysis.businessContext.requirements.forEach(req => {
        responseMessage += `- ${req}\n`;
      });
      responseMessage += '\n';
    }
    
    // Add action items
    if (result.analysis.actionItems.length > 0) {
      responseMessage += `**Action Items:**\n`;
      result.analysis.actionItems.forEach(item => {
        responseMessage += `- ${item}\n`;
      });
      responseMessage += '\n';
    }

    // Prepare actions based on analysis
    const actions = [];
    
    // Add opportunity matching actions if we have matches
    if (result.opportunityMatches?.matches && result.opportunityMatches.matches.length > 0) {
      responseMessage += `**🎯 Opportunity Matches Found:**\n`;
      result.opportunityMatches.matches.forEach(match => {
        const matchedOpp = dashboardContext?.opportunities?.find(o => o.id === match.opportunityId);
        const oppTitle = matchedOpp?.title || 'Unknown Opportunity';
        responseMessage += `- **${oppTitle}** (${match.relevanceScore}% match)\n`;
        responseMessage += `  ${match.reasoning}\n\n`;
      });
      
      actions.push({
        label: 'View Matched Opportunities',
        action: 'view_opportunity_matches',
        description: `Review ${result.opportunityMatches.matches.length} matching opportunities`
      });
    }
    
    // Add new opportunity recommendation if suggested
    if (result.opportunityMatches?.newOpportunityRecommendation?.shouldCreate) {
      const recommendation = result.opportunityMatches.newOpportunityRecommendation;
      responseMessage += `**💡 New Opportunity Recommended:**\n`;
      responseMessage += `- **Title:** ${recommendation.title || 'Untitled Opportunity'}\n`;
      responseMessage += `- **Description:** ${recommendation.description || 'No description provided'}\n`;
      responseMessage += `- **Priority:** ${recommendation.priority || 'medium'}\n\n`;
      
      actions.push({
        label: 'Create New Opportunity',
        action: 'create_opportunity_from_transcript',
        description: 'Create a new opportunity based on transcript insights'
      });
    }
    
    // Always offer to add insights to an opportunity
    actions.push({
      label: 'Add to Opportunity',
      action: 'add_transcript_to_opportunity',
      description: 'Add transcript insights to an existing opportunity'
    });
    
    // Offer to create a summary document
    actions.push({
      label: 'Generate Summary Document',
      action: 'generate_transcript_summary',
      description: 'Create a formatted summary document from the transcript'
    });

    // Send final completion message
    const completionMessage = {
      type: 'message',
      role: 'assistant',
      content: responseMessage,
      progress: {
        stage: 'complete',
        current: 100,
        total: 100,
        message: 'Analysis complete!'
      },
      metadata: {
        documentType: 'transcript',
        confidence: result.analysis.confidence,
        transcriptAnalysis: result.analysis,
        opportunityMatches: result.opportunityMatches,
        extractedData: {
          // Format for compatibility with existing analysis modal
          type: 'transcript_analysis',
          summary: result.analysis.summary,
          keyTopics: result.analysis.keyTopics,
          actionItems: result.analysis.actionItems,
          participants: result.analysis.participants,
          businessContext: result.analysis.businessContext
        },
        actions
      }
    };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(completionMessage)}\n\n`));

  } catch (error) {
    console.error('Error processing transcript:', error);
    const errorMessage = {
      type: 'error',
      content: `❌ **Error processing transcript ${filename}**\n\n${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`));
    throw error;
  }
}

/**
 * Handle document question requests (placeholder for future implementation)
 */
export async function handleDocumentQuestion(requestData: ChatRequestData, session: SessionData) {
  const { entityType, question } = requestData;
  if (!session.user?.contact?.id) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }
  if (!question) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 });
  }

  console.log(`🔍 Document question for ${entityType}: ${question.slice(0, 100)}...`);

  // TODO: Implement vector search when ready
  return NextResponse.json({
    response: `🚧 Document Q&A feature is being developed. Question: "${question}"`,
    sections: []
  });
}

/**
 * Handle knowledge base search requests
 */
export async function handleKnowledgeSearch(requestData: ChatRequestData, session: SessionData) {
  const { entityType, entityId, message } = requestData;
  if (!session.user?.contact?.id) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  if (!message) {
    return NextResponse.json({ error: 'Message is required for search' }, { status: 400 });
  }

  const searchData = await searchKnowledgeBase(message, entityType as 'opportunity' | 'proposal' | 'organization', entityId, 10);
  
  return NextResponse.json({
    response: `Found ${searchData.results.length} relevant results for "${message}"`,
    searchResults: searchData.results,
    action: 'search'
  });
}


/**
 * Handle enhance opportunity requests with streaming response
 */
export async function handleEnhanceOpportunity(requestData: ChatRequestData, session: SessionData) {
  const { entityType, entityId, fileId, fileName } = requestData;

  if (entityType !== 'opportunity') {
    return NextResponse.json({ error: 'Enhancement only supported for opportunities' }, { status: 400 });
  }

  if (!fileId) {
    return NextResponse.json({ error: 'File ID is required for enhancement' }, { status: 400 });
  }

  if (!session.user.contact?.id) {
    return NextResponse.json({ error: 'User contact ID not found' }, { status: 401 });
  }

  console.log(`🚀 Starting enhancement for opportunity ${entityId} with file ${fileId}`);

  // Create streaming response for real-time progress updates
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial message
        const initialMessage = {
          type: 'message',
          role: 'assistant',
          content: `🚀 **Starting Enhancement Process**\n\nAnalyzing document sections and matching them to opportunity sections...`,
          progress: {
            stage: 'starting',
            current: 0,
            total: 100,
            message: 'Starting enhancement process...'
          }
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialMessage)}\n\n`));

        // Step 1: Analyze and match sections
        const step1Message = {
          type: 'message',
          role: 'assistant',
          content: `📋 **Step 1:** Analyzing document sections...`,
          progress: {
            stage: 'matching',
            current: 20,
            total: 100,
            message: 'Analyzing document sections...'
          }
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(step1Message)}\n\n`));

        const matchResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/opportunities/${entityId}/files/${fileId}/match`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'integrate' })
        });

        if (!matchResponse.ok) {
          const error = await matchResponse.json();
          throw new Error(error.message || 'Failed to match sections');
        }

        const matchResult = await matchResponse.json();
        const sectionsFound = matchResult.sections?.length || 0;

        const step1CompleteMessage = {
          type: 'message',
          role: 'assistant',
          content: `✅ **Step 1 Complete:** Found ${sectionsFound} sections to process`,
          progress: {
            stage: 'matching',
            current: 50,
            total: 100,
            message: `Found ${sectionsFound} sections to process`
          }
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(step1CompleteMessage)}\n\n`));

        // Step 2: Apply all matches
        const step2Message = {
          type: 'message',
          role: 'assistant',
          content: `🔄 **Step 2:** Applying all matches automatically...`,
          progress: {
            stage: 'applying',
            current: 60,
            total: 100,
            message: 'Applying matches...'
          }
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(step2Message)}\n\n`));

        const applyResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/opportunities/${entityId}/files/${fileId}/apply-all`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'integrate' })
        });

        if (!applyResponse.ok) {
          const error = await applyResponse.json();
          throw new Error(error.message || 'Failed to apply matches');
        }

        const applyResult = await applyResponse.json();
        const sectionsApplied = applyResult.appliedCount || 0;

        // Step 3: Remove duplicates
        const step3Message = {
          type: 'message',
          role: 'assistant',
          content: `🔍 **Step 3:** Checking for duplicate sections...`,
          progress: {
            stage: 'cleanup',
            current: 80,
            total: 100,
            message: 'Removing duplicates...'
          }
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(step3Message)}\n\n`));

        // Call duplicate removal endpoint
        try {
          const duplicatesResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/opportunities/${entityId}/sections/remove-duplicates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });

          let duplicatesRemoved = 0;
          if (duplicatesResponse.ok) {
            const duplicatesResult = await duplicatesResponse.json();
            duplicatesRemoved = duplicatesResult.removedCount || 0;
          }

          // Final success message
          const successMessage = {
            type: 'message',
            role: 'assistant',
            content: `🎉 **Enhancement Complete!**\n\n✅ Successfully applied ${sectionsApplied} sections\n✅ Removed ${duplicatesRemoved} duplicate sections\n\nYour opportunity has been enhanced with content from **${fileName || 'the uploaded file'}**`,
            progress: {
              stage: 'complete',
              current: 100,
              total: 100,
              message: 'Enhancement complete!'
            },
            metadata: {
              actions: [{
                label: 'View Changes',
                action: 'view_workspace',
                description: 'Go to workspace to see the updated sections'
              }]
            }
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(successMessage)}\n\n`));

        } catch (duplicateError) {
          console.error('Error removing duplicates:', duplicateError);
          // Continue anyway
          const successMessage = {
            type: 'message',
            role: 'assistant',
            content: `🎉 **Enhancement Complete!**\n\n✅ Successfully applied ${sectionsApplied} sections\n⚠️ Could not check for duplicates\n\nYour opportunity has been enhanced with content from **${fileName || 'the uploaded file'}**`,
            progress: {
              stage: 'complete',
              current: 100,
              total: 100,
              message: 'Enhancement complete!'
            },
            metadata: {
              actions: [{
                label: 'View Changes',
                action: 'view_workspace',
                description: 'Go to workspace to see the updated sections'
              }]
            }
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(successMessage)}\n\n`));
        }

        controller.close();

      } catch (error) {
        console.error('Error in enhance opportunity:', error);
        const errorMessage = {
          type: 'error',
          role: 'assistant',
          content: `❌ **Enhancement Failed**\n\n${error instanceof Error ? error.message : 'An unexpected error occurred'}`,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}




/**
 * Analyze if uploaded content matches existing opportunities 
 */
async function analyzeOpportunityMatches(
  content: string, 
  opportunities: Array<{ id: string; title: string; value: number; status: string; createdAt: string }>
): Promise<Array<{ opportunity: typeof opportunities[0]; confidence: number; matchedKeywords: string[] }>> {
  try {
    // Look for opportunity keywords in content
    const matches = [];
    
    for (const opportunity of opportunities) {
      const titleWords = opportunity.title.toLowerCase().split(' ').filter(word => word.length > 3);
      const matchedKeywords = [];
      let keywordMatches = 0;
      
      for (const word of titleWords) {
        if (content.toLowerCase().includes(word)) {
          matchedKeywords.push(word);
          keywordMatches++;
        }
      }
      
      // Also check for domain-specific keywords
      const educationalKeywords = ['education', 'course', 'student', 'learning', 'curriculum', 'academic', 'university', 'teaching'];
      const technologyKeywords = ['platform', 'software', 'system', 'tool', 'application', 'digital', 'technology'];
      
      // Check domain matches
      if (opportunity.title.toLowerCase().includes('education')) {
        for (const keyword of educationalKeywords) {
          if (content.toLowerCase().includes(keyword)) {
            matchedKeywords.push(keyword);
            keywordMatches++;
          }
        }
      }
      
      if (opportunity.title.toLowerCase().includes('technology') || opportunity.title.toLowerCase().includes('platform')) {
        for (const keyword of technologyKeywords) {
          if (content.toLowerCase().includes(keyword)) {
            matchedKeywords.push(keyword);
            keywordMatches++;
          }
        }
      }
      
      // Calculate confidence based on matches
      const confidence = Math.min(keywordMatches / Math.max(titleWords.length, 3), 1.0);
      
      if (confidence > 0.3) { // Threshold for considering it a match
        matches.push({
          opportunity,
          confidence,
          matchedKeywords: [...new Set(matchedKeywords)] // Remove duplicates
        });
      }
    }
    
    // Sort by confidence descending
    return matches.sort((a, b) => b.confidence - a.confidence);
    
  } catch (error) {
    console.error('Error analyzing opportunity matches:', error);
    return [];
  }
}

/**
 * Generate intent clarification response when opportunities are matched
 */
function generateIntentClarificationResponse(
  fileName: string,
  content: string,
  matches: Array<{ opportunity: { id: string; title: string; value: number; status: string }; confidence: number; matchedKeywords: string[] }>
): {
  response: string;
  actions: Array<{ label: string; action: string; description: string; data?: unknown }>;
  metadata: Record<string, unknown>;
} {
  const topMatch = matches[0];
  const hasMultipleMatches = matches.length > 1;
  
  let response = `🎯 **Smart Content Analysis**\n\n**File**: ${fileName}\n\n`;
  
  response += `I've analyzed the content and found it relates to ${hasMultipleMatches ? 'multiple opportunities' : 'an existing opportunity'} in your pipeline:\n\n`;
  
  // Show top match
  response += `**🏆 Best Match**: **${topMatch.opportunity.title}**\n`;
  response += `- Match confidence: ${Math.round(topMatch.confidence * 100)}%\n`;
  response += `- Keywords found: ${topMatch.matchedKeywords.join(', ')}\n`;
  response += `- Status: ${topMatch.opportunity.status}\n`;
  response += `- Value: $${topMatch.opportunity.value.toLocaleString()}\n\n`;
  
  // Show other matches if any
  if (hasMultipleMatches) {
    response += `**Other potential matches**:\n`;
    matches.slice(1, 3).forEach(match => {
      response += `- ${match.opportunity.title} (${Math.round(match.confidence * 100)}% match)\n`;
    });
    response += '\n';
  }
  
  response += `**What would you like me to do with this content?**`;
  
  const actions = [
    {
      label: `Enhance "${topMatch.opportunity.title}"`,
      action: 'enhance_opportunity',
      description: `Apply insights from ${fileName} to enhance the ${topMatch.opportunity.title} opportunity`,
      data: {
        opportunityId: topMatch.opportunity.id,
        opportunityTitle: topMatch.opportunity.title,
        fileName,
        content: content.substring(0, 2000) // Limit content size
      } as Record<string, unknown>
    },
    {
      label: 'Extract Organizations & Contacts',
      action: 'extract_entities',
      description: `Extract organization and contact information from ${fileName}`,
      data: { fileName, content: content.substring(0, 2000) } as Record<string, unknown>
    }
  ];
  
  // Add option for multiple matches
  if (hasMultipleMatches) {
    actions.splice(1, 0, {
      label: 'Choose Different Opportunity',
      action: 'select_opportunity_match',
      description: 'Select from other matching opportunities',
      data: { matches, fileName, content: content.substring(0, 2000) } as Record<string, unknown>
    });
  }
  
  // Add general options
  actions.push(
    {
      label: 'Add to Knowledge Base',
      action: 'add_to_knowledge',
      description: `Store ${fileName} in your knowledge base for future reference`,
      data: { fileName, content: content.substring(0, 2000) } as Record<string, unknown>
    },
    {
      label: 'Create New Opportunity',
      action: 'create_opportunity',
      description: `Create a new opportunity based on ${fileName}`,
      data: { fileName, content: content.substring(0, 2000) } as Record<string, unknown>
    }
  );
  
  return {
    response,
    actions,
    metadata: {
      intentClarification: true,
      matches,
      fileName,
      topMatchId: topMatch.opportunity.id
    } as Record<string, unknown>
  };
}

// Generate analysis response message
function generateAnalysisResponse(fileName: string, results: AnalysisResults): string {
  if (results.error) {
    return `❌ **Analysis Failed**\n\nFile: ${fileName}\n\nError: ${results.error}`;
  }

  let message = `🎯 **Document Analysis Complete**\n\n**File**: ${fileName}\n`;
  
  if (results.documentType === 'data_import') {
    message += `**Type**: CSV Data Import\n`;
    message += `**Rows Processed**: ${results.totalRows}\n\n`;
    message += `**What I found**:\n`;
    
    if (results.opportunities?.length) {
      message += `- 📋 ${results.opportunities.length} opportunities\n`;
    }
    if (results.contacts?.length) {
      message += `- 👥 ${results.contacts.length} contacts\n`;
    }
    if (results.organizations?.length) {
      message += `- 🏢 ${results.organizations.length} organizations\n`;
    }
    
    // Show sample data
    if (results.opportunities?.length && results.opportunities.length > 0) {
      const sampleOpp = results.opportunities[0];
      message += `\n**Sample Opportunity**: ${sampleOpp.title}`;
      if (sampleOpp.value) {
        message += ` ($${sampleOpp.value.toLocaleString()})`;
      }
    }
  } else {
    message += `**Type**: ${results.documentType?.toUpperCase() || 'DOCUMENT'} (${Math.round((results.confidence || 0) * 100)}% confidence)\n\n`;
    message += `**What I found**:\n`;
    
    if (results.organizations?.length) {
      message += `- 🏢 ${results.organizations.length} organizations\n`;
    }
    if (results.contacts?.length) {
      message += `- 👥 ${results.contacts.length} contacts\n`;
    }
    if (results.keyTopics?.length) {
      message += `- 🔍 Key topics: ${results.keyTopics.slice(0, 3).join(', ')}\n`;
    }
  }

  return message;
}

// Generate suggested actions based on analysis results
function generateSuggestedActions(results: AnalysisResults): Array<{ label: string; action: string; description: string }> {
  const actions = [];

  if (results.documentType === 'data_import') {
    // Single action for CSV data - view and import
    const totalEntities = (results.opportunities?.length || 0) + 
                         (results.contacts?.length || 0) + 
                         (results.organizations?.length || 0);
    
    if (totalEntities > 0) {
      actions.push({
        label: 'View & Import Data',
        action: 'view_analysis_details',
        description: `Review and import ${results.opportunities?.length || 0} opportunities with ${results.contacts?.length || 0} contacts and ${results.organizations?.length || 0} organizations`
      });
    }
  } else {
    // For non-CSV documents, keep the existing behavior
    if (results.organizations?.length) {
      actions.push({
        label: 'Review Organizations',
        action: 'review_organizations',
        description: `Review ${results.organizations.length} extracted organizations`
      });
    }
    if (results.contacts?.length) {
      actions.push({
        label: 'Review Contacts',
        action: 'review_contacts',
        description: `Review ${results.contacts.length} extracted contacts`
      });
    }
    if (results.shouldUpdateSections) {
      actions.push({
        label: 'Update Knowledge Base',
        action: 'update_knowledge_base',
        description: 'Add this document to your knowledge base'
      });
    }
    
    actions.push({
      label: 'View Details',
      action: 'view_analysis_details',
      description: 'See detailed analysis results'
    });
  }

  return actions;
}




/**
 * Check entity permissions
 */
export async function checkEntityPermission(contactId: string, entityType: string, entityId: string): Promise<boolean> {
 

  // Special case for dashboard chats
  if (entityId === 'dashboard' || entityType === 'workspace') {
    // Dashboard access is allowed for any authenticated user
    // Could be enhanced to check organization membership if needed
    return true;
  }

  // Special case for admin testing scenarios
  if (entityId === 'admin-test' || entityId.startsWith('admin-')) {
    // Admin test access - could be enhanced to check if user is actually an admin
    return true;
  }

  switch (entityType) {
    case 'opportunity':
      return await checkOpportunityPermission(contactId, entityId);
    case 'proposal':
      return await checkProposalPermission(contactId, entityId);
    default:
      return false;
  }
}

// AI-powered entity extraction from CSV data
async function extractEntitiesFromCSV(headers: string[], rows: string[][]): Promise<{
  opportunities: OpportunityData[];
  contacts: ContactData[];
  organizations: OrganizationData[];
}> {
  if (!rows.length) {
    return { opportunities: [], contacts: [], organizations: [] };
  }

  try {
    // Use the documentExtraction service
    const result = await extractCSVEntities(headers, rows);
    
    // Transform the types to match our interfaces
    return {
      opportunities: result.opportunities.map(opp => ({
        id: opp.id,
        title: opp.title,
        value: opp.value,
        status: opp.status,
        description: opp.description,
        contactId: opp.contactId,
        organizationId: opp.organizationId,
        notes: opp.notes || undefined,
        actionItem: opp.actionItem || undefined,
        lastContact: opp.lastContact || undefined,
        stage: opp.stage || undefined
      })),
      contacts: result.contacts.map(contact => ({
        id: contact.id,
        name: contact.name,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email || undefined,
        phone: contact.phone || undefined,
        title: contact.title || undefined,
        organization: contact.organization || undefined,
        organizationId: contact.organizationId,
        linkedin: contact.linkedin || undefined,
        skills: contact.skills || []
      })),
      organizations: result.organizations.map(org => ({
        id: org.id,
        name: org.name,
        website: org.website || undefined,
        sector: org.sector || undefined,
        size: org.size || undefined,
        address: org.address || undefined,
        description: org.description || undefined
      }))
    };

  } catch (error) {
    console.warn('AI extraction failed, using fallback:', error);
    // Use basic fallback extraction
    return fallbackCSVExtraction(headers, rows);
  }
}

// Fallback extraction when AI fails
function fallbackCSVExtraction(headers: string[], rows: string[][]): {
  opportunities: OpportunityData[];
  contacts: ContactData[];
  organizations: OrganizationData[];
} {
  const opportunities: OpportunityData[] = [];
  const contacts: ContactData[] = [];
  const organizations: OrganizationData[] = [];
  
  // Known header mappings for this specific CSV
  const titleIndex = headers.findIndex(h => h.includes('opportunity') || h.includes('description'));
  const valueIndex = headers.findIndex(h => h.includes('size') || h.includes('project'));
  const contactIndex = headers.findIndex(h => h.includes('contact') || h.includes('person'));
  const companyIndex = headers.findIndex(h => h.includes('company') || h.includes('name'));
  const titleFieldIndex = headers.findIndex(h => h === 'title');
  const emailIndex = headers.findIndex(h => h.includes('email'));
  const stageIndex = headers.findIndex(h => h.includes('stage'));
  const notesIndex = headers.findIndex(h => h.includes('notes'));
  const actionItemIndex = headers.findIndex(h => h.includes('action item'));
  const lastContactIndex = headers.findIndex(h => h.includes('last contact'));

  const orgMap = new Map<string, OrganizationData>();
  let orgCounter = 1;
  let contactCounter = 1;
  let oppCounter = 1;

  for (const row of rows) {
    if (!row[titleIndex]?.trim()) continue;

    // Extract organization
    let organization: OrganizationData | undefined;
    if (companyIndex !== -1 && row[companyIndex]?.trim()) {
      const orgName = row[companyIndex].trim();
      const orgKey = orgName.toLowerCase();
      
      if (!orgMap.has(orgKey)) {
        organization = {
          id: `org_${orgCounter++}`,
          name: orgName
        };
        organizations.push(organization);
        orgMap.set(orgKey, organization);
      } else {
        organization = orgMap.get(orgKey);
      }
    }

    // Extract contact
    let contact: ContactData | undefined;
    if (contactIndex !== -1 && row[contactIndex]?.trim()) {
      const fullName = row[contactIndex].trim();
      const nameParts = fullName.split(' ');
      
      contact = {
        id: `contact_${contactCounter++}`,
        name: fullName,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: emailIndex !== -1 ? row[emailIndex]?.trim() || undefined : undefined,
        title: titleFieldIndex !== -1 ? row[titleFieldIndex]?.trim() || undefined : undefined,
        organizationId: organization?.id,
        organization: organization?.name || undefined
      };
      contacts.push(contact);
    }

    // Extract opportunity
    const title = row[titleIndex].trim();
    
    // Parse value
    let value: number | undefined = undefined;
    if (valueIndex !== -1 && row[valueIndex]?.trim()) {
      const valueStr = row[valueIndex].trim();
      const cleaned = valueStr.replace(/[$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) {
        value = parsed;
      }
    }

    const opportunity: OpportunityData = {
      id: `opp_${oppCounter++}`,
      title,
      value: value || undefined,
      status: stageIndex !== -1 ? row[stageIndex]?.trim() || 'unknown' : 'unknown',
      organizationId: organization?.id,
      contactId: contact?.id,
      notes: notesIndex !== -1 ? row[notesIndex]?.trim() || undefined : undefined,
      actionItem: actionItemIndex !== -1 ? row[actionItemIndex]?.trim() || undefined : undefined,
      lastContact: lastContactIndex !== -1 ? row[lastContactIndex]?.trim() || undefined : undefined,
      stage: stageIndex !== -1 ? row[stageIndex]?.trim() || undefined : undefined
    };
    
    opportunities.push(opportunity);
  }

  return { opportunities, contacts, organizations };
}


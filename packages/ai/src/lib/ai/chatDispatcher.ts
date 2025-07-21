import OpenAI from 'openai';
import { MODELS } from './models';
import { z } from 'zod';
import { zodTextFormat } from 'openai/helpers/zod';

// Available tools for the chat system
export interface ChatTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

// Chat context for contextual responses
export interface ChatContext {
  entityType: 'opportunity' | 'proposal';
  entityId: string;
  tabContext?: string | null;
  tabLabel?: string | null;
  currentContent?: string[] | null;
  userRole?: string | null;
  userContactId?: string;
  recentMessages?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp?: Date | null;
    metadata?: {
      uploadedFiles?: Array<{
        originalName: string;
        fileId: string;
        fileType: string;
      }> | null;
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
      } | null;
      transcriptAnalysis?: {
        summary: string;
        confidence: number;
        keyTopics: string[];
        actionItems: string[];
        businessContext: {
          projectType: string;
          budget: string;
          timeline: string;
          requirements: string[];
        };
        participants: Array<{
          identifier: string;
          role?: string;
          keyPoints?: string[];
        }>;
        recommendedActions: string[];
      } | null;
      opportunityMatches?: {
        matches: Array<{
          opportunityId: string;
          reasoning: string;
          relevanceScore: number;
        }>;
        newOpportunityRecommendation?: {
          title: string;
          description: string;
        };
      } | null;
      extractedData?: {
        filename: string;
      } | null;
    } | null;
  }> | null;
}

// Intent recognition result
export interface Intent {
  action: 'search_knowledge' | 'search_contacts' | 'search_organizations' | 'search_opportunities' | 'web_search' | 'analyze_document' | 'general_chat' | 'help' | 'improve_content' | 'list_files' | 'enhance_opportunity' | 'analyze_opportunity' | 'view_opportunity_matches' | 'create_opportunity_from_transcript' | 'add_transcript_to_opportunity' | 'generate_transcript_summary';
  confidence: number;
  parameters?: {
    url?: string | null;
    query?: string | null;
    fileId?: string | null;
    filename?: string | null;
    section?: string | null;
    opportunityId?: string | null;
    opportunityTitle?: string | null;
  } | null;
  needsFollowUp: boolean;
  toolsRequired: string[];
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyzes user message intent and determines what actions to take
 */
export async function analyzeIntent(
  message: string,
  context: ChatContext
): Promise<Intent> {
  try {
    console.log('🧠 Starting intent analysis for:', message);
    
    // First, try RAG-based intent determination
    try {
      const { determineIntentFromContext } = await import('./entityIndexing');
      const ragIntent = await determineIntentFromContext(message, 5);
      
      console.log('🎯 RAG Intent Result:', {
        intent: ragIntent.intent,
        confidence: ragIntent.confidence,
        matches: ragIntent.matches.length,
        suggestedAction: ragIntent.suggestedAction
      });

      // If we have a high-confidence RAG match, use it
      if (ragIntent.confidence > 0.6) {
        console.log('✅ Using RAG-based intent determination');
        
        // Map RAG intents to our chat dispatcher actions
        let action: Intent['action'];
        let parameters: Intent['parameters'] = {};
        
        switch (ragIntent.intent) {
          case 'analyze_opportunity':
            action = 'analyze_opportunity';
            parameters = {
              opportunityId: ragIntent.suggestedAction.parameters.opportunityId as string,
              opportunityTitle: ragIntent.suggestedAction.parameters.opportunityTitle as string,
              query: null,
              url: null,
              fileId: null,
              filename: null,
              section: null
            };
            break;
            
          case 'analyze_proposal':
            action = 'search_opportunities'; // Search for related opportunities
            parameters = {
              query: ragIntent.suggestedAction.parameters.proposalTitle as string || message,
              url: null,
              fileId: null,
              filename: null,
              section: null,
              opportunityId: null,
              opportunityTitle: null
            };
            break;
            
          case 'search_contacts':
            action = 'search_contacts';
            parameters = {
              query: ragIntent.suggestedAction.parameters.query as string || message,
              url: null,
              fileId: null,
              filename: null,
              section: null,
              opportunityId: null,
              opportunityTitle: null
            };
            break;
            
          case 'search_organizations':
            action = 'search_organizations';
            parameters = {
              query: ragIntent.suggestedAction.parameters.query as string || message,
              url: null,
              fileId: null,
              filename: null,
              section: null,
              opportunityId: null,
              opportunityTitle: null
            };
            break;
            
          case 'search_opportunities':
            action = 'search_opportunities';
            parameters = {
              query: ragIntent.suggestedAction.parameters.query as string || message,
              url: null,
              fileId: null,
              filename: null,
              section: null,
              opportunityId: null,
              opportunityTitle: null
            };
            break;
            
          case 'search_proposals':
            action = 'search_opportunities'; // Use search_opportunities for proposals
            parameters = {
              query: ragIntent.suggestedAction.parameters.query as string || message,
              url: null,
              fileId: null,
              filename: null,
              section: null,
              opportunityId: null,
              opportunityTitle: null
            };
            break;
            
          default:
            action = 'general_chat';
            parameters = {
              query: message,
              url: null,
              fileId: null,
              filename: null,
              section: null,
              opportunityId: null,
              opportunityTitle: null
            };
        }
        
        return {
          action,
          confidence: ragIntent.confidence,
          parameters,
          needsFollowUp: false,
          toolsRequired: ['entityIndexing']
        };
      }
    } catch (ragError) {
      console.log('❌ RAG intent analysis failed:', ragError);
    }

    // If RAG intent confidence is low or failed, fall back to traditional method
    console.log('🔄 Using traditional intent analysis');
    
    const intentSchema = z.object({
      action: z.enum(['search_knowledge', 'search_contacts', 'search_organizations', 'search_opportunities', 'web_search', 'analyze_document', 'general_chat', 'help', 'improve_content', 'list_files', 'enhance_opportunity', 'analyze_opportunity']),
      confidence: z.number().min(0).max(1),
      parameters: z.object({
        url: z.string().nullable(),
        query: z.string().nullable(),
        fileId: z.string().nullable(),
        filename: z.string().nullable(),
        section: z.string().nullable(),
        opportunityId: z.string().nullable(),
        opportunityTitle: z.string().nullable()
      }).nullable(),
      needsFollowUp: z.boolean(),
      toolsRequired: z.array(z.string())
    });

    // get recent files and remove duplicates
    const recentFiles  = context.recentMessages?.filter(msg => msg.role === 'assistant' && msg.metadata?.uploadedFiles).map(msg => msg.metadata?.uploadedFiles).flat() || [];
    const uniqueRecentFiles = recentFiles.filter((file, index, self) =>
      index === self.findIndex((t) => t?.fileId === file?.fileId)
    );
    console.log('uniqueRecentFiles', uniqueRecentFiles);
    console.log('recentFiles', recentFiles);
    const systemPrompt = `You are an AI assistant for a proposal and opportunity management system. Analyze the user's message to determine their intent.`;

    let instructions = `Available actions:
- search_knowledge: Search uploaded documents and knowledge base for this ${context.entityType}. If the user is asking about a specific document, try to find the fileId or filename in the user message or conversation history.
- search_contacts: Search for people or contact information  
- search_organizations: Search for organizations/companies and their related opportunities, proposals, and business relationships. Use when user asks about companies, organizations, or business entities.
- search_opportunities: Search for business opportunities by various criteria such as deal value, recent activity, team members, keywords, or status. Use when user asks about opportunities, deals, proposals, or business development activities.
- search_proposals: Search for proposals by various criteria such as deal value, recent activity, team members, keywords, or status. Use when user asks about proposals, deals, or business development activities.
- enhance_opportunity: When a document is uploaded that contains content relevant to an existing opportunity, use this to suggest enhancing that specific opportunity. Provide the opportunityId and/or opportunityTitle in parameters.
- web_search: Search the web for external information. If the user provides a URL, start there.
- analyze_document: Analyze or extract information from documents. If the user provides a fileId or filename, use it to find the document.
- general_chat: General conversation or questions about the system
- help: User needs help or guidance
- improve_content: User wants to improve existing content or sections. Provide the section title in the parameters.
- list_files: User wants to list files or documents without searching content. Use when user asks "what files", "what documents", "list files", etc.

Context: This is a ${context.entityType} (ID: ${context.entityId}) in the "${context.tabLabel || context.tabContext || 'content'}" tab.
`

if (context.currentContent && context.currentContent.length > 0) {
  instructions += `Current content includes: ${context.currentContent?.join(', ') || 'No current content'}`;
}

// Add dashboard context for opportunity matching
const dashboardContext = context.recentMessages?.[context.recentMessages.length - 1]?.metadata?.dashboardContext;
if (dashboardContext && context.entityId === 'dashboard') {
  instructions += `

DASHBOARD CONTEXT - Current opportunities in the system:
${dashboardContext.opportunities.map(opp => `- "${opp.title}" (${opp.status}, $${opp.value.toLocaleString()})`).join('\n')}

Total opportunities: ${dashboardContext.totalOpportunities}
Pipeline stages: ${dashboardContext.pipelineStages.join(', ')}

For opportunity-related queries:
- **FIRST PRIORITY**: If user mentions a specific opportunity by name that exists in dashboard context, use analyze_opportunity with the exact opportunityId and opportunityTitle
- **SECOND PRIORITY**: If user asks about opportunities with keywords (like "MIT", "education", etc.), use search_opportunities with those keywords
- Use search_opportunities only for general/exploratory queries about opportunities ("what opportunities do we have", "biggest opportunities", etc.)
- If user uploads files that might relate to existing opportunities, use enhance_opportunity with the matching opportunity details

**IMPORTANT**: When user asks "tell me about X", they likely want to find opportunities with "X" in the title like "X AI Tools" or "X Opportunity". Use search_opportunities with query "X" to find these specifically.

Dashboard Opportunities Available:


${dashboardContext.opportunities.map(opp => `- "${opp.title}" (ID: ${opp.id}, Status: ${opp.status}, Value: $${opp.value.toLocaleString()})`).join('\n')}

File Upload Analysis:
- When files are uploaded, analyze content for opportunity keywords and titles
- For example: if the file contains "course", "educational platform", "student recruitment" and there's an opportunity about "Education Technology Platform", use enhance_opportunity
- Always check uploaded content against existing opportunity titles and descriptions
- Look for business terms, project names, company names, or domain-specific keywords that match opportunities`;
}

instructions += `
Consider the recent conversation when determining intent. For example:
- If user mentions "the document" or "this file" and there's a recent document upload, use search_knowledge
- If user asks "what documents do you have" or "list files", use list_files to show available files
- If user asks about content IN documents, use search_knowledge to search content
- Look for references to previous context in the conversation

**CRITICAL CONTEXT ANALYSIS:**
When user says "summarize it", "tell me more about it", "details about it", or similar references:
1. Look at the PREVIOUS assistant response in the conversation history
2. If the previous response contained specific opportunity, proposal, contact, or organization details, the user is referring to that specific entity
3. For example, if previous response showed opportunity details, and user says "summarize it", use analyze_opportunity with that specific opportunity
4. If previous response showed organization details, use search_organizations to get more details
5. If previous response showed contact details, use search_contacts to get more details

**Pattern Recognition:**
- "summarize it" after opportunity results → analyze_opportunity with the specific opportunity ID/title
- "tell me more" after organization results → search_organizations with the organization name
- "details about it" after contact results → search_contacts with the contact name
- "more info" after proposal results → analyze_proposal with the proposal ID/title

Look for entity names, IDs, or titles in the previous assistant response to determine what "it" refers to.
`

if (uniqueRecentFiles.length > 0) {
  instructions += `
Recent file uploads from conversation history:
${uniqueRecentFiles.map(file => `- File: ${file?.originalName} (ID: ${file?.fileId}, Type: ${file?.fileType})`).join('\n')}

When user refers to "the document", "this file", "the uploaded file" etc., try to identify the specific file from the conversation history.

`
}

instructions += `

**IMPORTANT**: When identifying intent:
- Use "search_opportunities" for questions about opportunities
- Use "search_proposals" for questions about proposals
- Use "search_knowledge" only when specifically asking about documents or files
- Use "search_organizations" for questions about companies or organizations  
- Use "search_contacts" for questions about people or contacts
- For search actions, set the "query" parameter to the cleaned up search terms (remove extra punctuation)
- Do NOT invent file paths, file IDs, or URLs - only use them if explicitly mentioned

Examples:
- "tell me about|summarize|explain the X opportunity|proposal" → analyze_opportunity | analyze_proposal (e.g. if "X" matches an opportunity title), opportunityId: "opp-123", opportunityTitle: "X"
- "tell me about|summarize|explain X" → figure out what X is and use the appropriate action (might be an opportunity, proposal, organization, contact, document, etc.)
- "what is the biggest opportunity" → search_opportunities, query: "biggest opportunity"  
- "what opportunities do we have" → search_opportunities, query: "opportunities"
- "show me documents about X" → search_knowledge, query: "X"
- "who works at company Y" → search_contacts, query: "company Y"

Analyze the message and determine:
1. Primary action needed
2. Confidence level (0-1)  
3. Parameters (only 'query' for most actions, and only use real values from the message)
4. Whether follow-up questions are needed
5. What tools are required`;

    const userPrompt = `${instructions}

User message: "${message}"

Analyze this message and determine the user's intent.`;

    // create an array of input objects {role: 'user or assistant', content: 'message'}
    // filter out history where the role or content is undefined
    const history = context.recentMessages?.filter(msg => msg.role && msg.content).map(msg => ({ role: msg.role, content: msg.content })) || [];
    console.log('systemPrompt', systemPrompt);
    console.log('history', history);
    console.log('userPrompt', userPrompt);
    const response = await openai.responses.parse({
      model: MODELS.fast,
      input: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userPrompt }
      ],
      text: { format: zodTextFormat(intentSchema, 'intent') }
    });

    const intent = response.output_parsed as z.infer<typeof intentSchema>;
    if (!intent) {
      throw new Error('No intent returned from AI');
    }

    return intent;
  } catch (error) {
    console.error('Error analyzing intent:', error);
    // Fallback to general chat
    return {
      action: 'general_chat',
      confidence: 0.5,
      parameters: {query: message},
      needsFollowUp: false,
      toolsRequired: []
    };
  }
}

/**
 * Dispatches to appropriate function based on intent
 */
export async function dispatchChatAction(
  intent: Intent,
  message: string,
  context: ChatContext
): Promise<{
  response: string;
  actions?: Array<{
    label: string;
    action: string;
    description: string;
  }>;
  metadata?: Record<string, unknown>;
}> {
  try {
    switch (intent.action) {

      case 'search_knowledge':
        return await handleKnowledgeSearch(message, context, intent);
      
      case 'search_contacts':
        return await handleContactSearch(message, context, intent);
      
      case 'search_organizations':
        return await handleOrganizationSearch(message, context, intent);
      
      case 'search_opportunities':
        return await handleOpportunitySearch(message, context, intent);
      
      case 'web_search':
        return await handleWebSearch(message, context, intent);
      
      case 'analyze_document':
        return await handleAnalyzeDocument(message, context, intent);
      
      case 'general_chat':
        return await handleGeneralChat(message, context);
      
      case 'help':
        return await handleHelp(message, context);
      
      case 'improve_content':
        return await handleContentImprovement(message, context, intent);
      
      case 'list_files':
        return await handleListFiles(message, context);
      
      case 'enhance_opportunity':
        return await handleEnhanceOpportunity(message, context, intent);
      
      case 'analyze_opportunity':
        return await handleAnalyzeOpportunity(message, context, intent);
      
      case 'view_opportunity_matches':
        return await handleViewOpportunityMatches(message, context, intent);
      
      case 'create_opportunity_from_transcript':
        return await handleCreateOpportunityFromTranscript(message, context, intent);
      
      case 'add_transcript_to_opportunity':
        return await handleAddTranscriptToOpportunity(message, context, intent);
      
      case 'generate_transcript_summary':
        return await handleGenerateTranscriptSummary(message, context, intent);
      
      case 'view_rfp_analysis':
        return await handleViewRFPAnalysis(message, context, intent);
      
      case 'create_opportunity_from_rfp':
        return await handleCreateOpportunityFromRFP(message, context, intent);
      
      case 'add_rfp_to_opportunity':
        return await handleAddRFPToOpportunity(message, context, intent);
      
      case 'import_rfp_entities':
        return await handleImportRFPEntities(message, context, intent);
      
      case 'generate_rfp_response_template':
        return await handleGenerateRFPResponseTemplate(message, context, intent);
      
      default:
        // Handle unrecognized actions that should use filtered opportunities
        if (intent.action === 'select_opportunity') {
          return await handleSelectOpportunity(message, context, intent);
        }
        return await handleGeneralChat(message, context);
    }
  } catch (error) {
    console.error('Error dispatching chat action:', error);
    return {
      response: "I encountered an error processing your request. Please try again or rephrase your question.",
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * Handles knowledge base search
 */
async function handleKnowledgeSearch(
  message: string,
  context: ChatContext,
  intent: Intent
): Promise<{
  response: string;
  actions?: Array<{ label: string; action: string; description: string }>;
  metadata?: Record<string, unknown>;
}> {
  try {
    // Import search functions
    const { searchKnowledgeBase, generateKnowledgeBasedResponse } = await import('./contentExtraction');
    const { searchFiles } = await import('../database');
    const { getFileMetadata } = await import('../database/prisma/fileData');
    
    // Extract search query from intent or use the message
    const searchQuery = intent.parameters?.query || message;
    
    // Check if user wants to search a specific document or search the knowledge base
    const isDocumentSearch = intent.parameters?.fileId || intent.parameters?.filename;

    if (isDocumentSearch) {
      // Search for a specific file
      const fileId = intent.parameters?.fileId;
      const filename = intent.parameters?.filename;
      
      // Try to find the file by ID first, then by filename
      let fileMetadata = null;
      let targetFileId = fileId;
      
      if (fileId) {
        // Direct fileId lookup
        fileMetadata = await getFileMetadata(fileId, context.entityType, context.entityId);
        if (fileMetadata) {
          console.log(`Found file metadata for fileId: ${fileId}`);
        }
      }
      
      if (!fileMetadata && filename) {
        // Search for file by filename in metadata
        const fileMetadataResults = await searchFiles('', context.entityType, context.entityId, undefined, 'fileMetadata', 50);
        const matchingFile = fileMetadataResults.find(result => {
          const metadata = result.metadata;
          return (metadata?.originalName === filename) || 
                 (metadata?.filename === filename) ||
                 result.fileName === filename;
        });
        
        if (matchingFile) {
          targetFileId = matchingFile.fileId;
          // Get the full metadata for this file
          fileMetadata = await getFileMetadata(targetFileId, context.entityType, context.entityId);
          console.log(`Found file by filename: ${filename}, fileId: ${targetFileId}`);
        }
      }
      
      if (fileMetadata && targetFileId) {
        // Found the specific file, now search its content
        const fileResults = await searchFiles(searchQuery, context.entityType, context.entityId, undefined, 'semanticSection', 20);
        
        // Filter results to only chunks from this specific file
        const filteredResults = fileResults.filter(result => result.fileId === targetFileId);
        
        if (filteredResults.length === 0) {
          const fileData = fileMetadata as { originalName?: string; filename?: string };
          const displayName = fileData.originalName || fileData.filename || 'the document';
          
          return {
            response: `I found "${displayName}" but couldn't locate any content matching "${searchQuery}" within it. The document may not contain the specific information you're looking for, or it might be stored in a different format.`,
            actions: [
                             {
                 label: 'View in Knowledge Base',
                 action: 'view_knowledge_base',
                 description: `View the file details`
               }
            ]
          };
        }
        
        // Generate response using the search results from the specific file
        const response = await generateKnowledgeBasedResponse(
          message,
          context.entityType,
          context.entityId,
          `You are an AI assistant helping with ${context.entityType} management. Focus your response on information from the specific document provided. Be precise and cite relevant details.`,
          targetFileId
        );
        
        const fileData = fileMetadata as { originalName?: string; filename?: string };
        const displayName = fileData.originalName || fileData.filename || 'the document';
        
        return {
          response,
          actions: [
                         {
               label: 'View in Knowledge Base',
               action: 'view_knowledge_base',
               description: `View ${displayName} details`
             }
          ],
          metadata: {
            searchResults: filteredResults.length,
            specificFile: displayName,
            fileId: targetFileId,
            foundRelevantInfo: true
          }
        };
      } else {
        const searchTerm = fileId || filename || 'the specified file';
        return {
          response: `I couldn't find a file matching "${searchTerm}". The file might not be uploaded yet, or it might be associated with a different ${context.entityType}. Try uploading the document first or check the file name.`,
          actions: [
            {
              label: 'List Available Files',
              action: 'list_files',
              description: 'See all uploaded files'
            },
            {
              label: 'Upload Documents',
              action: 'upload_documents',
              description: 'Add documents to your knowledge base'
            }
          ]
        };
      }
    }

    // Regular content search across all files
    const searchResults = await searchKnowledgeBase(
      searchQuery,
      context.entityType,
      context.entityId,
      5
    );

    console.log(`DEBUG: Knowledge search for "${searchQuery}" found ${searchResults.results?.length || 0} results`);

    // Also search file metadata to see if the query matches any filenames
    const fileMetadataResults = await searchFiles(searchQuery, context.entityType, context.entityId, undefined, 'fileMetadata', 5);
    console.log(`DEBUG: File metadata search found ${fileMetadataResults.length} matching files`);

    // Combine results - if we found files by name but no content, mention the files
    if (searchResults.results.length === 0 && fileMetadataResults.length > 0) {
      const matchingFiles = fileMetadataResults.map(result => {
        const metadata = result.metadata as Record<string, unknown> | undefined;
        return (metadata?.originalName as string) || (metadata?.filename as string) || result.fileName || 'Unknown File';
      });

      return {
        response: `I found ${fileMetadataResults.length} file(s) that might be relevant to "${searchQuery}":\n\n${matchingFiles.map((name) => `• **${name}**`).join('\n')}\n\nWould you like me to analyze the content of any of these files?`,
        actions: [
          {
            label: 'View in Knowledge Base',
            action: 'view_knowledge_base',
            description: 'See all uploaded documents and files'
          }
        ],
        metadata: {
          matchingFiles: fileMetadataResults.length,
          fileNames: matchingFiles
        }
      };
    }

    if (searchResults.results.length === 0) {
      return {
        response: `I couldn't find any relevant information in your knowledge base for "${searchQuery}". Try uploading relevant documents first or asking a different question.`,
        actions: [
          {
            label: 'Upload Documents',
            action: 'upload_documents',
            description: 'Add documents to your knowledge base'
          }
        ]
      };
    }

    // Generate a contextual response
    const response = await generateKnowledgeBasedResponse(
      message,
      context.entityType,
      context.entityId,
      `You are an AI assistant helping with ${context.entityType} management. Use the knowledge base to provide helpful, accurate responses.`
    );

    return {
      response,
      actions: [
        {
          label: 'View Knowledge Base',
          action: 'view_knowledge_base',
          description: 'See all uploaded documents and files'
        }
      ],
      metadata: {
        searchResults: searchResults.results.length,
        foundRelevantInfo: true
      }
    };
  } catch (error) {
    console.error('Error in knowledge search:', error);
    return {
      response: "I encountered an error searching your knowledge base. Please try again.",
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * Handles contact search
 */
async function handleContactSearch(
  message: string,
  context: ChatContext,
  intent: Intent
): Promise<{
  response: string;
  actions?: Array<{ label: string; action: string; description: string }>;
  metadata?: Record<string, unknown>;
}> {
  try {
    // Import contact search functions
    const { searchContacts, searchFiles } = await import('../database');
    const { searchContact } = await import('../search/contact');
    const { searchKnowledgeBase } = await import('./contentExtraction');
    
    // Extract search query from parameters or use the message
    let searchQuery = intent.parameters?.query || 
                     message.replace(/find|search|who is|tell me about/gi, '').trim();
    
    // Clean the search query by removing common punctuation and question marks
    searchQuery = searchQuery.replace(/[?.!,;]$/g, '').trim();

    // Search internal contacts first with the cleaned query, including permission filtering
    let internalContacts = await searchContacts(searchQuery, undefined, context.userContactId);
    
    // If no results and query has multiple words, try searching individual words
    if (internalContacts.length === 0 && searchQuery.includes(' ')) {
      const searchTerms = searchQuery.split(' ').filter(term => term.length > 1);
      for (const term of searchTerms) {
        const termResults = await searchContacts(term, undefined, context.userContactId);
        if (termResults.length > 0) {
          internalContacts = termResults;
          console.log(`Found contacts using search term: "${term}"`);
          break;
        }
      }
    }
    
    // Search uploaded files for contact information
    const filesContacts = await searchFiles(searchQuery, context.entityType, context.entityId, undefined, 'semanticSection');

    // Search the knowledge base for contacts
    const knowledgeBaseContacts = await searchKnowledgeBase(searchQuery, context.entityType, context.entityId, 5);

    // If no internal contacts found, search externally
    let externalContacts: Array<{ name: string; organization?: { name?: string } | string; email?: string; phone?: string; title?: string; }> = [];
    if (internalContacts.length === 0) {
      externalContacts = await searchContact(searchQuery, 3);
    }

    // Combine all contact sources
    const allContacts = [...internalContacts, ...externalContacts];
    const fileContactInfo = filesContacts.length > 0 ? `Found ${filesContacts.length} file(s) containing contact information.` : '';
    const knowledgeBaseInfo = knowledgeBaseContacts.results?.length > 0 ? `Found ${knowledgeBaseContacts.results.length} knowledge base entries.` : '';

    if (allContacts.length === 0) {
      const additionalInfo = [fileContactInfo, knowledgeBaseInfo].filter(Boolean).join(' ');
      return {
        response: `I couldn't find any contacts matching "${searchQuery}" in your database. ${additionalInfo || ''} Would you like me to search the web for professional information about this person?`,
        actions: [
          {
            label: 'Search Web for Contact',
            action: 'web_search_contact',
            description: 'Search the web for professional information'
          },
          {
            label: 'Add New Contact',
            action: 'add_contact',
            description: 'Manually add this contact to your database'
          }
        ]
      };
    }

    const response = `I found ${allContacts.length} contact(s) matching "${searchQuery}":

${allContacts.map((contact, index) => {
  // Handle organization display - could be string or object
  let organizationName = '';
  if (contact.organization) {
    if (typeof contact.organization === 'string') {
      organizationName = contact.organization;
    } else if (contact.organization && typeof contact.organization === 'object' && 'name' in contact.organization) {
      organizationName = contact.organization.name || '';
    }
  }
  
  return `**${index + 1}. ${contact.name}**
  ${contact.title ? `- Title: ${contact.title}` : ''}
  ${organizationName ? `- Organization: ${organizationName}` : ''}
  ${contact.email ? `- Email: ${contact.email}` : ''}
  ${contact.phone ? `- Phone: ${contact.phone}` : ''}`;
}).join('\n\n')}`;

    return {
      response,
      actions: [
        {
          label: 'View All Contacts',
          action: 'view_contacts',
          description: 'See your complete contact database'
        }
      ],
      metadata: {
        contactsFound: allContacts.length,
        hasInternal: internalContacts.length > 0,
        hasExternal: externalContacts.length > 0
      }
    };
  } catch (error) {
    console.error('Error in contact search:', error);
    return {
      response: "I encountered an error searching for contacts. Please try again.",
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * Handles organization search
 */
async function handleOrganizationSearch(
  message: string,
  context: ChatContext,
  intent: Intent
): Promise<{
  response: string;
  actions?: Array<{ label: string; action: string; description: string }>;
  metadata?: Record<string, unknown>;
}> {
  try {
    // Import organization search functions
    const { searchOrganizations, getOrganizationsByContactId } = await import('../database');
    
    // Extract search query from parameters or use the message
    let searchQuery = intent.parameters?.query || 
                     message.replace(/tell me about|who is|what is|search for|find/gi, '').trim();
    
    // Clean the search query
    searchQuery = searchQuery.replace(/[?.!,;]$/g, '').trim();

    // Search for organizations
    const organizations = await searchOrganizations(searchQuery);
    
    if (organizations.length === 0) {
      return {
        response: `I couldn't find any organizations matching "${searchQuery}" in your database. Would you like me to search the web for information about this organization?`,
        actions: [
          {
            label: 'Search Web for Organization',
            action: 'web_search_organization',
            description: 'Search the web for organization information'
          },
          {
            label: 'Add New Organization',
            action: 'add_organization',
            description: 'Manually add this organization to your database'
          }
        ]
      };
    }

    // Get user's organizations to identify own organization (only if userContactId exists)
    let userOrgIds: string[] = [];
    if (context.userContactId) {
      const userOrganizations = await getOrganizationsByContactId(context.userContactId);
      userOrgIds = userOrganizations.map(org => org.id);
    }

    // For each organization, get related opportunities and proposals from database
    const { prisma } = await import('../database/prisma/client');
    const { checkOpportunityPermission, checkProposalPermission } = await import('../database');
    
    const orgData = await Promise.all(organizations.map(async (org) => {
      const orgId = org.id || '';
      
      // Search for opportunities where this organization is involved
      const [allOpportunities, allProposals] = await Promise.all([
        prisma.opportunity.findMany({
          where: {
            OR: [
              { ownerOrganizationId: orgId },
              { forOrganizationId: orgId }
            ]
          },
          select: {
            id: true,
            title: true,
            status: true,
            estimate: true,
            createdAt: true,
            ownerOrganizationId: true,
            forOrganizationId: true
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.proposal.findMany({
          where: {
            OR: [
              { ownerOrganizationId: orgId },
              { forOrganizationId: orgId }
            ]
          },
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            ownerOrganizationId: true,
            forOrganizationId: true
          },
          orderBy: { createdAt: 'desc' }
        })
      ]);
      
      // Filter by user permissions - only show what they can access
      const opportunities = [];
      const proposals = [];
      
      if (context.userContactId) {
        console.log(`🔐 Checking permissions for ${allOpportunities.length} opportunities and ${allProposals.length} proposals for org: ${org.name}`);
        
        // Check permissions for each opportunity
        for (const opp of allOpportunities) {
          const hasPermission = await checkOpportunityPermission(context.userContactId, opp.id);
          if (hasPermission) {
            opportunities.push(opp);
          }
        }
        
        // Check permissions for each proposal
        for (const prop of allProposals) {
          const hasPermission = await checkProposalPermission(context.userContactId, prop.id);
          if (hasPermission) {
            proposals.push(prop);
          }
        }
        
        console.log(`✅ User has access to ${opportunities.length}/${allOpportunities.length} opportunities and ${proposals.length}/${allProposals.length} proposals for org: ${org.name}`);
      } else {
        console.log('⚠️ No userContactId provided, skipping permission checks');
      }
      
      return {
        ...org,
        opportunities,
        proposals,
        isUserOrg: orgId && userOrgIds.includes(orgId)
      };
    }));

    // Build response based on organization data
    let response = `I found ${organizations.length} organization(s) matching "${searchQuery}":\n\n`;

    orgData.forEach((org, index) => {
      const activeOpportunities = org.opportunities || [];
      const activeProposals = org.proposals || [];
      
      response += `**${index + 1}. ${org.name}**\n`;
      
      if (org.isUserOrg) {
        response += `  - 🏢 **This is your organization**\n`;
      }
      
      if (org.website) {
        response += `  - Website: ${org.website}\n`;
      }
      
      if (org.sector) {
        response += `  - Sector: ${org.sector}\n`;
      }
      
      if (org.background) {
        response += `  - ${org.background}\n`;
      }
      
      // Show opportunities and proposals details
      if (activeOpportunities.length > 0) {
        response += `  - 🎯 **${activeOpportunities.length} opportunity(s):**\n`;
        activeOpportunities.slice(0, 3).forEach(opp => {
          const estimateValue = opp.estimate && typeof opp.estimate === 'object' && 'value' in opp.estimate 
            ? opp.estimate.value as number 
            : null;
          response += `    • ${opp.title} (${opp.status})`;
          if (estimateValue) {
            response += ` - $${estimateValue.toLocaleString()}`;
          }
          response += '\n';
        });
        if (activeOpportunities.length > 3) {
          response += `    • ... and ${activeOpportunities.length - 3} more\n`;
        }
      }
      
      if (activeProposals.length > 0) {
        response += `  - 📄 **${activeProposals.length} proposal(s):**\n`;
        activeProposals.slice(0, 3).forEach(prop => {
          response += `    • ${prop.title} (${prop.status})\n`;
        });
        if (activeProposals.length > 3) {
          response += `    • ... and ${activeProposals.length - 3} more\n`;
        }
      }
      
      if (activeOpportunities.length === 0 && activeProposals.length === 0) {
        response += `  - No opportunities or proposals you have access to\n`;
      }
      
      response += '\n';
    });

    // Generate action buttons based on results
    const actions = [];
    
    if (orgData.length === 1) {
      const org = orgData[0];
      
      if (org.opportunities && org.opportunities.length > 0) {
        actions.push({
          label: 'View Opportunities',
          action: 'view_organization_opportunities',
          description: `View ${org.opportunities.length} opportunities for ${org.name}`
        });
      }
      
      if (org.proposals && org.proposals.length > 0) {
        actions.push({
          label: 'View Proposals', 
          action: 'view_organization_proposals',
          description: `View ${org.proposals.length} proposals for ${org.name}`
        });
      }
      
      actions.push({
        label: 'View Organization Details',
        action: 'view_organization_details',
        description: `See complete profile for ${org.name}`
      });
    } else {
      actions.push({
        label: 'View All Organizations',
        action: 'view_organizations',
        description: 'See your complete organization database'
      });
    }

    return {
      response,
      actions,
      metadata: {
        organizationsFound: organizations.length,
        totalOpportunities: orgData.reduce((sum, org) => sum + (org.opportunities?.length || 0), 0),
        totalProposals: orgData.reduce((sum, org) => sum + (org.proposals?.length || 0), 0),
        hasUserOrg: orgData.some(org => org.isUserOrg),
        tabContext: context.tabContext,
        processingTime: Date.now()
      }
    };
  } catch (error) {
    console.error('Error in organization search:', error);
    return {
      response: "I encountered an error searching for organizations. Please try again.",
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

// Define the opportunity list item type for search results
interface OpportunityListItem {
  id: string;
  title?: string;
  organizationId: string;
  organization?: { id: string; name: string };
  forOrganization?: { id: string; name: string };
  status?: string;
  deadline?: string;
  tasks?: unknown[];
  estimatedValue?: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/**
 * Handle opportunity search requests
 */
async function handleOpportunitySearch(
  message: string,
  context: ChatContext,
  intent: Intent
): Promise<{
  response: string;
  actions?: Array<{ label: string; action: string; description: string }>;
  metadata?: Record<string, unknown>;
}> {
  try {
    const searchQuery = intent.parameters?.query || message;
    console.log(`🔍 Searching opportunities for: "${searchQuery}"`);

    if (!context.userContactId) {
      return {
        response: "I need to verify your identity to search opportunities. Please ensure you're logged in.",
        metadata: { error: 'No user contact ID' }
      };
    }

    // Check if this is being called from transcript context - show filtered opportunities
    const recentTranscriptMessage = context.recentMessages?.find(msg => 
      msg.metadata?.transcriptAnalysis && msg.metadata?.opportunityMatches
    );
    
    // If we have transcript analysis and the search seems to be for selecting from matches
    if (recentTranscriptMessage && 
        (searchQuery.toLowerCase().includes('transcript') || 
         searchQuery.toLowerCase().includes('different opportunity') ||
         message.toLowerCase().includes('choose') ||
         message.toLowerCase().includes('select'))) {
      console.log('🎯 Using transcript-filtered opportunities');
      return await handleSelectOpportunity(message, context, intent);
    }

    // Import database functions
    const { getOpportunitiesByContactId } = await import('../database');

    // Get all opportunities the user has access to
    const allOpportunities = await getOpportunitiesByContactId(context.userContactId) as OpportunityListItem[];

    if (!allOpportunities || allOpportunities.length === 0) {
      return {
        response: "I couldn't find any opportunities you have access to. You may need to be added to an opportunity team or check your permissions.",
        actions: [
          {
            label: 'View All Opportunities',
            action: 'navigate_opportunities',
            description: 'Go to the opportunities page'
          }
        ],
        metadata: { searchQuery }
      };
    }

    console.log(`📊 Found ${allOpportunities.length} total opportunities`);

    // Analyze the search query to determine what type of search to perform
    let filteredOpportunities = [...allOpportunities];
    let searchType = 'general';

    // Check for specific search patterns
    const queryLower = searchQuery.toLowerCase();
    
    // Biggest/largest opportunity (by deal value)
    if (queryLower.includes('biggest') || queryLower.includes('largest') || queryLower.includes('highest value') || queryLower.includes('most valuable')) {
      searchType = 'biggest';
      filteredOpportunities = allOpportunities.filter(opp => opp.estimatedValue && opp.estimatedValue > 0);
      filteredOpportunities.sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0));
    }
    // Most recent opportunity
    else if (queryLower.includes('recent') || queryLower.includes('newest') || queryLower.includes('latest') || queryLower.includes('new')) {
      searchType = 'recent';
      filteredOpportunities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    // Search by team member name
    else if (queryLower.includes('wes') || queryLower.includes('team') || queryLower.includes('working on')) {
      searchType = 'team';
      // For now, we'll show all opportunities since we don't have detailed team member info
      // In the future, we could query the team members table
    }
    else {
      searchType = 'keyword';
      const keywords = extractKeywords(queryLower);
      
      
      // General keyword search
      filteredOpportunities = allOpportunities.filter(opp => {
        const titleMatch = opp.title && keywords.some(keyword => 
          opp.title!.toLowerCase().includes(keyword)
        );
        return titleMatch;
      });
    }

    // Limit results to top 10
    const limitedOpportunities = filteredOpportunities.slice(0, 10);

    // Build response based on search type and results
    let response = '';
    
    if (limitedOpportunities.length === 0) {
      response = `I couldn't find any opportunities matching "${searchQuery}". You have access to ${allOpportunities.length} total opportunities.`;
    } else {
      switch (searchType) {
        case 'biggest':
          response = `**Biggest Opportunities by Deal Value:**\n\n`;
          break;
        case 'recent':
          response = `**Most Recent Opportunities:**\n\n`;
          break;
        case 'team':
          response = `**Opportunities You're Working On:**\n\n`;
          break;
        case 'keyword':
          response = `**Opportunities matching "${searchQuery}":**\n\n`;
          break;
        default:
          response = `**Found ${limitedOpportunities.length} opportunities:**\n\n`;
      }

      limitedOpportunities.forEach((opp, index) => {
        response += `**${index + 1}. ${opp.title || 'Untitled Opportunity'}**\n`;
        
        if (opp.forOrganization?.name) {
          response += `  - 🏢 Client: ${opp.forOrganization.name}\n`;
        }
        
        if (opp.estimatedValue) {
          response += `  - 💰 Value: $${opp.estimatedValue.toLocaleString()}\n`;
        }
        
        if (opp.status) {
          response += `  - 📊 Status: ${opp.status}\n`;
        }
        
        if (opp.deadline) {
          const deadline = new Date(opp.deadline);
          response += `  - 📅 Deadline: ${deadline.toLocaleDateString()}\n`;
        }
        
        const createdDate = new Date(opp.createdAt);
        response += `  - 🗓️ Created: ${createdDate.toLocaleDateString()}\n`;
        
        response += '\n';
      });

      // Add summary statistics
      const totalValue = limitedOpportunities
        .filter(opp => opp.estimatedValue)
        .reduce((sum, opp) => sum + (opp.estimatedValue || 0), 0);
      
      if (totalValue > 0) {
        response += `**Summary:** ${limitedOpportunities.length} opportunities with total value of $${totalValue.toLocaleString()}\n`;
      }
    }

    // Generate action buttons based on search results
    const actions = [];
    
    // If we have specific opportunity results, show contextual buttons
    if (limitedOpportunities.length === 1) {
      const opp = limitedOpportunities[0];
      actions.push({
        label: 'More Details',
        action: 'analyze_opportunity',
        description: `Get detailed analysis of ${opp.title}`
      });
      actions.push({
        label: 'View Opportunity',
        action: 'navigate_opportunity',
        description: `Open ${opp.title} in opportunities page`
      });
    } else if (limitedOpportunities.length > 1) {
      // Multiple opportunities found - show options to explore
      actions.push({
        label: 'View All Results',
        action: 'navigate_opportunities',
        description: `View all ${limitedOpportunities.length} opportunities`
      });
      actions.push({
        label: 'Refine Search',
        action: 'search_opportunities',
        description: 'Search with more specific terms'
      });
    } else {
      // No specific results - show general search options
      actions.push({
        label: 'View All Opportunities',
        action: 'navigate_opportunities',
        description: 'Go to the opportunities page'
      });
      actions.push({
        label: 'Search by Keywords',
        action: 'search_opportunities',
        description: 'Search opportunities by specific terms'
      });
    }

    // Add contextual search options based on search type
    if (searchType !== 'biggest') {
      actions.push({
        label: 'Find Biggest Opportunities',
        action: 'search_opportunities_biggest',
        description: 'Show opportunities by deal value'
      });
    }

    if (searchType !== 'recent') {
      actions.push({
        label: 'Find Recent Opportunities',
        action: 'search_opportunities_recent',
        description: 'Show most recent opportunities'
      });
    }

    return {
      response,
      actions,
      metadata: {
        searchQuery,
        searchType,
        totalFound: limitedOpportunities.length,
        totalAvailable: allOpportunities.length,
        totalValue: limitedOpportunities
          .filter(opp => opp.estimatedValue)
          .reduce((sum, opp) => sum + (opp.estimatedValue || 0), 0)
      }
    };

  } catch (error) {
    console.error('Error in opportunity search:', error);
    return {
      response: "I encountered an error searching opportunities. Please try again or check your permissions.",
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * Helper function to extract keywords from search query
 */
function extractKeywords(query: string): string[] {
  // Remove common stop words and extract meaningful terms
  const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'what', 'which', 'who', 'how', 'where', 'when', 'is', 'are', 'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would', 'could', 'should'];
  
  return query
    .split(/\s+/)
    .map(word => word.toLowerCase().replace(/[^\w]/g, ''))
    .filter(word => word.length > 2 && !stopWords.includes(word));
}

/**
 * Handles web search using Perplexity
 */
async function handleWebSearch(
  message: string,
  context: ChatContext,
  intent: Intent
): Promise<{
  response: string;
  actions?: Array<{ label: string; action: string; description: string }>;
  metadata?: Record<string, unknown>;
}> {
  try {
    // Import web search function
    const { searchPerplexity } = await import('../search/base');
    
    // Extract search query from parameters or use the message
    const searchQuery = intent.parameters?.query || message;
    
    const systemPrompt = `You are a research assistant helping with ${context.entityType} management. Provide comprehensive, accurate information from web sources.`;
    
    const userPrompt = `Search for: ${searchQuery}
    
Context: This is for a ${context.entityType} in the ${context.tabContext || 'content'} tab.

Please provide a well-structured response with key findings, relevant insights, and actionable information.`;

    const webResponse = await searchPerplexity(MODELS.perplexity, systemPrompt, userPrompt);

    return {
      response: `**Web Search Results for "${searchQuery}":**\n\n${webResponse}`,
      actions: [
        {
          label: 'Search Again',
          action: 'web_search',
          description: 'Perform another web search'
        }
      ],
      metadata: {
        searchQuery,
        sourceType: 'web'
      }
    };
  } catch (error) {
    console.error('Error in web search:', error);
    return {
      response: "I encountered an error searching the web. Please check your internet connection and try again.",
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * Handles general chat
 */
async function handleGeneralChat(
  message: string,
  context: ChatContext
): Promise<{
  response: string;
  actions?: Array<{ label: string; action: string; description: string }>;
  metadata?: Record<string, unknown>;
}> {
  try {
    const systemPrompt = `You are a helpful AI assistant for a proposal and opportunity management system. You're currently helping with a ${context.entityType} in the ${context.tabContext || 'content'} tab.

Available capabilities:
- Search knowledge base and uploaded documents
- Find contact information  
- Search the web for external information
- Help improve content and proposals
- Provide guidance on using the system

Be helpful, concise, and suggest relevant actions when appropriate.`;

    const response = await openai.responses.parse({
      model: MODELS.default,
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      text: { format: zodTextFormat(z.object({ content: z.string() }), 'content') }
    });

    const content = response.output_parsed as { content: string };

    return {
      response: content.content,
      actions: [
        {
          label: 'Search Knowledge Base',
          action: 'search_knowledge',
          description: 'Search your uploaded documents'
        },
        {
          label: 'Find Contacts',
          action: 'search_contacts', 
          description: 'Search for people and contact information'
        },
        {
          label: 'Web Search',
          action: 'web_search',
          description: 'Search the web for external information'
        }
      ],
      metadata: {
        chatType: 'general'
      }
    };
  } catch (error) {
    console.error('Error in general chat:', error);
    return {
      response: "I'm here to help! You can ask me to search your knowledge base, find contacts, search the web, or help improve your content. What would you like to do?",
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * Handles help requests
 */
async function handleHelp(
  message: string,
  context: ChatContext
): Promise<{
  response: string;
  actions?: Array<{ label: string; action: string; description: string }>;
  metadata?: Record<string, unknown>;
}> {
  const helpResponse = `**I'm here to help!** Here's what I can do for you in this ${context.entityType}:

🔍 **Search & Find:**
- Search your knowledge base and uploaded documents
- Find contact information and professional profiles
- Search the web for external information and research

📄 **Content & Analysis:**
- Analyze uploaded documents
- Help improve existing content
- Generate insights from your data

💬 **General Assistance:**
- Answer questions about your ${context.entityType}
- Provide guidance on using the system
- Help with workflow and process questions

**Quick Actions:**
- Type "search [topic]" to search your knowledge base
- Type "find [person name]" to search for contacts  
- Type "web search [query]" to search the internet
- Upload documents for analysis and knowledge extraction

What would you like me to help you with?`;

  return {
    response: helpResponse,
    actions: [
      {
        label: 'Search Knowledge Base',
        action: 'search_knowledge',
        description: 'Search your uploaded documents'
      },
      {
        label: 'Find Contacts',
        action: 'search_contacts',
        description: 'Search for people and contact information'
      },
      {
        label: 'Web Search',
        action: 'web_search',
        description: 'Search the web for information'
      }
    ],
    metadata: {
      helpType: 'overview'
    }
  };
}

/**
 * Handles content improvement requests
 */
async function handleContentImprovement(
  message: string,
  context: ChatContext,
  intent: Intent
): Promise<{
  response: string;
  actions?: Array<{ label: string; action: string; description: string }>;
  metadata?: Record<string, unknown>;
}> {
  try {
    // This would integrate with existing content generation functions
    const { processChatMessage } = await import('./contentGeneration');
    if (intent.parameters?.query) {
      message += `\n\nand this query: ${intent.parameters.query}`;
    }
    const improvedContent = await processChatMessage(
      `Improve the following content based on this request: ${message}\n\nCurrent content: ${context.currentContent?.join('\n') || 'No current content'}`
    );

    return {
      response: `**Content Improvement Suggestions:**\n\n${improvedContent}`,
      actions: [
        {
          label: 'Apply Changes',
          action: 'apply_content_changes',
          description: 'Apply the suggested improvements'
        },
        {
          label: 'Get More Suggestions',
          action: 'more_improvements',
          description: 'Get additional improvement ideas'
        }
      ],
      metadata: {
        improvementType: 'content',
        hasChanges: true
      }
    };
  } catch (error) {
    console.error('Error in content improvement:', error);
    return {
      response: "I can help improve your content! Please share the specific content you'd like me to work on, or tell me what kind of improvements you're looking for.",
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * Handles list files action
 */
async function handleListFiles(
  message: string,
  context: ChatContext
): Promise<{
  response: string;
  actions?: Array<{ label: string; action: string; description: string }>;
  metadata?: Record<string, unknown>;
}> {
  try {
    // Use the existing searchFiles function which now works with content field
    const { searchFiles } = await import('../database');
    
    // Search for all fileMetadata records - empty query will return all
    const fileResults = await searchFiles('', context.entityType, context.entityId, undefined, 'fileMetadata', 50);
    
    console.log(`DEBUG: Found ${fileResults.length} fileMetadata records`);
    if (fileResults.length > 0) {
      console.log('DEBUG: First file result:', fileResults[0]);
    }
    
    if (fileResults.length === 0) {
      return {
        response: "I couldn't find any files in your knowledge base yet.",
        actions: [
          {
            label: 'Upload Files',
            action: 'upload_files',
            description: 'Add files to your knowledge base'
          }
        ]
      };
    }

    let response = `📁 **Available Files in Knowledge Base:** (${fileResults.length} files)\n\n`;
    
    fileResults.forEach((result, index) => {
      // Extract file info from metadata which should now be properly populated
      const metadata = result.metadata as Record<string, unknown> | undefined;
      const fileName = (metadata?.originalName as string) || (metadata?.filename as string) || result.fileName || 'Unknown File';
      const fileType = (metadata?.fileType as string) || 'unknown';
      const fileSize = metadata?.fileSize ? `${Math.round((metadata.fileSize as number) / 1024)} KB` : 'unknown size';
      const uploadedAt = metadata?.uploadedAt ? new Date(metadata.uploadedAt as string).toLocaleDateString() : 'unknown';
      
      response += `${index + 1}. **${fileName}**\n`;
      response += `   📄 File ID: ${result.fileId}\n`;
      response += `   🔍 Type: ${fileType}\n`;
      response += `   📊 Size: ${fileSize}\n`;
      response += `   📅 Uploaded: ${uploadedAt}\n\n`;
    });

    return {
      response,
      actions: [
        {
          label: 'View All Files',
          action: 'view_files',
          description: 'See all uploaded files'
        }
      ],
      metadata: {
        fileCount: fileResults.length,
        files: fileResults.map(result => {
          const metadata = result.metadata as Record<string, unknown> | undefined;
          return {
            fileId: result.fileId,
            fileName: (metadata?.originalName as string) || (metadata?.filename as string) || result.fileName || 'Unknown File'
          };
        })
      }
    };
  } catch (error) {
    console.error('Error in listing files:', error);
    return {
      response: "I encountered an error listing your files. Please try again.",
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * Handles document analysis requests
 */
async function handleAnalyzeDocument(
  message: string,
  context: ChatContext,
  intent: Intent
): Promise<{
  response: string;
  actions?: Array<{ label: string; action: string; description: string }>;
  metadata?: Record<string, unknown>;
}> {
  try {
    const { getFileMetadata } = await import('../database/prisma/fileData');
    const { searchFiles } = await import('../database');
    
    const fileId = intent.parameters?.fileId;
    const filename = intent.parameters?.filename;
    
    // Try to find the file by ID first, then by filename
    let fileMetadata = null;
    let targetFileId = fileId;
    
    if (fileId) {
      fileMetadata = await getFileMetadata(fileId, context.entityType, context.entityId);
      if (fileMetadata) {
        console.log(`Found file metadata for analysis: ${fileId}`);
      }
    }
    
    if (!fileMetadata && filename) {
      // Search for file by filename in metadata
      const fileMetadataResults = await searchFiles('', context.entityType, context.entityId, undefined, 'fileMetadata', 50);
      const matchingFile = fileMetadataResults.find(result => {
        const metadata = result.metadata;
        return (metadata?.originalName === filename) || 
               (metadata?.filename === filename) ||
               result.fileName === filename;
      });
      
      if (matchingFile) {
        targetFileId = matchingFile.fileId;
        fileMetadata = await getFileMetadata(targetFileId, context.entityType, context.entityId);
        console.log(`Found file by filename for analysis: ${filename}, fileId: ${targetFileId}`);
      }
    }
    
    if (fileMetadata && targetFileId) {
      const fileData = fileMetadata as { originalName?: string; filename?: string };
      const displayName = fileData.originalName || fileData.filename || 'the document';
      
      // Get file content for analysis
      const fileChunks = await searchFiles('', context.entityType, context.entityId, undefined, 'semanticSection', 100);
      const documentChunks = fileChunks.filter(chunk => chunk.fileId === targetFileId);
      
      console.log(`DEBUG: Found ${fileChunks.length} total semantic sections, ${documentChunks.length} for file ${targetFileId}`);
      
      if (documentChunks.length === 0) {
        // Try searching for chunks instead
        const alternativeChunks = await searchFiles('', context.entityType, context.entityId, undefined, 'chunk', 100);
        const alternativeDocumentChunks = alternativeChunks.filter(chunk => chunk.fileId === targetFileId);
        
        console.log(`DEBUG: Alternative search found ${alternativeChunks.length} total chunks, ${alternativeDocumentChunks.length} for file ${targetFileId}`);
        
        if (alternativeDocumentChunks.length === 0) {
          return {
            response: `I found "${displayName}" but there's no content available for analysis. The document may still be processing or there was an error during upload.`,
            actions: [
              {
                label: 'View in Knowledge Base',
                action: 'view_knowledge_base',
                description: 'Check file status'
              }
            ]
          };
        } else {
          // Use the alternative chunks
          console.log(`DEBUG: Using ${alternativeDocumentChunks.length} chunks for analysis`);
        }
      }
      
      // Generate document analysis
      const { generateKnowledgeBasedResponse } = await import('./contentExtraction');
      const analysisQuery = message.includes('summarize') ? `Provide a comprehensive summary of ${displayName}` : 
                           message.includes('requirements') ? `Extract and list all requirements from ${displayName}` :
                           `Analyze ${displayName} and provide key insights based on: ${message}`;
      
      const analysis = await generateKnowledgeBasedResponse(
        analysisQuery,
        context.entityType,
        context.entityId,
        `You are analyzing the document "${displayName}". Provide a thorough analysis based on the user's request: ${message}`
      );
      
      return {
        response: `## Analysis of "${displayName}"\n\n${analysis}`,
        actions: [
          {
            label: 'View in Knowledge Base',
            action: 'view_knowledge_base',
            description: `View ${displayName} details`
          }
        ],
        metadata: {
          analyzedFile: displayName,
          fileId: targetFileId,
          chunksAnalyzed: documentChunks.length
        }
      };
    } else {
      const searchTerm = fileId || filename || 'the specified document';
      return {
        response: `I couldn't find the document "${searchTerm}" for analysis. Please make sure the file is uploaded to this ${context.entityType}.`,
        actions: [
          {
            label: 'List Available Files',
            action: 'list_files',
            description: 'See all uploaded files'
          },
          {
            label: 'Upload Documents',
            action: 'upload_documents',
            description: 'Add documents for analysis'
          }
        ]
      };
    }
  } catch (error) {
    console.error('Error in document analysis:', error);
    return {
      response: "I encountered an error analyzing the document. Please try again or upload the document first.",
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * Handle opportunity enhancement based on uploaded content
 */
async function handleEnhanceOpportunity(
  message: string,
  context: ChatContext,
  intent: Intent
): Promise<{
  response: string;
  actions?: Array<{ label: string; action: string; description: string }>;
  metadata?: Record<string, unknown>;
}> {
  try {
    const opportunityId = intent.parameters?.opportunityId;
    const opportunityTitle = intent.parameters?.opportunityTitle;
    
    if (!opportunityId && !opportunityTitle) {
      return {
        response: "I need to know which specific opportunity you'd like to enhance. Please specify the opportunity name or ID.",
        actions: [
          {
            label: 'View All Opportunities',
            action: 'search_opportunities',
            description: 'See all available opportunities'
          }
        ],
        metadata: { error: 'Missing opportunity identifier' }
      };
    }

    // Get dashboard context to find the opportunity details
    const dashboardContext = context.recentMessages?.[context.recentMessages.length - 1]?.metadata?.dashboardContext;
    let targetOpportunity = null;
    
    if (dashboardContext) {
      targetOpportunity = dashboardContext.opportunities.find(opp => 
        opp.id === opportunityId || opp.title.toLowerCase().includes((opportunityTitle || '').toLowerCase())
      );
    }

    const opportunityName = targetOpportunity?.title || opportunityTitle || opportunityId;
    const opportunityValue = targetOpportunity?.value ? `$${targetOpportunity.value.toLocaleString()}` : '';
    const opportunityStatus = targetOpportunity?.status || '';

    let response = `🎯 **Opportunity Enhancement Suggestion**

I found content that could enhance the **${opportunityName}** opportunity`;

    if (opportunityValue || opportunityStatus) {
      response += ` (${[opportunityValue, opportunityStatus].filter(Boolean).join(' - ')})`;
    }

    response += `.

**Suggested Actions:**
- **Add document content** to the opportunity knowledge base
- **Extract key insights** and add them to opportunity notes  
- **Update opportunity sections** with relevant information
- **Create proposal sections** based on this content

Would you like me to extract specific information from the uploaded content and add it to this opportunity?`;

    return {
      response,
      actions: [
        {
          label: `View ${opportunityName}`,
          action: 'view_opportunity',
          description: `Go to the ${opportunityName} opportunity page`
        },
        {
          label: 'Extract Key Information',
          action: 'extract_to_opportunity',
          description: 'Extract relevant content and add to opportunity'
        },
        {
          label: 'Create Proposal Section',
          action: 'create_proposal_section',
          description: 'Create new proposal section from this content'
        },
        {
          label: 'Add to Knowledge Base',
          action: 'add_to_knowledge',
          description: 'Store this document in the knowledge base'
        }
      ],
      metadata: {
        opportunityId: targetOpportunity?.id || opportunityId,
        opportunityTitle: opportunityName,
        enhancementSuggested: true
      }
    };

  } catch (error) {
    console.error('Error handling opportunity enhancement:', error);
    return {
      response: "I encountered an error while analyzing the opportunity enhancement. Please try again or contact support.",
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * Handle direct opportunity analysis - provides detailed summary of a specific opportunity
 */
async function handleAnalyzeOpportunity(
  message: string,
  context: ChatContext,
  intent: Intent
): Promise<{
  response: string;
  actions?: Array<{ label: string; action: string; description: string }>;
  metadata?: Record<string, unknown>;
}> {
  try {
    const { opportunityId, opportunityTitle } = intent.parameters || {};
    
    if (!opportunityId || !opportunityTitle) {
      return {
        response: "I need to know which specific opportunity you'd like me to analyze. Could you specify the opportunity name?",
        actions: [
          {
            label: "List Opportunities",
            action: "search_opportunities",
            description: "Show all available opportunities"
          }
        ]
      };
    }

    // Get opportunity details from database
    const { getOpportunityById } = await import('@/src/lib/database');
    const opportunity = await getOpportunityById(opportunityId);
    
    if (!opportunity) {
      return {
        response: `I couldn't find the opportunity "${opportunityTitle}" in the database. It may have been moved or deleted.`,
        actions: [
          {
            label: "Search Opportunities",
            action: "search_opportunities", 
            description: "Search for similar opportunities"
          }
        ]
      };
    }

    // Format opportunity details for analysis - using safe property access
    const opp = opportunity as Record<string, unknown>;
    const opportunityDetails = {
      title: (opp.title as string) || opportunityTitle,
      status: (opp.status as string) || 'Unknown',
      value: (opp.estimatedValue as number) || ((opp.estimate as Record<string, unknown>)?.value as number) || 0,
      organization: ((opp.organization as Record<string, unknown>)?.name as string) || 'Unknown',
      createdAt: opp.createdAt ? new Date(opp.createdAt as string).toLocaleDateString() : 'Unknown',
      deadline: opp.deadline ? new Date(opp.deadline as string).toLocaleDateString() : 'Not set',
      team: (opp.team as Array<Record<string, unknown>>) || [],
      tasks: (opp.tasks as Array<Record<string, unknown>>) || [],
      description: (opp.description as string) || ((opp.estimate as Record<string, unknown>)?.description as string) || '',
      requirements: (opp.requirements as string) || ((opp.estimate as Record<string, unknown>)?.requirements as string) || ''
    };

    // Calculate task completion
    const totalTasks = opportunityDetails.tasks.length;
    const completedTasks = opportunityDetails.tasks.filter((task: Record<string, unknown>) => task.completed).length;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Generate comprehensive opportunity summary
    let response = `## ${opportunityDetails.title}\n\n`;
    
    response += `**Status:** ${opportunityDetails.status}\n`;
    response += `**Estimated Value:** $${opportunityDetails.value.toLocaleString()}\n`;
    response += `**Organization:** ${opportunityDetails.organization}\n`;
    response += `**Created:** ${opportunityDetails.createdAt}\n`;
    if (opportunityDetails.deadline !== 'Not set') {
      response += `**Deadline:** ${opportunityDetails.deadline}\n`;
    }
    response += `**Progress:** ${completedTasks}/${totalTasks} tasks completed (${progressPercentage}%)\n\n`;

    if (opportunityDetails.description) {
      response += `**Description:**\n${opportunityDetails.description}\n\n`;
    }

    if (opportunityDetails.requirements) {
      response += `**Requirements:**\n${opportunityDetails.requirements}\n\n`;
    }

    if (opportunityDetails.team.length > 0) {
      response += `**Team Members:**\n`;
      opportunityDetails.team.forEach((member: Record<string, unknown>) => {
        response += `- ${member.email} (${member.role})\n`;
      });
      response += '\n';
    }

    if (totalTasks > 0) {
      response += `**Tasks:**\n`;
      opportunityDetails.tasks.forEach((task: Record<string, unknown>) => {
        const status = task.completed ? '✅' : '⏳';
        response += `${status} ${task.title}\n`;
        if (task.description) {
          response += `   ${task.description}\n`;
        }
      });
    }

    // Provide contextual action buttons
    const actions = [
      {
        label: "View Full Opportunity",
        action: "view_opportunity",
        description: `Open ${opportunityDetails.title} details`
      },
      {
        label: "Create Proposal",
        action: "create_proposal",
        description: "Start a new proposal for this opportunity"
      }
    ];

    // Add status-specific actions
    if (opportunityDetails.status === 'opportunity') {
      actions.push({
        label: "Move to Proposal Stage",
        action: "update_status",
        description: "Advance this opportunity to proposal development"
      });
    }

    if (progressPercentage < 100) {
      actions.push({
        label: "Complete Next Task",
        action: "complete_task",
        description: "Work on the next incomplete task"
      });
    }

    return {
      response,
      actions,
      metadata: {
        opportunityId,
        opportunityTitle: opportunityDetails.title,
        status: opportunityDetails.status,
        value: opportunityDetails.value,
        progress: progressPercentage,
        analyzed: true
      }
    };

  } catch (error) {
    console.error('Error analyzing opportunity:', error);
    return {
      response: "I encountered an error while analyzing the opportunity. Please try again or contact support.",
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
} 

 /**
  * Handle viewing opportunity matches from transcript analysis
  */
 // eslint-disable-next-line @typescript-eslint/no-unused-vars
 async function handleViewOpportunityMatches(
  message: string,
  context: ChatContext,
  _intent: Intent
): Promise<{
  response: string;
  actions?: Array<{ label: string; action: string; description: string }>;
  metadata?: Record<string, unknown>;
}> {
  try {
    // Get recent transcript analysis from context
    const recentTranscriptMessage = context.recentMessages?.find(msg => 
      msg.metadata?.transcriptAnalysis && msg.metadata?.opportunityMatches
    );
    
    if (!recentTranscriptMessage) {
      return {
        response: "I couldn't find recent transcript analysis results. Please upload and analyze a transcript first.",
        actions: [
          {
            label: 'Upload Transcript',
            action: 'upload_document',
            description: 'Upload a new transcript for analysis'
          }
        ]
      };
    }
    
    const opportunityMatches = recentTranscriptMessage.metadata?.opportunityMatches;
    const matches = opportunityMatches?.matches || [];
    
    if (matches.length === 0) {
      return {
        response: "No opportunity matches were found in the transcript analysis.",
        actions: [
          {
            label: 'Create New Opportunity',
            action: 'create_opportunity_from_transcript',
            description: 'Create a new opportunity based on transcript insights'
          }
        ]
      };
    }
    
    let response = `**🎯 Opportunity Matches from Transcript Analysis:**\n\n`;
    
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
     matches.forEach((match: any, index: number) => {
      response += `**${index + 1}. Match ${match.relevanceScore}% - ${match.opportunityId}**\n`;
      response += `**Reasoning:** ${match.reasoning}\n\n`;
    });
    
    const actions = [
      {
        label: 'Add to Top Match',
        action: 'add_transcript_to_opportunity',
        description: 'Add transcript insights to the highest-rated opportunity'
      },
      {
        label: 'Create New Opportunity',
        action: 'create_opportunity_from_transcript',
        description: 'Create a new opportunity instead'
      }
    ];
    
    return {
      response,
      actions,
      metadata: {
        matchCount: matches.length,
        topMatchScore: matches[0]?.relevanceScore || 0
      }
    };
  } catch (error) {
    console.error('Error viewing opportunity matches:', error);
    return {
      response: "I encountered an error retrieving opportunity matches. Please try the analysis again.",
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

 /**
  * Handle creating a new opportunity from transcript analysis
  */
 // eslint-disable-next-line @typescript-eslint/no-unused-vars
 async function handleCreateOpportunityFromTranscript(
  message: string,
  context: ChatContext,
  _intent: Intent
): Promise<{
  response: string;
  actions?: Array<{ label: string; action: string; description: string }>;
  metadata?: Record<string, unknown>;
}> {
  try {
    // Get recent transcript analysis from context
    const recentTranscriptMessage = context.recentMessages?.find(msg => 
      msg.metadata?.transcriptAnalysis
    );
    
    if (!recentTranscriptMessage) {
      return {
        response: "I couldn't find recent transcript analysis results. Please upload and analyze a transcript first.",
        actions: [
          {
            label: 'Upload Transcript',
            action: 'upload_document',
            description: 'Upload a new transcript for analysis'
          }
        ]
      };
    }
    
    const transcriptAnalysis = recentTranscriptMessage.metadata?.transcriptAnalysis;
    const opportunityMatches = recentTranscriptMessage.metadata?.opportunityMatches;
    
    if (!transcriptAnalysis) {
      return {
        response: "I couldn't find transcript analysis data. Please analyze a transcript first.",
        actions: []
      };
    }
    
    // Extract key information for opportunity creation
    const recommendation = opportunityMatches?.newOpportunityRecommendation;
    const summary = transcriptAnalysis.summary;
    const businessContext = transcriptAnalysis.businessContext;
    
    const opportunityTitle = recommendation?.title || 
      `New Opportunity - ${businessContext.projectType || 'Business Opportunity'}`;
    
    const opportunityDescription = recommendation?.description || 
      `Opportunity identified from transcript analysis:\n\n${summary.substring(0, 500)}...`;
    
    let response = `**💡 Creating New Opportunity from Transcript Analysis**\n\n`;
    response += `**Proposed Title:** ${opportunityTitle}\n\n`;
    response += `**Description:**\n${opportunityDescription}\n\n`;
    response += `**Business Context:**\n`;
    response += `- Project Type: ${businessContext.projectType || 'Not specified'}\n`;
    response += `- Budget: ${businessContext.budget || 'Not specified'}\n`;
    response += `- Timeline: ${businessContext.timeline || 'Not specified'}\n\n`;
    
    if (businessContext.requirements.length > 0) {
      response += `**Key Requirements:**\n`;
      businessContext.requirements.forEach((req: string) => {
        response += `- ${req}\n`;
      });
      response += '\n';
    }
    
    response += `**Ready to create this opportunity?** This will add it to your opportunities list with the details above.`;
    
    const actions = [
      {
        label: 'Create Opportunity',
        action: 'confirm_create_opportunity',
        description: 'Create the opportunity with the suggested details'
      },
      {
        label: 'Customize Details',
        action: 'customize_opportunity',
        description: 'Edit the opportunity details before creating'
      },
      {
        label: 'Cancel',
        action: 'general_chat',
        description: 'Cancel opportunity creation'
      }
    ];
    
    return {
      response,
      actions,
      metadata: {
        proposedOpportunity: {
          title: opportunityTitle,
          description: opportunityDescription,
          businessContext,
          transcriptAnalysis
        }
      }
    };
  } catch (error) {
    console.error('Error creating opportunity from transcript:', error);
    return {
      response: "I encountered an error creating the opportunity. Please try again.",
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

 /**
  * Handle adding transcript insights to an existing opportunity
  */
 // eslint-disable-next-line @typescript-eslint/no-unused-vars
 async function handleAddTranscriptToOpportunity(
  message: string,
  context: ChatContext,
  _intent: Intent
): Promise<{
  response: string;
  actions?: Array<{ label: string; action: string; description: string }>;
  metadata?: Record<string, unknown>;
}> {
  try {
    // Get recent transcript analysis from context
    const recentTranscriptMessage = context.recentMessages?.find(msg => 
      msg.metadata?.transcriptAnalysis
    );
    
    if (!recentTranscriptMessage) {
      return {
        response: "I couldn't find recent transcript analysis results. Please upload and analyze a transcript first.",
        actions: [
          {
            label: 'Upload Transcript',
            action: 'upload_document',
            description: 'Upload a new transcript for analysis'
          }
        ]
      };
    }
    
    const transcriptAnalysis = recentTranscriptMessage.metadata?.transcriptAnalysis;
    const opportunityMatches = recentTranscriptMessage.metadata?.opportunityMatches;
    
    if (!transcriptAnalysis) {
      return {
        response: "I couldn't find transcript analysis data. Please analyze a transcript first.",
        actions: []
      };
    }
    
    // If we have matches, suggest the top match
    const topMatch = opportunityMatches?.matches?.[0];
    
    let response = `**📝 Add Transcript Insights to Opportunity**\n\n`;
    
    if (topMatch) {
      response += `**Suggested Opportunity:** ${topMatch.opportunityId} (${topMatch.relevanceScore}% match)\n`;
      response += `**Match Reasoning:** ${topMatch.reasoning}\n\n`;
    }
    
    response += `**Transcript Insights to Add:**\n\n`;
    response += `**Summary:** ${transcriptAnalysis.summary.substring(0, 300)}...\n\n`;
    
    if (transcriptAnalysis.actionItems.length > 0) {
      response += `**Action Items:**\n`;
      transcriptAnalysis.actionItems.forEach((item: string) => {
        response += `- ${item}\n`;
      });
      response += '\n';
    }
    
    if (transcriptAnalysis.businessContext.requirements.length > 0) {
      response += `**Requirements:**\n`;
      transcriptAnalysis.businessContext.requirements.forEach((req: string) => {
        response += `- ${req}\n`;
      });
      response += '\n';
    }
    
    const actions = [];
    
    if (topMatch) {
      actions.push({
        label: `Add to ${topMatch.opportunityId}`,
        action: 'confirm_add_to_opportunity',
        description: `Add insights to the top matching opportunity`
      });
    }
    
    actions.push(
      {
        label: 'Choose Different Opportunity',
        action: 'search_opportunities',
        description: 'Select from transcript-matched opportunities'
      },
      {
        label: 'Cancel',
        action: 'general_chat',
        description: 'Cancel adding insights'
      }
    );
    
    return {
      response,
      actions,
      metadata: {
        transcriptInsights: {
          summary: transcriptAnalysis.summary,
          actionItems: transcriptAnalysis.actionItems,
          requirements: transcriptAnalysis.businessContext.requirements,
          participants: transcriptAnalysis.participants
        },
        suggestedOpportunity: topMatch
      }
    };
  } catch (error) {
    console.error('Error adding transcript to opportunity:', error);
    return {
      response: "I encountered an error preparing to add transcript insights. Please try again.",
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

 /**
  * Handle generating a summary document from transcript
  */
 // eslint-disable-next-line @typescript-eslint/no-unused-vars
 async function handleGenerateTranscriptSummary(
  message: string,
  context: ChatContext,
  _intent: Intent
): Promise<{
  response: string;
  actions?: Array<{ label: string; action: string; description: string }>;
  metadata?: Record<string, unknown>;
}> {
  try {
    // Get recent transcript analysis from context
    const recentTranscriptMessage = context.recentMessages?.find(msg => 
      msg.metadata?.transcriptAnalysis
    );
    
    if (!recentTranscriptMessage) {
      return {
        response: "I couldn't find recent transcript analysis results. Please upload and analyze a transcript first.",
        actions: [
          {
            label: 'Upload Transcript',
            action: 'upload_document',
            description: 'Upload a new transcript for analysis'
          }
        ]
      };
    }
    
    const transcriptAnalysis = recentTranscriptMessage.metadata?.transcriptAnalysis;
    const filename = recentTranscriptMessage.metadata?.extractedData?.filename || 'transcript';
    
    if (!transcriptAnalysis) {
      return {
        response: "I couldn't find transcript analysis data. Please analyze a transcript first.",
        actions: []
      };
    }
    
    // Generate formatted summary document
    let summaryDocument = `# Transcript Summary: ${filename}\n\n`;
    summaryDocument += `**Date:** ${new Date().toLocaleDateString()}\n`;
    summaryDocument += `**Analysis Confidence:** ${(transcriptAnalysis.confidence * 100).toFixed(1)}%\n\n`;
    
    summaryDocument += `## Executive Summary\n\n${transcriptAnalysis.summary}\n\n`;
    
    if (transcriptAnalysis.keyTopics.length > 0) {
      summaryDocument += `## Key Topics\n\n`;
      transcriptAnalysis.keyTopics.forEach((topic: string) => {
        summaryDocument += `- ${topic}\n`;
      });
      summaryDocument += '\n';
    }
    
    if (transcriptAnalysis.participants.length > 0) {
      summaryDocument += `## Participants\n\n`;
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
       transcriptAnalysis.participants.forEach((participant: any) => {
        summaryDocument += `**${participant.identifier}**`;
        if (participant.role) {
          summaryDocument += ` - ${participant.role}`;
        }
        summaryDocument += '\n';
        if (participant.keyPoints && participant.keyPoints.length > 0) {
          participant.keyPoints.forEach((point: string) => {
            summaryDocument += `  - ${point}\n`;
          });
        }
        summaryDocument += '\n';
      });
    }
    
    if (transcriptAnalysis.businessContext.requirements.length > 0) {
      summaryDocument += `## Requirements & Objectives\n\n`;
      transcriptAnalysis.businessContext.requirements.forEach((req: string) => {
        summaryDocument += `- ${req}\n`;
      });
      summaryDocument += '\n';
    }
    
    if (transcriptAnalysis.actionItems.length > 0) {
      summaryDocument += `## Action Items\n\n`;
      transcriptAnalysis.actionItems.forEach((item: string) => {
        summaryDocument += `- [ ] ${item}\n`;
      });
      summaryDocument += '\n';
    }
    
    const businessContext = transcriptAnalysis.businessContext;
    if (businessContext.projectType || businessContext.budget || businessContext.timeline) {
      summaryDocument += `## Business Context\n\n`;
      if (businessContext.projectType) {
        summaryDocument += `**Project Type:** ${businessContext.projectType}\n`;
      }
      if (businessContext.budget) {
        summaryDocument += `**Budget:** ${businessContext.budget}\n`;
      }
      if (businessContext.timeline) {
        summaryDocument += `**Timeline:** ${businessContext.timeline}\n`;
      }
      summaryDocument += '\n';
    }
    
    if (transcriptAnalysis.recommendedActions.length > 0) {
      summaryDocument += `## Recommended Next Steps\n\n`;
      transcriptAnalysis.recommendedActions.forEach((action: string) => {
        summaryDocument += `- ${action}\n`;
      });
      summaryDocument += '\n';
    }
    
    summaryDocument += `---\n*Generated by ProposalHub AI on ${new Date().toISOString()}*`;
    
    let response = `**📄 Generated Transcript Summary Document**\n\n`;
    response += `I've created a formatted summary document with all the key insights from the transcript analysis:\n\n`;
    response += `${summaryDocument.substring(0, 500)}...\n\n`;
    response += `The complete document is ${summaryDocument.length} characters and includes all participants, action items, requirements, and recommendations.`;
    
    const actions = [
      {
        label: 'Download Summary',
        action: 'download_summary',
        description: 'Download the summary as a Markdown file'
      },
      {
        label: 'Add to Knowledge Base',
        action: 'save_to_knowledge',
        description: 'Save the summary to your knowledge base'
      },
      {
        label: 'Email Summary',
        action: 'email_summary',
        description: 'Send the summary to participants'
      }
    ];
    
    return {
      response,
      actions,
      metadata: {
        summaryDocument,
        filename: `transcript-summary-${filename}-${Date.now()}.md`,
        documentLength: summaryDocument.length
      }
    };
  } catch (error) {
    console.error('Error generating transcript summary:', error);
    return {
      response: "I encountered an error generating the transcript summary. Please try again.",
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * Handle opportunity selection from filtered opportunities
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleSelectOpportunity(
  message: string,
  context: ChatContext,
  _intent: Intent
): Promise<{
  response: string;
  actions?: Array<{ label: string; action: string; description: string }>;
  metadata?: Record<string, unknown>;
}> {
  try {
    // Get recent transcript analysis from context to use filtered opportunities
    const recentTranscriptMessage = context.recentMessages?.find(msg => 
      msg.metadata?.transcriptAnalysis && msg.metadata?.opportunityMatches
    );
    
    if (!recentTranscriptMessage) {
      // If no transcript context, fall back to general opportunity search
      return await handleOpportunitySearch(message, context, { 
        action: 'search_opportunities',
        confidence: 0.8,
        parameters: { query: message },
        needsFollowUp: false,
        toolsRequired: []
      });
    }
    
    const opportunityMatches = recentTranscriptMessage.metadata?.opportunityMatches;
    const matches = opportunityMatches?.matches || [];
    
    if (matches.length === 0) {
      return {
        response: "No matching opportunities were found from the transcript analysis. Let me show you all available opportunities instead.",
        actions: [
          {
            label: 'View All Opportunities',
            action: 'search_opportunities',
            description: 'See all available opportunities'
          },
          {
            label: 'Create New Opportunity',
            action: 'create_opportunity_from_transcript',
            description: 'Create a new opportunity based on transcript insights'
          }
        ]
      };
    }
    
    // Import database functions to get full opportunity details
    const { getOpportunityById } = await import('../database');
    
    let response = `**🎯 Select an Opportunity (from Transcript Matches):**\n\n`;
    response += `Based on the transcript analysis, here are the ${matches.length} most relevant opportunities:\n\n`;
    
    const actions = [];
    const opportunityDetails = [];
    
    // Get full details for each matched opportunity
    for (let i = 0; i < Math.min(matches.length, 10); i++) {
      const match = matches[i];
      try {
        const opportunity = await getOpportunityById(match.opportunityId);
        if (opportunity) {
          const opp = opportunity as Record<string, unknown>;
          const title = opp.title as string || 'Untitled Opportunity';
          const estimatedValue = opp.estimatedValue as number || 0;
          const status = opp.status as string || 'unknown';
          
          response += `**${i + 1}. ${title}** (${match.relevanceScore}% match)\n`;
          response += `   Status: ${status}`;
          if (estimatedValue > 0) {
            response += ` | Value: $${estimatedValue.toLocaleString()}`;
          }
          response += `\n   Match Reason: ${match.reasoning}\n\n`;
          
          // Add action button for this specific opportunity
          actions.push({
            label: `Select ${title}`,
            action: 'confirm_add_to_opportunity',
            description: `Add transcript insights to ${title} (${match.relevanceScore}% match)`
          });
          
          opportunityDetails.push({
            id: match.opportunityId,
            title,
            status,
            estimatedValue,
            relevanceScore: match.relevanceScore,
            reasoning: match.reasoning
          });
        }
      } catch (error) {
        console.warn(`Failed to get details for opportunity ${match.opportunityId}:`, error);
        // Still show the match with basic info
        response += `**${i + 1}. ${match.opportunityId}** (${match.relevanceScore}% match)\n`;
        response += `   Match Reason: ${match.reasoning}\n\n`;
        
        actions.push({
          label: `Select ${match.opportunityId}`,
          action: 'confirm_add_to_opportunity',
          description: `Add transcript insights to ${match.opportunityId} (${match.relevanceScore}% match)`
        });
      }
    }
    
    // Add general actions
    actions.push(
      {
        label: 'View All Opportunities',
        action: 'search_opportunities',
        description: 'See all opportunities (not just matches)'
      },
      {
        label: 'Create New Opportunity',
        action: 'create_opportunity_from_transcript',
        description: 'Create a new opportunity instead'
      },
      {
        label: 'Cancel',
        action: 'general_chat',
        description: 'Cancel opportunity selection'
      }
    );
    
    return {
      response,
      actions,
      metadata: {
        filteredOpportunities: opportunityDetails,
        totalMatches: matches.length,
        isFromTranscriptAnalysis: true
      }
    };
  } catch (error) {
    console.error('Error in opportunity selection:', error);
    return {
      response: "I encountered an error showing the opportunity options. Please try again.",
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
} 
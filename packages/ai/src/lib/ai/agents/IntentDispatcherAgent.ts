import { BaseAgent } from './BaseAgent';
import { AgentInput, AgentOutput, ValidationResult } from './BaseAgent';
import { z } from 'zod';
import { zodTextFormat } from 'openai/helpers/zod';
import { MODELS } from '../models';

// Input schema for intent analysis
const IntentAnalysisSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  context: z.object({
    entityType: z.enum(['opportunity', 'proposal']),
    entityId: z.string(),
    tabContext: z.string().nullable().optional(),
    tabLabel: z.string().nullable().optional(),
    currentContent: z.array(z.string()).nullable().optional(),
    userRole: z.string().nullable().optional(),
    recentMessages: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
      timestamp: z.date().nullable().optional(),
      metadata: z.object({
        uploadedFiles: z.array(z.object({
          originalName: z.string(),
          fileId: z.string(),
          fileType: z.string()
        })).nullable().optional()
      }).nullable().optional()
    })).nullable().optional()
  })
});

// Output schema for intent analysis
const IntentSchema = z.object({
  action: z.enum(['search_knowledge', 'search_contacts', 'search_organizations', 'search_opportunities', 'web_search', 'analyze_document', 'general_chat', 'help', 'improve_content', 'list_files']),
  confidence: z.number().min(0).max(1),
  parameters: z.object({
    url: z.string().nullable(),
    query: z.string().nullable(),
    fileId: z.string().nullable(),
    filename: z.string().nullable(),
    section: z.string().nullable()
  }).nullable(),
  needsFollowUp: z.boolean(),
  toolsRequired: z.array(z.string())
});

// Type definitions
export type ChatContext = z.infer<typeof IntentAnalysisSchema>['context'];
export type Intent = z.infer<typeof IntentSchema>;
export type ChatActionResponse = {
  response: string;
  actions?: Array<{
    label: string;
    action: string;
    description: string;
  }>;
  metadata?: Record<string, unknown>;
};

export class IntentDispatcherAgent extends BaseAgent {
  constructor() {
    super('intent_dispatcher', {
      enabled: true,
      maxRetries: 3,
      timeoutMs: 30000,
      enableLogging: true,
      enableDebugLogging: true,
      logPrefix: 'INTENT_DISPATCHER',
      capabilities: [
        {
          name: 'intent_analysis',
          description: 'Analyzes user message intent and determines appropriate actions',
          inputTypes: ['message', 'context'],
          outputTypes: ['intent']
        },
        {
          name: 'chat_action_dispatch',
          description: 'Dispatches to appropriate chat handler based on intent',
          inputTypes: ['intent', 'message', 'context'],
          outputTypes: ['response', 'actions', 'metadata']
        }
      ]
    });
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const executionId = `${this.agentType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.log(`Starting intent dispatch execution: ${executionId}`);

    try {
      const validationResult = this.validate(input);
      if (!validationResult.isValid) {
        return this.createErrorOutput(
          new Error(`Validation failed: ${validationResult.errors.join(', ')}`),
          input.data
        );
      }

      const { action, ...params } = input.data;

      switch (action) {
        case 'analyzeIntent':
          return await this.analyzeIntent(params as { message: string; context: ChatContext });
        
        case 'dispatchChatAction':
          return await this.dispatchChatAction(params as { intent: Intent; message: string; context: ChatContext });
        
        default:
          return this.createErrorOutput(
            new Error(`Unknown action: ${action}`),
            input.data
          );
      }
    } catch (error) {
      this.log(`Intent dispatch failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return this.createErrorOutput(
        error instanceof Error ? error : new Error('Unknown error'),
        input.data
      );
    }
  }

  validate(input: AgentInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!input.data?.action) {
      errors.push('Action is required');
    }

    if (input.data?.action === 'analyzeIntent') {
      try {
        IntentAnalysisSchema.parse({
          message: input.data.message,
          context: input.data.context
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push(...error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async analyzeIntent(params: { message: string; context: ChatContext }): Promise<AgentOutput> {
    const { message, context } = params;

    try {
      this.log(`Analyzing intent for message: "${message.substring(0, 100)}..."`);

      // Get recent files and remove duplicates
      const recentFiles = context.recentMessages?.filter(msg => msg.role === 'assistant' && msg.metadata?.uploadedFiles)
        .map(msg => msg.metadata?.uploadedFiles).flat() || [];
      const uniqueRecentFiles = recentFiles.filter((file, index, self) =>
        index === self.findIndex((t) => t?.fileId === file?.fileId)
      );

      const systemPrompt = `You are an AI assistant for a proposal and opportunity management system. Analyze the user's message to determine their intent.`;

      let instructions = `Available actions:
- search_knowledge: Search uploaded documents and knowledge base for this ${context.entityType}. If the user is asking about a specific document, try to find the fileId or filename in the user message or conversation history.
- search_contacts: Search for people or contact information  
- search_organizations: Search for organizations/companies and their related opportunities, proposals, and business relationships. Use when user asks about companies, organizations, or business entities.
- search_opportunities: Search for business opportunities by various criteria such as deal value, recent activity, team members, keywords, or status. Use when user asks about opportunities, deals, proposals, or business development activities.
- web_search: Search the web for external information. If the user provides a URL, start there.
- analyze_document: Analyze or extract information from documents. If the user provides a fileId or filename, use it to find the document.
- general_chat: General conversation or questions about the system
- help: User needs help or guidance
- improve_content: User wants to improve existing content or sections. Provide the section title in the parameters.
- list_files: User wants to list files or documents without searching content. Use when user asks "what files", "what documents", "list files", etc.

Context: This is a ${context.entityType} (ID: ${context.entityId}) in the "${context.tabLabel || context.tabContext || 'content'}" tab.
`;

      if (context.currentContent && context.currentContent.length > 0) {
        instructions += `Current content includes: ${context.currentContent?.join(', ') || 'No current content'}`;
      }

      instructions += `
Consider the recent conversation when determining intent. For example:
- If user mentions "the document" or "this file" and there's a recent document upload, use search_knowledge
- If user asks "what documents do you have" or "list files", use list_files to show available files
- If user asks about content IN documents, use search_knowledge to search content
- Look for references to previous context in the conversation
`;

      if (uniqueRecentFiles.length > 0) {
        instructions += `
Recent file uploads from conversation history:
${uniqueRecentFiles.map(file => `- File: ${file?.originalName} (ID: ${file?.fileId}, Type: ${file?.fileType})`).join('\n')}

When user refers to "the document", "this file", "the uploaded file" etc., try to identify the specific file from the conversation history.
`;
      }

      instructions += `
Analyze the message and determine:
1. Primary action needed
2. Confidence level (0-1)
3. Parameters for the action
4. Whether follow-up questions are needed
5. What tools are required`;

      const userPrompt = `${instructions}

User message: "${message}"

Analyze this message and determine the user's intent.`;

      // Create conversation history
      const history = context.recentMessages?.filter(msg => msg.role && msg.content)
        .map(msg => ({ role: msg.role, content: msg.content })) || [];

      const response = await this.client.responses.parse({
        model: MODELS.fast,
        input: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: userPrompt }
        ],
        text: { format: zodTextFormat(IntentSchema, 'intent') }
      });

      const intent = response.output_parsed as Intent;
      if (!intent) {
        throw new Error('No intent returned from AI');
      }

      this.log(`Intent analyzed: ${intent.action} (confidence: ${intent.confidence})`);

      return this.createSuccessOutput(
        { intent },
        undefined,
        { executionTime: Date.now() - Date.now() }
      );

    } catch (error) {
      this.log(`Intent analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      
      // Fallback to general chat
      const fallbackIntent: Intent = {
        action: 'general_chat',
        confidence: 0.5,
        parameters: { 
          query: message,
          url: null,
          fileId: null,
          filename: null,
          section: null
        },
        needsFollowUp: false,
        toolsRequired: []
      };

      return this.createSuccessOutput(
        { intent: fallbackIntent },
        undefined,
        { executionTime: Date.now() - Date.now(), fallback: true }
      );
    }
  }

  private async dispatchChatAction(params: { intent: Intent; message: string; context: ChatContext }): Promise<AgentOutput> {
    const { intent, message, context } = params;

    try {
      this.log(`Dispatching chat action: ${intent.action}`);

      // Import the handler functions dynamically to avoid circular dependencies
      const chatDispatcher = await import('../chatDispatcher');

      // For now, use the existing dispatchChatAction function
      // This is a temporary solution until we fully extract the handlers
      const response = await chatDispatcher.dispatchChatAction(intent, message, context);

      this.log(`Chat action dispatched successfully: ${intent.action}`);

      return this.createSuccessOutput(
        { response: response.response, actions: response.actions, metadata: response.metadata },
        undefined,
        { executionTime: Date.now() - Date.now() }
      );

    } catch (error) {
      this.log(`Chat action dispatch failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      
      return this.createSuccessOutput(
        { 
          response: "I encountered an error processing your request. Please try again or rephrase your question.",
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
        },
        undefined,
        { executionTime: Date.now() - Date.now(), error: true }
      );
    }
  }
}

// Factory function for easy instantiation
export function createIntentDispatcherAgent(): IntentDispatcherAgent {
  return new IntentDispatcherAgent();
}

// Backward compatibility exports
export { IntentDispatcherAgent as IntentDispatcher }; 
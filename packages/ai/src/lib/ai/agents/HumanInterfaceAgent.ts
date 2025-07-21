/**
 * Human Interface Agent
 * 
 * Consolidates analyzeIntent and dispatchChatAction functions with dynamic UI generation capabilities.
 * Handles all human-computer interaction patterns in the ProposalHub system.
 */

import { z } from 'zod';
import { MODELS } from '../models';
import { 
  BaseAgent, 
  AgentInput, 
  AgentOutput, 
  ValidationResult, 
  AgentCapability,
  WorkflowContext,
  HumanInteractionRequest 
} from './BaseAgent';
import { dispatchChatAction, ChatContext, Intent } from '../chatDispatcher';

// Intent Analysis Schema
const IntentAnalysisSchema = z.object({
  intent: z.enum([
    'create_proposal',
    'analyze_document',
    'search_opportunities',
    'extract_contacts',
    'generate_content',
    'review_proposal',
    'upload_document',
    'ask_question',
    'get_help',
    'other'
  ]),
  confidence: z.number().min(0).max(1),
  entities: z.array(z.object({
    type: z.string(),
    value: z.string(),
    confidence: z.number().min(0).max(1)
  })),
  context: z.object({
    workflowStage: z.string().nullable().optional(),
    documentType: z.string().nullable().optional(),
    organizationId: z.string().nullable().optional(),
    proposalId: z.string().nullable().optional()
  }),
  suggestedActions: z.array(z.object({
    action: z.string(),
    description: z.string(),
    priority: z.number().min(1).max(5)
  })),
  requiresHumanDecision: z.boolean()
});

// Chat Action Schema
const ChatActionSchema = z.object({
  actionType: z.enum([
    'direct_response',
    'workflow_initiation',
    'data_request',
    'clarification_needed',
    'escalation_required',
    'ui_update'
  ]),
  response: z.string(),
  nextSteps: z.array(z.object({
    step: z.string(),
    description: z.string(),
    required: z.boolean()
  })),
  uiComponents: z.array(z.object({
    type: z.string(),
    props: z.record(z.unknown()),
    placement: z.string()
  })).optional(),
  metadata: z.record(z.unknown()).optional()
});

// UI Generation Schema
const UIGenerationSchema = z.object({
  components: z.array(z.object({
    type: z.enum([
      'form',
      'button',
      'modal',
      'card',
      'list',
      'table',
      'upload',
      'progress',
      'notification'
    ]),
    id: z.string(),
    props: z.record(z.unknown()),
    children: z.array(z.unknown()).optional(),
    events: z.record(z.string()).optional()
  })),
  layout: z.object({
    type: z.string(),
    configuration: z.record(z.unknown())
  }),
  state: z.record(z.unknown()).optional(),
  validation: z.record(z.unknown()).optional()
});

interface HumanInterfaceInput {
  type: 'analyze_intent' | 'dispatch_action' | 'generate_ui' | 'handle_interaction';
  userInput?: string;
  chatHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  currentContext?: {
    page?: string;
    workflow?: string;
    activeDocument?: string;
    userRole?: string;
    intent?: string;
  };
  interactionRequest?: HumanInteractionRequest;
  uiSpecification?: {
    purpose: string;
    components: string[];
    constraints: string[];
  };
}

export class HumanInterfaceAgent extends BaseAgent {
  constructor() {
    const capabilities: AgentCapability[] = [
      {
        name: 'intent_analysis',
        description: 'Analyze user intent from natural language input',
        inputTypes: ['text/plain', 'application/json'],
        outputTypes: ['intent_analysis'],
        requirements: ['userInput'],
      },
      {
        name: 'chat_action_dispatch',
        description: 'Dispatch appropriate actions based on chat interactions',
        inputTypes: ['application/json'],
        outputTypes: ['chat_action'],
        requirements: ['userInput', 'chatHistory'],
      },
      {
        name: 'ui_generation',
        description: 'Generate dynamic UI components based on context',
        inputTypes: ['application/json'],
        outputTypes: ['ui_specification'],
        requirements: ['uiSpecification'],
      },
      {
        name: 'human_interaction_handling',
        description: 'Handle human-in-the-loop interactions',
        inputTypes: ['application/json'],
        outputTypes: ['interaction_response'],
        requirements: ['interactionRequest'],
      },
    ];

    super('human_interface', {
      enabled: true,
      maxRetries: 3,
      timeoutMs: 30000,
      enableLogging: true,
      enableDebugLogging: true,
      logPrefix: 'HUMAN_INTERFACE',
      capabilities,
    });
  }

  validate(input: AgentInput): ValidationResult {
    const data = input.data as unknown as HumanInterfaceInput;
    
    if (!data.type) {
      return {
        isValid: false,
        errors: ['Operation type is required'],
        warnings: [],
      };
    }

    switch (data.type) {
      case 'analyze_intent':
        if (!data.userInput) {
          return {
            isValid: false,
            errors: ['userInput is required for intent analysis'],
            warnings: [],
          };
        }
        break;
      
      case 'dispatch_action':
        if (!data.userInput || !data.chatHistory) {
          return {
            isValid: false,
            errors: ['userInput and chatHistory are required for action dispatch'],
            warnings: [],
          };
        }
        break;
      
      case 'generate_ui':
        if (!data.uiSpecification) {
          return {
            isValid: false,
            errors: ['uiSpecification is required for UI generation'],
            warnings: [],
          };
        }
        break;
      
      case 'handle_interaction':
        if (!data.interactionRequest) {
          return {
            isValid: false,
            errors: ['interactionRequest is required for interaction handling'],
            warnings: [],
          };
        }
        break;
    }

    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const data = input.data as unknown as HumanInterfaceInput;
    
    try {
      this.log(`Executing ${data.type} operation`);
      
      switch (data.type) {
        case 'analyze_intent':
          return await this.analyzeIntent(data, input.context);
        
        case 'dispatch_action':
          return await this.dispatchChatAction(data, input.context);
        
        case 'generate_ui':
          return await this.generateUI(data, input.context);
        
        case 'handle_interaction':
          return await this.handleHumanInteraction(data, input.context);
        
        default:
          throw new Error(`Unknown operation type: ${data.type}`);
      }
    } catch (error) {
      this.log(`Error in ${data.type}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return this.createErrorOutput(
        error instanceof Error ? error : new Error('Unknown error occurred'),
        { operationType: data.type }
      );
    }
  }

  private async analyzeIntent(
    data: HumanInterfaceInput,
    context?: WorkflowContext
  ): Promise<AgentOutput> {
    const systemPrompt = `You are an expert intent analyzer for ProposalHub, a proposal management system.
    
    Analyze the user's input and determine:
    1. Their primary intent
    2. Confidence level (0-1)
    3. Entities mentioned (organizations, documents, people, etc.)
    4. Context clues about workflow stage
    5. Suggested actions to take
    6. Whether human decision is required
    
    Consider the current context: ${JSON.stringify(data.currentContext || {})}
    Previous workflow context: ${JSON.stringify(context?.sharedData || {})}`;

    const userPrompt = `User input: "${data.userInput}"
    
    Chat history context:
    ${data.chatHistory?.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n') || 'No previous context'}`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt }
    ];

    const result = await this.callAI(
      MODELS.fast,
      messages,
      IntentAnalysisSchema,
      'analyzeIntent',
      'intent_analysis'
    );

    this.log(`Intent analyzed: ${result.intent} (confidence: ${result.confidence})`);

    return {
      success: true,
      data: {
        intentAnalysis: result,
        suggestedWorkflow: this.suggestWorkflow(result),
        requiresHumanDecision: result.requiresHumanDecision,
      },
    };
  }

  private async dispatchChatAction(
    data: HumanInterfaceInput,
    _context?: WorkflowContext
  ): Promise<AgentOutput> {
    // Check if this is a search_opportunities intent that should be handled directly
    if (data.currentContext?.intent === 'search_opportunities') {
      this.log('Handling search_opportunities intent directly via chatDispatcher');
      
      try {
        // Create ChatContext for the dispatcher
        const chatContext: ChatContext = {
          entityType: data.currentContext.page?.split('/')[0] as 'opportunity' | 'proposal' || 'opportunity',
          entityId: data.currentContext.page?.split('/')[1] || '',
          tabContext: data.currentContext.workflow,
          userRole: data.currentContext.userRole,
          // Convert chat history format if needed
          recentMessages: data.chatHistory?.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          }))
        };

        // Create intent object for opportunity search
        const intent: Intent = {
          action: 'search_opportunities',
          confidence: 0.9,
          needsFollowUp: false,
          toolsRequired: []
        };

        // Call the chatDispatcher directly
        const result = await dispatchChatAction(intent, data.userInput || '', chatContext);

        return {
          success: true,
          data: {
            chatAction: {
              actionType: 'direct_response',
              response: result.response,
              confidence: 0.9,
              nextSteps: [],
              uiComponents: [],
              metadata: result.metadata
            },
            actions: result.actions,
            metadata: result.metadata
          }
        };
      } catch (error) {
        this.log(`Error in direct opportunity search: ${error}`, 'error');
        // Fall back to normal AI processing
      }
    }

    const systemPrompt = `You are a chat action dispatcher for ProposalHub.
    
    Based on the user's input and conversation history, determine:
    1. The appropriate action type to take
    2. Response to provide to the user
    3. Next steps for the workflow
    4. UI components that should be updated/shown
    
    Available actions:
    - direct_response: Provide information directly
    - workflow_initiation: Start a new workflow
    - data_request: Request additional information
    - clarification_needed: Ask for clarification
    - escalation_required: Escalate to human
    - ui_update: Update the user interface
    
    Current context: ${JSON.stringify(data.currentContext || {})}`;

    const userPrompt = `User input: "${data.userInput}"
    
    Recent conversation:
    ${data.chatHistory?.slice(-10).map(msg => `${msg.role}: ${msg.content}`).join('\n') || 'No conversation history'}`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt }
    ];

    const result = await this.callAI(
      MODELS.fast,
      messages,
      ChatActionSchema,
      'dispatchChatAction',
      'chat_action'
    );

    this.log(`Chat action dispatched: ${result.actionType}`);

    return {
      success: true,
      data: {
        chatAction: result,
        nextSteps: result.nextSteps,
        uiUpdates: result.uiComponents,
      },
    };
  }

  private async generateUI(
    data: HumanInterfaceInput,
    _context?: WorkflowContext
  ): Promise<AgentOutput> {
    const systemPrompt = `You are a UI generator for ProposalHub.
    
    Generate appropriate React components based on the specification:
    - Purpose: ${data.uiSpecification?.purpose}
    - Required components: ${data.uiSpecification?.components?.join(', ')}
    - Constraints: ${data.uiSpecification?.constraints?.join(', ')}
    
    Generate clean, accessible React components with:
    - Proper TypeScript typing
    - Tailwind CSS styling
    - Form validation where needed
    - Event handlers for user interactions
    
    Current context: ${JSON.stringify(data.currentContext || {})}`;

    const userPrompt = `Generate UI components for: ${data.uiSpecification?.purpose}
    
    Components needed: ${data.uiSpecification?.components?.join(', ')}
    Constraints: ${data.uiSpecification?.constraints?.join(', ')}`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt }
    ];

    const result = await this.callAI(
      MODELS.default,
      messages,
      UIGenerationSchema,
      'generateUI',
      'ui_generation'
    );

    this.log(`UI generated with ${result.components.length} components`);

    return {
      success: true,
      data: {
        uiSpecification: result,
        componentCode: this.generateComponentCode(result),
      },
    };
  }

  private async handleHumanInteraction(
    data: HumanInterfaceInput,
    context?: WorkflowContext
  ): Promise<AgentOutput> {
    const interaction = data.interactionRequest!;
    
    this.log(`Handling human interaction: ${interaction.type}`);

    // Format the interaction for presentation
    const formattedInteraction = {
      type: interaction.type,
      prompt: interaction.prompt,
      options: interaction.options,
      data: interaction.data,
      timeout: interaction.timeout,
      required: interaction.required,
      context: context?.sharedData,
    };

    // Generate appropriate UI for the interaction
    const uiSpec = await this.generateInteractionUI(interaction);

    return {
      success: true,
      data: {
        interaction: formattedInteraction,
        uiSpecification: uiSpec,
        requiresUserInput: true,
      },
      humanInteraction: interaction,
    };
  }

  private suggestWorkflow(intentAnalysis: any): string {
    const { intent, entities, context } = intentAnalysis;
    
    switch (intent) {
      case 'create_proposal':
        return 'proposal_creation_workflow';
      case 'analyze_document':
        return 'document_analysis_workflow';
      case 'search_opportunities':
        return 'opportunity_search_workflow';
      case 'extract_contacts':
        return 'contact_extraction_workflow';
      case 'generate_content':
        return 'content_generation_workflow';
      case 'review_proposal':
        return 'proposal_review_workflow';
      case 'upload_document':
        return 'document_upload_workflow';
      default:
        return 'general_assistance_workflow';
    }
  }

  private generateComponentCode(uiSpec: any): string {
    // Generate actual React component code based on the UI specification
    return `// Generated UI Components
import React from 'react';

${uiSpec.components.map((component: any) => {
  return `export const ${component.id} = (props: any) => {
  return (
    <div className="component-${component.type}">
      {/* Component implementation */}
    </div>
  );
};`;
}).join('\n\n')}`;
  }

  private async generateInteractionUI(interaction: HumanInteractionRequest): Promise<any> {
    const uiType = this.getUITypeForInteraction(interaction.type);
    
    return {
      components: [
        {
          type: uiType,
          id: `interaction-${Date.now()}`,
          props: {
            prompt: interaction.prompt,
            options: interaction.options,
            required: interaction.required,
          },
        },
      ],
      layout: {
        type: 'modal',
        configuration: {
          size: 'medium',
          closable: !interaction.required,
        },
      },
    };
  }

  private getUITypeForInteraction(interactionType: string): string {
    switch (interactionType) {
      case 'decision':
        return 'button';
      case 'approval':
        return 'form';
      case 'input':
        return 'form';
      case 'review':
        return 'card';
      default:
        return 'form';
    }
  }

  // Convenience methods for common operations
  async quickIntentAnalysis(userInput: string, context?: any): Promise<any> {
    const input: AgentInput = {
      data: {
        type: 'analyze_intent',
        userInput,
        currentContext: context,
      },
    };

    const result = await this.execute(input);
    return result.success ? result.data.intentAnalysis : null;
  }

  async quickChatAction(userInput: string, chatHistory: any[], context?: any): Promise<any> {
    const input: AgentInput = {
      data: {
        type: 'dispatch_action',
        userInput,
        chatHistory,
        currentContext: context,
      },
    };

    const result = await this.execute(input);
    return result.success ? result.data.chatAction : null;
  }

  async quickUIGeneration(purpose: string, components: string[], constraints: string[] = []): Promise<any> {
    const input: AgentInput = {
      data: {
        type: 'generate_ui',
        uiSpecification: {
          purpose,
          components,
          constraints,
        },
      },
    };

    const result = await this.execute(input);
    return result.success ? result.data.uiSpecification : null;
  }
} 
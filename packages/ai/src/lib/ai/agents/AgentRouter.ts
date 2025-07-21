/**
 * Agent Router
 * 
 * Intelligent routing and orchestration system for ProposalHub agents.
 * Handles complex multi-agent workflows and decision routing.
 */

import { HumanInterfaceAgent } from './HumanInterfaceAgent';
import { IntentDispatcherAgent } from './IntentDispatcherAgent';
import { KnowledgeManagementAgent } from './KnowledgeManagementAgent';
import { DocumentAnalysisAgent } from './DocumentAnalysisAgent';
import { DocumentSourcingAgent } from './DocumentSourcingAgent';
import { BaseAgent, AgentInput, AgentOutput, WorkflowContext } from './BaseAgent';

export interface RouterContext {
  entityType: 'opportunity' | 'proposal';
  entityId: string;
  tabContext?: string;
  userRole?: string;
  sessionId: string;
  contactId: string;
}

export interface WorkflowStep {
  agentType: string;
  operation: string;
  input: Record<string, unknown>;
  dependencies?: string[];
  priority: number;
}

export interface WorkflowPlan {
  steps: WorkflowStep[];
  expectedDuration: number;
  complexity: 'simple' | 'moderate' | 'complex';
  requiresHumanApproval: boolean;
}

export interface AgentRouterConfig {
  enableLogging: boolean;
  maxConcurrentAgents: number;
  timeoutMs: number;
  enableWorkflowOptimization: boolean;
}

interface IntentAnalysis {
  intent: string;
  confidence: number;
  entities?: Array<{ type: string; value: string; confidence: number }>;
  requiresHumanDecision?: boolean;
}

export class AgentRouter {
  private agents: Map<string, BaseAgent>;
  private config: AgentRouterConfig;
  private activeWorkflows: Map<string, WorkflowPlan>;

  constructor(config: Partial<AgentRouterConfig> = {}) {
    this.config = {
      enableLogging: true,
      maxConcurrentAgents: 3,
      timeoutMs: 60000,
      enableWorkflowOptimization: true,
      ...config,
    };

    // Initialize available agents
    this.agents = new Map<string, BaseAgent>([
      ['human_interface', new HumanInterfaceAgent()],
      ['intent_dispatcher', new IntentDispatcherAgent()],
      ['knowledge_management', new KnowledgeManagementAgent()],
      ['document_analysis', new DocumentAnalysisAgent()],
      ['document_sourcing', new DocumentSourcingAgent()],
    ]);

    this.activeWorkflows = new Map();
    this.log(`AgentRouter initialized with agents: ${Array.from(this.agents.keys()).join(', ')}`);
  }

  /**
   * Route a chat message through the appropriate agents
   */
  async routeChatMessage(
    message: string,
    context: RouterContext,
    chatHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp?: Date }> = []
  ): Promise<AgentOutput> {
    const workflowId = `${context.sessionId}_${Date.now()}`;
    this.log(`Starting chat routing for workflow: ${workflowId}`);

    try {
      // Step 1: Analyze intent using HumanInterfaceAgent
      const intentResult = await this.executeAgent('human_interface', {
        data: {
          type: 'analyze_intent',
          userInput: message,
          chatHistory,
          currentContext: {
            page: `${context.entityType}/${context.entityId}`,
            workflow: context.tabContext || 'general',
            userRole: context.userRole,
          },
        },
      });

      if (!intentResult.success) {
        return this.createErrorResponse('Intent analysis failed', intentResult.error);
      }

      const intentAnalysis = intentResult.data?.intentAnalysis as IntentAnalysis;
      if (!intentAnalysis) {
        return this.createErrorResponse('No intent analysis data returned');
      }

      this.log(`Intent analyzed: ${intentAnalysis.intent} (confidence: ${intentAnalysis.confidence})`);

      // Step 2: Create workflow plan based on intent
      const workflowPlan = await this.planWorkflow(intentAnalysis, context, message);
      this.activeWorkflows.set(workflowId, workflowPlan);

      // Step 3: Execute workflow
      const result = await this.executeWorkflow(workflowId, workflowPlan, {
        message,
        context,
        intentAnalysis,
        chatHistory,
      });

      this.activeWorkflows.delete(workflowId);
      return result;

    } catch (error) {
      this.log(`Error in chat routing: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      this.activeWorkflows.delete(workflowId);
      return this.createErrorResponse('Chat routing failed', error);
    }
  }

  /**
   * Plan a workflow based on intent analysis
   */
  private async planWorkflow(
    intentAnalysis: IntentAnalysis,
    context: RouterContext,
    message: string
  ): Promise<WorkflowPlan> {
    const { intent, confidence, entities, requiresHumanDecision } = intentAnalysis;
    
    this.log(`Planning workflow for intent: ${intent}`);

    let steps: WorkflowStep[] = [];
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    let expectedDuration = 5000; // 5 seconds default

    switch (intent) {
      case 'search_opportunities':
        steps = [
          {
            agentType: 'human_interface',
            operation: 'dispatch_action',
            input: {
              type: 'dispatch_action',
              userInput: message,
              currentContext: {
                page: `${context.entityType}/${context.entityId}`,
                workflow: context.tabContext || 'general',
                userRole: context.userRole,
                intent: 'search_opportunities', // Pass the intent explicitly
              },
            },
            priority: 1,
          },
        ];
        complexity = 'simple';
        break;

      case 'extract_contacts':
        steps = [
          {
            agentType: 'knowledge_management',
            operation: 'search_knowledge',
            input: {
              type: 'search_knowledge',
              searchQuery: message,
              context: {
                entityType: context.entityType,
                entityId: context.entityId,
                intent,
                entities,
              },
            },
            priority: 1,
          },
        ];
        complexity = 'simple';
        expectedDuration = 8000;
        break;

      case 'analyze_document':
        steps = [
          {
            agentType: 'document_analysis',
            operation: 'analyze_document',
            input: {
              type: 'analyze_document',
              content: message,
              options: {
                performClassification: true,
                performSectionAnalysis: true,
                performSemanticAnalysis: true,
                extractKeywords: true,
              },
              metadata: { intent, entities, entityType: context.entityType, entityId: context.entityId },
            },
            priority: 1,
          },
        ];
        
        // If high confidence and entities found, also extract knowledge
        if (confidence > 0.8 && entities?.length && entities.length > 0) {
          steps.push({
            agentType: 'knowledge_management',
            operation: 'extract_knowledge',
            input: {
              type: 'extract_knowledge',
              content: message,
              document: { metadata: { intent, entities } },
            },
            dependencies: ['document_analysis'],
            priority: 2,
          });
          complexity = 'moderate';
          expectedDuration = 15000;
        }
        break;

      case 'generate_content':
      case 'create_proposal':
        steps = [
          {
            agentType: 'knowledge_management',
            operation: 'search_knowledge',
            input: {
              type: 'search_knowledge',
              searchQuery: message,
              context: { entityType: context.entityType, entityId: context.entityId },
            },
            priority: 1,
          },
          {
            agentType: 'human_interface',
            operation: 'dispatch_action',
            input: {
              type: 'dispatch_action',
              userInput: message,
              currentContext: {
                page: `${context.entityType}/${context.entityId}`,
                workflow: context.tabContext || 'content_generation',
                userRole: context.userRole,
              },
            },
            dependencies: ['knowledge_management'],
            priority: 2,
          },
        ];
        complexity = 'complex';
        expectedDuration = 20000;
        break;

      case 'ask_question':
      default:
        steps = [
          {
            agentType: 'human_interface',
            operation: 'dispatch_action',
            input: {
              type: 'dispatch_action',
              userInput: message,
              currentContext: {
                page: `${context.entityType}/${context.entityId}`,
                workflow: context.tabContext || 'general',
                userRole: context.userRole,
              },
            },
            priority: 1,
          },
        ];
        break;
    }

    return {
      steps,
      expectedDuration,
      complexity,
      requiresHumanApproval: requiresHumanDecision || complexity === 'complex',
    };
  }

  /**
   * Execute a planned workflow
   */
  private async executeWorkflow(
    workflowId: string,
    plan: WorkflowPlan,
    workflowData: Record<string, unknown>
  ): Promise<AgentOutput> {
    this.log(`Executing workflow ${workflowId} with ${plan.steps.length} steps`);

    const results: Map<string, AgentOutput> = new Map();
    const errors: string[] = [];

    // Sort steps by priority
    const sortedSteps = [...plan.steps].sort((a, b) => a.priority - b.priority);

    for (const step of sortedSteps) {
      try {
        // Check dependencies
        if (step.dependencies) {
          const missingDeps = step.dependencies.filter(dep => !results.has(dep));
          if (missingDeps.length > 0) {
            this.log(`Skipping step ${step.agentType}:${step.operation} - missing dependencies: ${missingDeps.join(', ')}`);
            continue;
          }
        }

        // Execute step
        this.log(`Executing step: ${step.agentType}:${step.operation}`);
        const stepResult = await this.executeAgent(step.agentType, {
          data: step.input,
          context: {
            workflowId,
            executionId: `${workflowId}_${step.agentType}_${step.operation}`,
            stepHistory: Array.from(results.keys()),
            sharedData: {
              ...workflowData,
              previousResults: Object.fromEntries(results),
            },
          } as WorkflowContext,
        });

        if (stepResult.success) {
          results.set(`${step.agentType}:${step.operation}`, stepResult);
          this.log(`Step completed successfully: ${step.agentType}:${step.operation}`);
        } else {
          errors.push(`${step.agentType}:${step.operation} failed: ${stepResult.error}`);
          this.log(`Step failed: ${step.agentType}:${step.operation} - ${stepResult.error}`, 'error');
        }

      } catch (error) {
        const errorMsg = `${step.agentType}:${step.operation} threw error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        this.log(errorMsg, 'error');
      }
    }

    // Combine results into final response
    return this.combineWorkflowResults(results, errors, plan);
  }

  /**
   * Execute a single agent operation
   */
  private async executeAgent(agentType: string, input: AgentInput): Promise<AgentOutput> {
    const agent = this.agents.get(agentType);
    if (!agent) {
      return this.createErrorResponse(`Agent not found: ${agentType}`);
    }

    try {
      const result = await Promise.race([
        agent.execute(input),
        new Promise<AgentOutput>((_, reject) =>
          setTimeout(() => reject(new Error('Agent execution timeout')), this.config.timeoutMs)
        ),
      ]);

      return result;
    } catch (error) {
      return this.createErrorResponse(
        `Agent execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Combine workflow results into a unified response
   */
  private combineWorkflowResults(
    results: Map<string, AgentOutput>,
    errors: string[],
    plan: WorkflowPlan
  ): AgentOutput {
    if (results.size === 0) {
      return this.createErrorResponse('All workflow steps failed', errors);
    }

    // Find the primary result (usually the last successful step)
    const resultArray = Array.from(results.values());
    const primaryResult = resultArray[resultArray.length - 1];

    // Collect all successful data
    const combinedData: Record<string, unknown> = {};
    const allActions: Array<{ label: string; action: string; description: string }> = [];
    const allMetadata: Record<string, unknown> = {
      workflowCompleted: true,
      stepsExecuted: results.size,
      stepsFailed: errors.length,
      complexity: plan.complexity,
      errors: errors.length > 0 ? errors : undefined,
    };

    for (const [stepKey, result] of results) {
      if (result.data) {
        combinedData[stepKey] = result.data;
      }

      // Extract actions from each result
      if (result.data?.actions && Array.isArray(result.data.actions)) {
        allActions.push(...(result.data.actions as Array<{ label: string; action: string; description: string }>));
      }

      // Merge metadata
      if (result.data?.metadata && typeof result.data.metadata === 'object') {
        Object.assign(allMetadata, result.data.metadata);
      }
    }

    // Use primary result's response or create a summary
    const response = this.generateWorkflowSummary(primaryResult, results, plan);

    return {
      success: true,
      data: {
        response,
        actions: allActions,
        workflowResults: combinedData,
        metadata: allMetadata,
      },
    };
  }

  /**
   * Generate a summary response from workflow results
   */
  private generateWorkflowSummary(
    primaryResult: AgentOutput,
    allResults: Map<string, AgentOutput>,
    plan: WorkflowPlan
  ): string {
    // Try to get response from primary result
    if (primaryResult.data?.response && typeof primaryResult.data.response === 'string') {
      return primaryResult.data.response;
    }

    const chatAction = primaryResult.data?.chatAction as Record<string, unknown> | undefined;
    if (chatAction?.response && typeof chatAction.response === 'string') {
      return chatAction.response;
    }

    // Generate summary based on workflow complexity
    switch (plan.complexity) {
      case 'simple':
        return "I've processed your request successfully.";
      case 'moderate':
        return `I've analyzed your request using ${allResults.size} specialized operations and found relevant information.`;
      case 'complex':
        return `I've completed a comprehensive analysis of your request, using multiple AI agents to provide the most accurate response possible.`;
      default:
        return "I've processed your request.";
    }
  }

  /**
   * Create standardized error response
   */
  private createErrorResponse(message: string, error?: unknown): AgentOutput {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(message),
      data: {
        response: `I encountered an error: ${message}. Please try again or rephrase your request.`,
        metadata: {
          errorType: 'router_error',
          timestamp: new Date().toISOString(),
        },
      },
    };
  }

  /**
   * Logging utility
   */
  private log(message: string, level: 'info' | 'error' = 'info'): void {
    if (this.config.enableLogging) {
      const timestamp = new Date().toISOString();
      const prefix = `[AgentRouter ${timestamp}]`;
      
      if (level === 'error') {
        console.error(prefix, message);
      } else {
        console.log(prefix, message);
      }
    }
  }

  /**
   * Get router statistics
   */
  getStats(): {
    availableAgents: string[];
    activeWorkflows: number;
    config: AgentRouterConfig;
  } {
    return {
      availableAgents: Array.from(this.agents.keys()),
      activeWorkflows: this.activeWorkflows.size,
      config: this.config,
    };
  }
} 
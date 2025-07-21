import { BaseAgent } from '../agents/BaseAgent';
import { AgentType, AgentInput, AgentOutput, WorkflowContext } from '../agents/BaseAgent';
import { 
  WorkflowDefinition, 
  WorkflowNode, 
  WorkflowEdge, 
  WorkflowState, 
  WorkflowType,
  WorkflowExecutionResult,
  WorkflowExecutionRequest
} from './interfaces';

// Additional interfaces for the workflow engine
export interface WorkflowResult {
  success: boolean;
  data: Record<string, unknown>;
  error?: Error;
  metadata: {
    workflowType: WorkflowType;
    workflowId: string;
    executionTime: number;
    completedSteps?: number;
    totalSteps?: number;
    currentStep?: string;
    failedStep?: string;
    executionResults?: Record<string, AgentOutput>;
  };
}

export interface WorkflowInput {
  data: Record<string, unknown>;
  context?: Partial<WorkflowContext>;
  metadata?: Record<string, unknown>;
}

export interface StateManager {
  initializeWorkflow(definition: WorkflowDefinition, context: WorkflowContext): Promise<WorkflowState>;
  finalizeWorkflow(workflowId: string, result: WorkflowResult): Promise<void>;
  updateWorkflowState(workflowId: string, state: WorkflowState): Promise<void>;
  getWorkflowState(workflowId: string): Promise<WorkflowState | null>;
}

export class WorkflowEngine {
  private agents: Map<AgentType, BaseAgent> = new Map();
  private stateManager: StateManager;
  private workflows: Map<WorkflowType, WorkflowDefinition> = new Map();

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.initializeWorkflows();
  }

  /**
   * Register an agent with the workflow engine
   */
  registerAgent(agentType: AgentType, agent: BaseAgent): void {
    this.agents.set(agentType, agent);
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowType: WorkflowType,
    input: WorkflowInput,
    context?: Partial<WorkflowContext>
  ): Promise<WorkflowResult> {
    const workflowId = this.generateWorkflowId(workflowType);
    
    try {
      // Get workflow definition
      const workflow = this.workflows.get(workflowType);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowType}`);
      }

      // Create workflow context
      const workflowContext: WorkflowContext = {
        workflowId,
        executionId: `${workflowId}_${Date.now()}`,
        userId: context?.userId,
        organizationId: context?.organizationId,
        stepHistory: [],
        sharedData: { ...input.data },
        progressCallback: context?.progressCallback
      };

      // Initialize workflow state
      const state = await this.stateManager.initializeWorkflow(workflow, workflowContext);

      // Execute workflow
      const result = await this.executeWorkflowNodes(workflow, state, workflowContext);

      // Finalize workflow
      await this.stateManager.finalizeWorkflow(workflowId, result);

      return result;

    } catch (error) {
      console.error(`Workflow execution failed: ${workflowType}`, error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown workflow error'),
        data: {},
        metadata: {
          workflowType,
          workflowId,
          executionTime: Date.now(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Execute workflow nodes in sequence
   */
  private async executeWorkflowNodes(
    workflow: WorkflowDefinition,
    state: WorkflowState,
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    let currentNode = workflow.nodes.find(n => n.id === workflow.entryPoint);
    const executionResults: Record<string, AgentOutput> = {};

    while (currentNode) {
      try {
        // Update progress
        this.updateProgress(context, currentNode.id, state);

        // Execute node
        const nodeResult = await this.executeNode(currentNode, state, context);
        executionResults[currentNode.id] = nodeResult;

                 // Update state
         state.currentNode = currentNode.id;
         state.nodeHistory.push({
           nodeId: currentNode.id,
           agentType: currentNode.agentType,
           startTime: new Date(),
           endTime: new Date(),
           input: agentInput,
           output: nodeResult,
           status: nodeResult.success ? 'completed' : 'failed',
           error: nodeResult.error,
           retryCount: 0,
           duration: 1000 // TODO: Calculate actual duration
         });
         state.sharedData = { ...state.sharedData, ...nodeResult.data };

        // Check if workflow should continue
        if (!nodeResult.success) {
          if (currentNode.onFailure) {
            currentNode = workflow.nodes.find(n => n.id === currentNode.onFailure);
            continue;
          } else {
            return {
              success: false,
              error: nodeResult.error,
              data: state.data,
              metadata: {
                workflowType: workflow.type,
                workflowId: context.workflowId,
                executionTime: Date.now() - state.startTime,
                completedSteps: state.stepHistory.length,
                totalSteps: workflow.nodes.length,
                currentStep: currentNode.id
              }
            };
          }
        }

        // Find next node
        const nextNode = this.findNextNode(workflow, currentNode, nodeResult, state);
        currentNode = nextNode;

      } catch (error) {
        console.error(`Node execution failed: ${currentNode.id}`, error);
        return {
          success: false,
          error: error instanceof Error ? error : new Error('Node execution failed'),
          data: state.data,
          metadata: {
            workflowType: workflow.type,
            workflowId: context.workflowId,
            executionTime: Date.now() - state.startTime,
            completedSteps: state.stepHistory.length,
            totalSteps: workflow.nodes.length,
            currentStep: currentNode.id,
            failedStep: currentNode.id
          }
        };
      }
    }

    // Workflow completed successfully
    return {
      success: true,
      data: state.data,
      metadata: {
        workflowType: workflow.type,
        workflowId: context.workflowId,
        executionTime: Date.now() - state.startTime,
        completedSteps: state.stepHistory.length,
        totalSteps: workflow.nodes.length,
        executionResults
      }
    };
  }

  /**
   * Execute a single workflow node
   */
  private async executeNode(
    node: WorkflowNode,
    state: WorkflowState,
    context: WorkflowContext
  ): Promise<AgentOutput> {
    const agent = this.agents.get(node.agentType);
    if (!agent) {
      throw new Error(`Agent not found: ${node.agentType}`);
    }

    // Prepare agent input
    const agentInput: AgentInput = {
      data: {
        action: node.action,
        ...node.parameters,
        ...state.data
      },
      context,
      metadata: {
        nodeId: node.id,
        workflowId: context.workflowId,
        stepIndex: state.stepHistory.length
      }
    };

    // Execute agent
    const result = await agent.execute(agentInput);

    // Handle human-in-the-loop interactions
    if (result.humanInteraction) {
      // TODO: Implement human interaction handling
      console.log('Human interaction required:', result.humanInteraction);
    }

    return result;
  }

  /**
   * Find the next node to execute
   */
  private findNextNode(
    workflow: WorkflowDefinition,
    currentNode: WorkflowNode,
    nodeResult: AgentOutput,
    state: WorkflowState
  ): WorkflowNode | null {
    // Find outgoing edges from current node
    const outgoingEdges = workflow.edges.filter(e => e.source === currentNode.id);

    if (outgoingEdges.length === 0) {
      // No outgoing edges, workflow ends
      return null;
    }

    // Find the first edge whose condition is met
    for (const edge of outgoingEdges) {
      if (this.evaluateEdgeCondition(edge, nodeResult, state)) {
        return workflow.nodes.find(n => n.id === edge.target) || null;
      }
    }

    // No conditions met, use default edge if available
    const defaultEdge = outgoingEdges.find(e => !e.condition);
    if (defaultEdge) {
      return workflow.nodes.find(n => n.id === defaultEdge.target) || null;
    }

    return null;
  }

  /**
   * Evaluate edge condition
   */
  private evaluateEdgeCondition(
    edge: WorkflowEdge,
    nodeResult: AgentOutput,
    state: WorkflowState
  ): boolean {
    if (!edge.condition) {
      return true; // No condition means always true
    }

    const condition = edge.condition;

    switch (condition.type) {
      case 'success':
        return nodeResult.success;
      
      case 'failure':
        return !nodeResult.success;
      
      case 'data_exists':
        return condition.field ? 
          nodeResult.data[condition.field] !== undefined : 
          Object.keys(nodeResult.data).length > 0;
      
      case 'data_equals':
        return condition.field && condition.value !== undefined ?
          nodeResult.data[condition.field] === condition.value :
          false;
      
      case 'custom':
        // Custom condition evaluation
        try {
          return condition.evaluator ? 
            condition.evaluator(nodeResult, state) : 
            false;
        } catch (error) {
          console.error('Custom condition evaluation failed:', error);
          return false;
        }
      
      default:
        return true;
    }
  }

  /**
   * Update workflow progress
   */
  private updateProgress(
    context: WorkflowContext,
    nodeId: string,
    state: WorkflowState
  ): void {
    if (context.progressCallback) {
      context.progressCallback({
        stage: nodeId,
        current: state.stepHistory.length + 1,
        total: state.totalSteps,
        message: `Executing step: ${nodeId}`,
        metadata: {
          workflowId: context.workflowId,
          executionId: context.executionId,
          currentStep: nodeId
        }
      });
    }
  }

  /**
   * Generate unique workflow ID
   */
  private generateWorkflowId(workflowType: WorkflowType): string {
    return `${workflowType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize predefined workflows
   */
  private initializeWorkflows(): void {
    // Initialize the four core workflow patterns
    this.workflows.set('opportunity_to_proposal', this.createOpportunityToProposalWorkflow());
    this.workflows.set('document_to_knowledge', this.createDocumentToKnowledgeWorkflow());
    this.workflows.set('proposal_to_records', this.createProposalToRecordsWorkflow());
    this.workflows.set('crm_to_records', this.createCRMToRecordsWorkflow());
  }

  /**
   * Create Opportunity → Proposal workflow
   */
  private createOpportunityToProposalWorkflow(): WorkflowDefinition {
    return {
      id: 'opportunity_to_proposal',
      type: 'opportunity_to_proposal',
      name: 'Opportunity to Proposal',
      description: 'Convert RFP or opportunity documents into draft proposals',
      version: '1.0.0',
      nodes: [
        {
          id: 'analyze_document',
          agentType: 'document_analysis',
          action: 'classifyAndAnalyze',
          parameters: {},
          timeout: 120000,
          onFailure: 'error_handler'
        },
        {
          id: 'extract_opportunity',
          agentType: 'knowledge_management',
          action: 'extractOpportunityData',
          parameters: {},
          timeout: 60000,
          onFailure: 'error_handler'
        },
        {
          id: 'human_review',
          agentType: 'human_interface',
          action: 'presentOptions',
          parameters: {},
          humanInLoop: true,
          timeout: 300000,
          onFailure: 'error_handler'
        },
        {
          id: 'generate_proposal',
          agentType: 'knowledge_management',
          action: 'generateProposal',
          parameters: {},
          timeout: 120000,
          onFailure: 'error_handler'
        },
        {
          id: 'error_handler',
          agentType: 'human_interface',
          action: 'handleError',
          parameters: {},
          humanInLoop: true,
          timeout: 60000
        }
      ],
      edges: [
        {
          id: 'analyze_to_extract',
          source: 'analyze_document',
          target: 'extract_opportunity',
          condition: { type: 'success' }
        },
        {
          id: 'extract_to_review',
          source: 'extract_opportunity',
          target: 'human_review',
          condition: { type: 'success' }
        },
        {
          id: 'review_to_generate',
          source: 'human_review',
          target: 'generate_proposal',
          condition: { type: 'data_equals', field: 'userDecision', value: 'approve' }
        }
      ],
      entryPoint: 'analyze_document',
      metadata: {
        category: 'document_processing',
        tags: ['opportunity', 'proposal', 'rfp'],
        estimatedDuration: 300000
      }
    };
  }

  /**
   * Create Document → Knowledge workflow
   */
  private createDocumentToKnowledgeWorkflow(): WorkflowDefinition {
    return {
      id: 'document_to_knowledge',
      type: 'document_to_knowledge',
      name: 'Document to Knowledge Items',
      description: 'Extract knowledge items from documents',
      version: '1.0.0',
      nodes: [
        {
          id: 'source_document',
          agentType: 'document_sourcing',
          action: 'extractContent',
          parameters: {},
          timeout: 60000,
          onFailure: 'error_handler'
        },
        {
          id: 'analyze_document',
          agentType: 'document_analysis',
          action: 'classifyAndAnalyze',
          parameters: {},
          timeout: 120000,
          onFailure: 'error_handler'
        },
        {
          id: 'extract_knowledge',
          agentType: 'knowledge_management',
          action: 'extractKnowledgeItems',
          parameters: {},
          timeout: 180000,
          onFailure: 'error_handler'
        },
        {
          id: 'present_items',
          agentType: 'human_interface',
          action: 'presentKnowledgeItems',
          parameters: {},
          humanInLoop: true,
          timeout: 600000,
          onFailure: 'error_handler'
        },
        {
          id: 'store_knowledge',
          agentType: 'knowledge_management',
          action: 'storeKnowledgeItems',
          parameters: {},
          timeout: 60000,
          onFailure: 'error_handler'
        },
        {
          id: 'error_handler',
          agentType: 'human_interface',
          action: 'handleError',
          parameters: {},
          humanInLoop: true,
          timeout: 60000
        }
      ],
      edges: [
        {
          id: 'source_to_analyze',
          source: 'source_document',
          target: 'analyze_document',
          condition: { type: 'success' }
        },
        {
          id: 'analyze_to_extract',
          source: 'analyze_document',
          target: 'extract_knowledge',
          condition: { type: 'success' }
        },
        {
          id: 'extract_to_present',
          source: 'extract_knowledge',
          target: 'present_items',
          condition: { type: 'success' }
        },
        {
          id: 'present_to_store',
          source: 'present_items',
          target: 'store_knowledge',
          condition: { type: 'data_equals', field: 'userDecision', value: 'approve' }
        }
      ],
      entryPoint: 'source_document',
      metadata: {
        category: 'knowledge_extraction',
        tags: ['document', 'knowledge', 'extraction'],
        estimatedDuration: 600000
      }
    };
  }

  /**
   * Create Proposal Document → Records workflow
   */
  private createProposalToRecordsWorkflow(): WorkflowDefinition {
    return {
      id: 'proposal_to_records',
      type: 'proposal_to_records',
      name: 'Proposal Document to Records',
      description: 'Convert proposal documents to proposal and opportunity records',
      version: '1.0.0',
      nodes: [
        {
          id: 'source_document',
          agentType: 'document_sourcing',
          action: 'extractContent',
          parameters: {},
          timeout: 60000,
          onFailure: 'error_handler'
        },
        {
          id: 'analyze_proposal',
          agentType: 'document_analysis',
          action: 'analyzeProposal',
          parameters: {},
          timeout: 120000,
          onFailure: 'error_handler'
        },
        {
          id: 'extract_records',
          agentType: 'knowledge_management',
          action: 'extractProposalRecords',
          parameters: {},
          timeout: 180000,
          onFailure: 'error_handler'
        },
        {
          id: 'present_options',
          agentType: 'human_interface',
          action: 'presentMatchingOptions',
          parameters: {},
          humanInLoop: true,
          timeout: 600000,
          onFailure: 'error_handler'
        },
        {
          id: 'create_records',
          agentType: 'knowledge_management',
          action: 'createRecords',
          parameters: {},
          timeout: 60000,
          onFailure: 'error_handler'
        },
        {
          id: 'error_handler',
          agentType: 'human_interface',
          action: 'handleError',
          parameters: {},
          humanInLoop: true,
          timeout: 60000
        }
      ],
      edges: [
        {
          id: 'source_to_analyze',
          source: 'source_document',
          target: 'analyze_proposal',
          condition: { type: 'success' }
        },
        {
          id: 'analyze_to_extract',
          source: 'analyze_proposal',
          target: 'extract_records',
          condition: { type: 'success' }
        },
        {
          id: 'extract_to_present',
          source: 'extract_records',
          target: 'present_options',
          condition: { type: 'success' }
        },
        {
          id: 'present_to_create',
          source: 'present_options',
          target: 'create_records',
          condition: { type: 'data_exists', field: 'userDecision' }
        }
      ],
      entryPoint: 'source_document',
      metadata: {
        category: 'record_creation',
        tags: ['proposal', 'records', 'opportunity'],
        estimatedDuration: 600000
      }
    };
  }

  /**
   * Create CRM Export → Records workflow
   */
  private createCRMToRecordsWorkflow(): WorkflowDefinition {
    return {
      id: 'crm_to_records',
      type: 'crm_to_records',
      name: 'CRM Export to System Records',
      description: 'Import CRM data into system records',
      version: '1.0.0',
      nodes: [
        {
          id: 'source_data',
          agentType: 'document_sourcing',
          action: 'parseDataFile',
          parameters: {},
          timeout: 60000,
          onFailure: 'error_handler'
        },
        {
          id: 'extract_entities',
          agentType: 'knowledge_management',
          action: 'extractCRMEntities',
          parameters: {},
          timeout: 180000,
          onFailure: 'error_handler'
        },
        {
          id: 'present_preview',
          agentType: 'human_interface',
          action: 'presentImportPreview',
          parameters: {},
          humanInLoop: true,
          timeout: 600000,
          onFailure: 'error_handler'
        },
        {
          id: 'import_records',
          agentType: 'knowledge_management',
          action: 'importRecords',
          parameters: {},
          timeout: 120000,
          onFailure: 'error_handler'
        },
        {
          id: 'error_handler',
          agentType: 'human_interface',
          action: 'handleError',
          parameters: {},
          humanInLoop: true,
          timeout: 60000
        }
      ],
      edges: [
        {
          id: 'source_to_extract',
          source: 'source_data',
          target: 'extract_entities',
          condition: { type: 'success' }
        },
        {
          id: 'extract_to_present',
          source: 'extract_entities',
          target: 'present_preview',
          condition: { type: 'success' }
        },
        {
          id: 'present_to_import',
          source: 'present_preview',
          target: 'import_records',
          condition: { type: 'data_equals', field: 'userDecision', value: 'approve' }
        }
      ],
      entryPoint: 'source_data',
      metadata: {
        category: 'data_import',
        tags: ['crm', 'import', 'records'],
        estimatedDuration: 600000
      }
    };
  }
}

export default WorkflowEngine; 
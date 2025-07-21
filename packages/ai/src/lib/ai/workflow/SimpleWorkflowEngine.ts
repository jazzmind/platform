import { BaseAgent } from '../agents/BaseAgent';
import { AgentType, AgentInput, AgentOutput, WorkflowContext } from '../agents/BaseAgent';
import { WorkflowType } from './interfaces';
import { SSEManager } from '@/src/lib/sse/sseManager';

export interface SimpleWorkflowNode {
  id: string;
  agentType: AgentType;
  action: string;
  parameters?: Record<string, unknown>;
  humanInLoop?: boolean;
  timeout?: number;
}

export interface SimpleWorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: (result: AgentOutput) => boolean;
}

export interface SimpleWorkflowDefinition {
  id: string;
  type: WorkflowType;
  name: string;
  description: string;
  version: string;
  nodes: SimpleWorkflowNode[];
  edges: SimpleWorkflowEdge[];
  entryPoint: string;
}

export interface SimpleWorkflowResult {
  success: boolean;
  data: Record<string, unknown>;
  error?: Error;
  metadata: {
    workflowType: WorkflowType;
    workflowId: string;
    executionTime: number;
    completedSteps: number;
    totalSteps: number;
    currentStep?: string;
    failedStep?: string;
    executionResults: Record<string, AgentOutput>;
    sseSessionId?: string;
  };
}

export interface SimpleWorkflowInput {
  data: Record<string, unknown>;
  context?: Partial<WorkflowContext>;
  metadata?: Record<string, unknown>;
  sseSessionId?: string;
}

export class SimpleWorkflowEngine {
  private agents: Map<AgentType, BaseAgent> = new Map();
  private workflows: Map<WorkflowType, SimpleWorkflowDefinition> = new Map();

  constructor() {
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
    input: SimpleWorkflowInput
  ): Promise<SimpleWorkflowResult> {
    const workflowId = this.generateWorkflowId(workflowType);
    const startTime = Date.now();
    
    try {
      // Get workflow definition
      const workflow = this.workflows.get(workflowType);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowType}`);
      }

      // Execute workflow
      const result = await this.executeWorkflowNodes(workflow, input, workflowId, input.sseSessionId);

      // Broadcast workflow completion
      if (input.sseSessionId) {
        SSEManager.broadcastToSession(input.sseSessionId, {
          type: 'workflow-complete',
          data: {
            workflowId,
            workflowType,
            success: result.success,
            completedSteps: result.metadata.completedSteps,
            totalSteps: result.metadata.totalSteps,
            executionTime: Date.now() - startTime,
            timestamp: new Date().toISOString()
          }
        });

        // Clean up SSE session after a delay to allow final events to be sent
        setTimeout(() => {
          fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/sse/workflows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'cleanup-session',
              data: { sessionId: input.sseSessionId }
            })
          }).catch(error => {
            console.warn('Failed to cleanup SSE session:', error);
          });
        }, 2000); // 2 second delay
      }

      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTime: Date.now() - startTime,
          sseSessionId: input.sseSessionId
        }
      };

    } catch (error) {
      console.error(`Workflow execution failed: ${workflowType}`, error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown workflow error'),
        data: {},
        metadata: {
          workflowType,
          workflowId,
          executionTime: Date.now() - startTime,
          completedSteps: 0,
          totalSteps: 0,
          executionResults: {}
        }
      };
    }
  }

  /**
   * Execute workflow nodes in sequence
   */
  private async executeWorkflowNodes(
    workflow: SimpleWorkflowDefinition,
    input: SimpleWorkflowInput,
    workflowId: string,
    sseSessionId?: string
  ): Promise<SimpleWorkflowResult> {
    let currentNode = workflow.nodes.find(n => n.id === workflow.entryPoint);
    const executionResults: Record<string, AgentOutput> = {};
    const sharedData = { ...input.data };
    let completedSteps = 0;

    while (currentNode) {
      try {
        // Execute node
        const nodeResult = await this.executeNode(currentNode, sharedData, workflowId, sseSessionId);
        executionResults[currentNode.id] = nodeResult;
        completedSteps++;

        // Update shared data
        Object.assign(sharedData, nodeResult.data);

        // Check if workflow should continue
        if (!nodeResult.success) {
          return {
            success: false,
            error: nodeResult.error,
            data: sharedData,
            metadata: {
              workflowType: workflow.type,
              workflowId,
              executionTime: 0, // Will be set by caller
              completedSteps,
              totalSteps: workflow.nodes.length,
              currentStep: currentNode.id,
              failedStep: currentNode.id,
              executionResults
            }
          };
        }

        // Find next node
        const nextNode = this.findNextNode(workflow, currentNode, nodeResult);
        currentNode = nextNode;

      } catch (error) {
        console.error(`Node execution failed: ${currentNode.id}`, error);
        return {
          success: false,
          error: error instanceof Error ? error : new Error('Node execution failed'),
          data: sharedData,
          metadata: {
            workflowType: workflow.type,
            workflowId,
            executionTime: 0, // Will be set by caller
            completedSteps,
            totalSteps: workflow.nodes.length,
            currentStep: currentNode.id,
            failedStep: currentNode.id,
            executionResults
          }
        };
      }
    }

    // Workflow completed successfully
    return {
      success: true,
      data: sharedData,
      metadata: {
        workflowType: workflow.type,
        workflowId,
        executionTime: 0, // Will be set by caller
        completedSteps,
        totalSteps: workflow.nodes.length,
        executionResults
      }
    };
  }

  /**
   * Execute a single workflow node
   */
  private async executeNode(
    node: SimpleWorkflowNode,
    sharedData: Record<string, unknown>,
    workflowId: string,
    sseSessionId?: string
  ): Promise<AgentOutput> {
    const agent = this.agents.get(node.agentType);
    if (!agent) {
      throw new Error(`Agent not found: ${node.agentType}`);
    }

    // Broadcast node start
    if (sseSessionId) {
      SSEManager.broadcastToSession(sseSessionId, {
        type: 'node-start',
        data: {
          nodeId: node.id,
          nodeName: node.id,
          agentType: node.agentType,
          action: node.action,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Prepare agent input
    const agentInput: AgentInput = {
      data: {
        type: node.action,
        ...node.parameters,
        ...sharedData
      },
      metadata: {
        nodeId: node.id,
        workflowId
      }
    };

    try {
      // Execute agent
      const result = await agent.execute(agentInput);

      // Broadcast completion with debug info
      if (sseSessionId) {
        SSEManager.broadcastToSession(sseSessionId, {
          type: 'node-complete',
          data: {
            nodeId: node.id,
            nodeName: node.id,
            agentType: node.agentType,
            status: 'completed',
            result: result.data,
            debugInfo: {
              prompt: agent.lastPrompt,
              response: agent.lastResponse,
              tokensUsed: result.metadata?.tokensUsed,
              cost: result.metadata?.cost,
              logs: agent.debugLogs || []
            },
            timestamp: new Date().toISOString()
          }
        });
      }

      // Handle human-in-the-loop interactions
      if (result.humanInteraction) {
        // TODO: Implement human interaction handling
        console.log('Human interaction required:', result.humanInteraction);
      }

      return result;
    } catch (error) {
      // Broadcast error
      if (sseSessionId) {
        SSEManager.broadcastToSession(sseSessionId, {
          type: 'node-error',
          data: {
            nodeId: node.id,
            nodeName: node.id,
            agentType: node.agentType,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }
        });
      }
      throw error;
    }
  }

  /**
   * Find the next node to execute
   */
  private findNextNode(
    workflow: SimpleWorkflowDefinition,
    currentNode: SimpleWorkflowNode,
    nodeResult: AgentOutput
  ): SimpleWorkflowNode | null {
    // Find outgoing edges from current node
    const outgoingEdges = workflow.edges.filter(e => e.source === currentNode.id);

    if (outgoingEdges.length === 0) {
      // No outgoing edges, workflow ends
      return null;
    }

    // Find the first edge whose condition is met
    for (const edge of outgoingEdges) {
      if (!edge.condition || edge.condition(nodeResult)) {
        return workflow.nodes.find(n => n.id === edge.target) || null;
      }
    }

    return null;
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
    this.workflows.set('proposal_document_to_records', this.createProposalToRecordsWorkflow());
    this.workflows.set('crm_export_to_records', this.createCRMToRecordsWorkflow());
  }

  /**
   * Get available workflows
   */
  getAvailableWorkflows(): SimpleWorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get workflow by type
   */
  getWorkflow(workflowType: WorkflowType): SimpleWorkflowDefinition | undefined {
    return this.workflows.get(workflowType);
  }

  /**
   * Create Opportunity → Proposal workflow
   */
  private createOpportunityToProposalWorkflow(): SimpleWorkflowDefinition {
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
          timeout: 120000
        },
        {
          id: 'extract_opportunity',
          agentType: 'knowledge_management',
          action: 'extractOpportunityData',
          parameters: {},
          timeout: 60000
        },
        {
          id: 'human_review',
          agentType: 'human_interface',
          action: 'presentOptions',
          parameters: {},
          humanInLoop: true,
          timeout: 300000
        },
        {
          id: 'generate_proposal',
          agentType: 'knowledge_management',
          action: 'generateProposal',
          parameters: {},
          timeout: 120000
        }
      ],
      edges: [
        {
          id: 'analyze_to_extract',
          source: 'analyze_document',
          target: 'extract_opportunity',
          condition: (result) => result.success
        },
        {
          id: 'extract_to_review',
          source: 'extract_opportunity',
          target: 'human_review',
          condition: (result) => result.success
        },
        {
          id: 'review_to_generate',
          source: 'human_review',
          target: 'generate_proposal',
          condition: (result) => result.success && result.data.userDecision === 'approve'
        }
      ],
      entryPoint: 'analyze_document'
    };
  }

  /**
   * Create Document → Knowledge workflow
   */
  private createDocumentToKnowledgeWorkflow(): SimpleWorkflowDefinition {
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
          action: 'process_document',
          parameters: {},
          timeout: 60000
        },
        {
          id: 'analyze_document',
          agentType: 'document_analysis',
          action: 'classifyAndAnalyze',
          parameters: {},
          timeout: 120000
        },
        {
          id: 'extract_knowledge',
          agentType: 'knowledge_management',
          action: 'extract_knowledge',
          parameters: {},
          timeout: 180000
        },
        {
          id: 'present_items',
          agentType: 'human_interface',
          action: 'presentKnowledgeItems',
          parameters: {},
          humanInLoop: true,
          timeout: 600000
        },
        {
          id: 'store_knowledge',
          agentType: 'knowledge_management',
          action: 'storeKnowledgeItems',
          parameters: {},
          timeout: 60000
        }
      ],
      edges: [
        {
          id: 'source_to_analyze',
          source: 'source_document',
          target: 'analyze_document',
          condition: (result) => result.success
        },
        {
          id: 'analyze_to_extract',
          source: 'analyze_document',
          target: 'extract_knowledge',
          condition: (result) => result.success
        },
        {
          id: 'extract_to_present',
          source: 'extract_knowledge',
          target: 'present_items',
          condition: (result) => result.success
        },
        {
          id: 'present_to_store',
          source: 'present_items',
          target: 'store_knowledge',
          condition: (result) => result.success && result.data.userDecision === 'approve'
        }
      ],
      entryPoint: 'source_document'
    };
  }

  /**
   * Create Proposal Document → Records workflow
   */
  private createProposalToRecordsWorkflow(): SimpleWorkflowDefinition {
    return {
      id: 'proposal_to_records',
      type: 'proposal_document_to_records',
      name: 'Proposal Document to Records',
      description: 'Convert proposal documents to proposal and opportunity records',
      version: '1.0.0',
      nodes: [
        {
          id: 'source_document',
          agentType: 'document_sourcing',
          action: 'extractContent',
          parameters: {},
          timeout: 60000
        },
        {
          id: 'analyze_proposal',
          agentType: 'document_analysis',
          action: 'analyzeProposal',
          parameters: {},
          timeout: 120000
        },
        {
          id: 'extract_records',
          agentType: 'knowledge_management',
          action: 'extractProposalRecords',
          parameters: {},
          timeout: 180000
        },
        {
          id: 'present_options',
          agentType: 'human_interface',
          action: 'presentMatchingOptions',
          parameters: {},
          humanInLoop: true,
          timeout: 600000
        },
        {
          id: 'create_records',
          agentType: 'knowledge_management',
          action: 'createRecords',
          parameters: {},
          timeout: 60000
        }
      ],
      edges: [
        {
          id: 'source_to_analyze',
          source: 'source_document',
          target: 'analyze_proposal',
          condition: (result) => result.success
        },
        {
          id: 'analyze_to_extract',
          source: 'analyze_proposal',
          target: 'extract_records',
          condition: (result) => result.success
        },
        {
          id: 'extract_to_present',
          source: 'extract_records',
          target: 'present_options',
          condition: (result) => result.success
        },
        {
          id: 'present_to_create',
          source: 'present_options',
          target: 'create_records',
          condition: (result) => result.success && result.data.userDecision
        }
      ],
      entryPoint: 'source_document'
    };
  }

  /**
   * Create CRM Export → Records workflow
   */
  private createCRMToRecordsWorkflow(): SimpleWorkflowDefinition {
    return {
      id: 'crm_to_records',
      type: 'crm_export_to_records',
      name: 'CRM Export to System Records',
      description: 'Import CRM data into system records',
      version: '1.0.0',
      nodes: [
        {
          id: 'source_data',
          agentType: 'document_sourcing',
          action: 'parseDataFile',
          parameters: {},
          timeout: 60000
        },
        {
          id: 'extract_entities',
          agentType: 'knowledge_management',
          action: 'extractCRMEntities',
          parameters: {},
          timeout: 180000
        },
        {
          id: 'present_preview',
          agentType: 'human_interface',
          action: 'presentImportPreview',
          parameters: {},
          humanInLoop: true,
          timeout: 600000
        },
        {
          id: 'import_records',
          agentType: 'knowledge_management',
          action: 'importRecords',
          parameters: {},
          timeout: 120000
        }
      ],
      edges: [
        {
          id: 'source_to_extract',
          source: 'source_data',
          target: 'extract_entities',
          condition: (result) => result.success
        },
        {
          id: 'extract_to_present',
          source: 'extract_entities',
          target: 'present_preview',
          condition: (result) => result.success
        },
        {
          id: 'present_to_import',
          source: 'present_preview',
          target: 'import_records',
          condition: (result) => result.success && result.data.userDecision === 'approve'
        }
      ],
      entryPoint: 'source_data'
    };
  }
}

export default SimpleWorkflowEngine; 
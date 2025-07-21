/**
 * Workflow Orchestration Interfaces
 * 
 * Provides interfaces for LangGraph-style workflow orchestration
 * and state management for the AI agent system.
 */

import { AgentType, AgentInput, AgentOutput, WorkflowContext } from '../agents/BaseAgent';

// Core Workflow Types
export type WorkflowType = 
  | 'opportunity_to_proposal'
  | 'document_to_knowledge'
  | 'proposal_document_to_records'
  | 'crm_export_to_records'
  | 'custom';

export type NodeType = 
  | 'agent'
  | 'condition'
  | 'human_input'
  | 'parallel'
  | 'loop'
  | 'end';

export type EdgeCondition = 
  | 'success'
  | 'failure'
  | 'human_approval'
  | 'data_validation'
  | 'custom_condition';

// Workflow Definition Interfaces
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  type: WorkflowType;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  entryPoint: string;
  metadata?: WorkflowMetadata;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  agentType?: AgentType;
  config?: NodeConfig;
  retryPolicy?: NodeRetryPolicy;
  timeout?: number;
  metadata?: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  sourceNode: string;
  targetNode: string;
  condition: EdgeCondition;
  conditionConfig?: EdgeConditionConfig;
  metadata?: Record<string, unknown>;
}

export interface WorkflowMetadata {
  tags: string[];
  author: string;
  createdAt: Date;
  updatedAt: Date;
  estimatedDuration?: number;
  complexity: 'low' | 'medium' | 'high';
  requiredCapabilities: string[];
}

// Node Configuration
export interface NodeConfig {
  humanInLoop?: boolean;
  skipOnError?: boolean;
  outputValidation?: OutputValidationConfig;
  inputTransformation?: InputTransformationConfig;
  parallelExecution?: ParallelExecutionConfig;
  [key: string]: unknown;
}

export interface NodeRetryPolicy {
  maxAttempts: number;
  delayMs: number;
  backoffFactor: number;
  retryableErrors: string[];
  customRetryLogic?: (error: Error, attempt: number) => boolean;
}

export interface OutputValidationConfig {
  schema?: Record<string, unknown>;
  required: string[];
  customValidation?: (output: AgentOutput) => boolean;
}

export interface InputTransformationConfig {
  mapping: Record<string, string>;
  customTransform?: (input: AgentInput) => AgentInput;
}

export interface ParallelExecutionConfig {
  enabled: boolean;
  maxConcurrency: number;
  waitForAll: boolean;
}

// Edge Condition Configuration
export interface EdgeConditionConfig {
  expectedValue?: unknown;
  comparison?: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  fieldPath?: string;
  customCondition?: (output: AgentOutput) => boolean;
  humanPrompt?: string;
  timeout?: number;
}

// Workflow State Management
export interface WorkflowState {
  workflowId: string;
  executionId: string;
  definition: WorkflowDefinition;
  currentNode: string;
  nodeHistory: ExecutionHistory[];
  sharedData: Record<string, unknown>;
  status: WorkflowStatus;
  startTime: Date;
  endTime?: Date;
  error?: WorkflowError;
  metadata: WorkflowExecutionMetadata;
}

export type WorkflowStatus = 
  | 'pending'
  | 'running'
  | 'waiting_for_human'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ExecutionHistory {
  nodeId: string;
  agentType?: AgentType;
  startTime: Date;
  endTime?: Date;
  input: AgentInput;
  output?: AgentOutput;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  error?: Error;
  retryCount: number;
  duration?: number;
}

export interface WorkflowError {
  code: string;
  message: string;
  nodeId: string;
  timestamp: Date;
  details?: Record<string, unknown>;
  isRetryable: boolean;
}

export interface WorkflowExecutionMetadata {
  totalNodes: number;
  completedNodes: number;
  failedNodes: number;
  skippedNodes: number;
  estimatedRemainingTime?: number;
  resourceUsage: ResourceUsage;
  qualityMetrics: QualityMetrics;
}

export interface ResourceUsage {
  tokensUsed: number;
  executionTime: number;
  apiCalls: number;
  memoryUsage?: number;
  costs?: {
    total: number;
    breakdown: Record<string, number>;
  };
}

export interface QualityMetrics {
  overallConfidence: number;
  accuracy?: number;
  completeness?: number;
  userSatisfaction?: number;
  errorRate: number;
}

// Workflow Engine Interfaces
export interface WorkflowEngineConfig {
  maxConcurrentWorkflows: number;
  defaultTimeout: number;
  enableDebugMode: boolean;
  stateManager: StateManagerConfig;
  humanInterface: HumanInterfaceConfig;
  monitoring: MonitoringConfig;
}

export interface StateManagerConfig {
  type: 'memory' | 'database' | 'redis';
  connectionString?: string;
  persistence: boolean;
  backup: boolean;
  ttl?: number;
}

export interface HumanInterfaceConfig {
  enabled: boolean;
  defaultTimeout: number;
  notificationChannels: string[];
  escalationRules: EscalationRule[];
}

export interface EscalationRule {
  condition: string;
  timeout: number;
  actions: string[];
  recipients: string[];
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsCollection: boolean;
  loggingLevel: 'debug' | 'info' | 'warn' | 'error';
  alerting: AlertingConfig;
}

export interface AlertingConfig {
  enabled: boolean;
  thresholds: {
    errorRate: number;
    executionTime: number;
    resourceUsage: number;
  };
  channels: string[];
}

// Workflow Execution Interfaces
export interface WorkflowExecutionRequest {
  workflowType: WorkflowType;
  workflowDefinition?: WorkflowDefinition;
  input: AgentInput;
  context: WorkflowContext;
  options?: WorkflowExecutionOptions;
}

export interface WorkflowExecutionOptions {
  priority: 'low' | 'normal' | 'high';
  timeout?: number;
  retryPolicy?: WorkflowRetryPolicy;
  humanInteraction?: HumanInteractionOptions;
  debugging?: DebuggingOptions;
}

export interface WorkflowRetryPolicy {
  enabled: boolean;
  maxAttempts: number;
  delayMs: number;
  backoffFactor: number;
  retryableStatuses: WorkflowStatus[];
}

export interface HumanInteractionOptions {
  enabled: boolean;
  autoApprove?: boolean;
  timeout?: number;
  escalation?: EscalationRule[];
}

export interface DebuggingOptions {
  enabled: boolean;
  captureStepDetails: boolean;
  generateVisualization: boolean;
  outputPath?: string;
}

export interface WorkflowExecutionResult {
  workflowId: string;
  executionId: string;
  status: WorkflowStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  finalOutput?: AgentOutput;
  error?: WorkflowError;
  metadata: WorkflowExecutionMetadata;
  artifacts: string[];
}

// Checkpoint and Recovery Interfaces
export interface WorkflowCheckpoint {
  checkpointId: string;
  workflowId: string;
  executionId: string;
  nodeId: string;
  timestamp: Date;
  state: WorkflowState;
  data: Record<string, unknown>;
  metadata: CheckpointMetadata;
}

export interface CheckpointMetadata {
  reason: 'scheduled' | 'manual' | 'error' | 'human_input';
  description?: string;
  recoverable: boolean;
  dataSize: number;
}

export interface RecoveryOptions {
  fromCheckpoint?: string;
  fromNode?: string;
  resetSharedData?: boolean;
  skipFailedNodes?: boolean;
  debugMode?: boolean;
}

// Search and Query Interfaces
export interface WorkflowSearchCriteria {
  workflowType?: WorkflowType;
  status?: WorkflowStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  duration?: {
    min?: number;
    max?: number;
  };
  tags?: string[];
  userId?: string;
  organizationId?: string;
  hasErrors?: boolean;
  limit?: number;
  offset?: number;
}

export interface WorkflowSearchResult {
  total: number;
  workflows: WorkflowExecutionSummary[];
  aggregations?: {
    statusCounts: Record<WorkflowStatus, number>;
    averageDuration: number;
    successRate: number;
    topErrors: Array<{ error: string; count: number }>;
  };
}

export interface WorkflowExecutionSummary {
  workflowId: string;
  executionId: string;
  type: WorkflowType;
  status: WorkflowStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  success: boolean;
  errorMessage?: string;
  metadata: {
    nodeCount: number;
    userSatisfaction?: number;
    resourceUsage: ResourceUsage;
  };
}

// All interfaces are exported individually above 
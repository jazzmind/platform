/**
 * AI Workflow Debugger
 * 
 * Provides comprehensive debugging and visualization capabilities for AI workflows.
 * Tracks execution flow, captures intermediate states, measures performance,
 * and enables visual inspection of AI processing pipelines.
 */

import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { AIService } from '../base/AIService';

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'ai_call' | 'processing' | 'transformation' | 'validation' | 'decision';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime: number;
  endTime?: number;
  duration?: number;
  input?: unknown;
  output?: unknown;
  error?: Error;
  metadata?: Record<string, unknown>;
  parent?: string;
  children?: string[];
}

export interface WorkflowExecution {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'running' | 'completed' | 'failed';
  steps: Map<string, WorkflowStep>;
  context: Record<string, unknown>;
  error?: Error;
}

export interface DebuggerConfig {
  enabled: boolean;
  captureInputs: boolean;
  captureOutputs: boolean;
  captureErrors: boolean;
  captureMetadata: boolean;
  maxInputSize: number;
  maxOutputSize: number;
  outputDir: string;
  enableVisualization: boolean;
  enableProfiling: boolean;
}

export interface PerformanceMetrics {
  executionTime: number;
  tokensUsed?: number;
  apiCalls: number;
  cacheHits: number;
  cacheMisses: number;
  memoryUsage?: number;
  errorRate: number;
}

export interface VisualizationNode {
  id: string;
  label: string;
  type: string;
  status: string;
  duration: number;
  x?: number;
  y?: number;
  children: string[];
  metadata: Record<string, unknown>;
}

export interface VisualizationEdge {
  from: string;
  to: string;
  label?: string;
  type?: string;
}

export interface VisualizationGraph {
  nodes: VisualizationNode[];
  edges: VisualizationEdge[];
  metadata: {
    totalDuration: number;
    totalSteps: number;
    successRate: number;
    criticalPath: string[];
  };
}

export class WorkflowDebugger {
  private executions: Map<string, WorkflowExecution> = new Map();
  private currentExecution: WorkflowExecution | null = null;
  private config: DebuggerConfig;
  private stepStack: string[] = [];

  constructor(config: Partial<DebuggerConfig> = {}) {
    this.config = {
      enabled: true,
      captureInputs: true,
      captureOutputs: true,
      captureErrors: true,
      captureMetadata: true,
      maxInputSize: 10000,
      maxOutputSize: 10000,
      outputDir: './debug/workflows',
      enableVisualization: true,
      enableProfiling: true,
      ...config
    };
  }

  /**
   * Start a new workflow execution
   */
  async startWorkflow(name: string, context: Record<string, unknown> = {}): Promise<string> {
    if (!this.config.enabled) {
      return '';
    }

    const execution: WorkflowExecution = {
      id: uuidv4(),
      name,
      startTime: Date.now(),
      status: 'running',
      steps: new Map(),
      context
    };

    this.executions.set(execution.id, execution);
    this.currentExecution = execution;
    this.stepStack = [];

    console.log(`🔍 [WorkflowDebugger] Started workflow: ${name} (${execution.id})`);

    return execution.id;
  }

  /**
   * End the current workflow execution
   */
  async endWorkflow(executionId: string, error?: Error): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const execution = this.executions.get(executionId);
    if (!execution) {
      return;
    }

    execution.endTime = Date.now();
    execution.duration = execution.endTime - execution.startTime;
    execution.status = error ? 'failed' : 'completed';
    execution.error = error;

    console.log(`🔍 [WorkflowDebugger] Ended workflow: ${execution.name} (${execution.duration}ms)`);

    // Save execution data to file
    await this.saveExecutionData(execution);

    // Generate visualization if enabled
    if (this.config.enableVisualization) {
      await this.generateVisualization(execution);
    }

    // Clear current execution
    if (this.currentExecution?.id === executionId) {
      this.currentExecution = null;
    }
  }

  /**
   * Start a new step in the current workflow
   */
  async startStep(
    name: string,
    type: WorkflowStep['type'],
    input?: unknown,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    if (!this.config.enabled || !this.currentExecution) {
      return '';
    }

    const step: WorkflowStep = {
      id: uuidv4(),
      name,
      type,
      status: 'running',
      startTime: Date.now(),
      input: this.config.captureInputs ? this.sanitizeData(input) : undefined,
      metadata: this.config.captureMetadata ? metadata : undefined,
      parent: this.stepStack.length > 0 ? this.stepStack[this.stepStack.length - 1] : undefined,
      children: []
    };

    // Add to parent's children
    if (step.parent) {
      const parent = this.currentExecution.steps.get(step.parent);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(step.id);
      }
    }

    this.currentExecution.steps.set(step.id, step);
    this.stepStack.push(step.id);

    console.log(`🔍 [WorkflowDebugger] Started step: ${name} (${step.id})`);

    return step.id;
  }

  /**
   * End a step in the current workflow
   */
  async endStep(stepId: string, output?: unknown, error?: Error): Promise<void> {
    if (!this.config.enabled || !this.currentExecution) {
      return;
    }

    const step = this.currentExecution.steps.get(stepId);
    if (!step) {
      return;
    }

    step.endTime = Date.now();
    step.duration = step.endTime - step.startTime;
    step.status = error ? 'failed' : 'completed';
    step.output = this.config.captureOutputs ? this.sanitizeData(output) : undefined;
    step.error = this.config.captureErrors ? error : undefined;

    // Remove from stack
    const stackIndex = this.stepStack.indexOf(stepId);
    if (stackIndex >= 0) {
      this.stepStack.splice(stackIndex, 1);
    }

    console.log(`🔍 [WorkflowDebugger] Ended step: ${step.name} (${step.duration}ms)`);
  }

  /**
   * Add metadata to a step
   */
  async addStepMetadata(stepId: string, metadata: Record<string, unknown>): Promise<void> {
    if (!this.config.enabled || !this.currentExecution) {
      return;
    }

    const step = this.currentExecution.steps.get(stepId);
    if (!step) {
      return;
    }

    step.metadata = { ...step.metadata, ...metadata };
  }

  /**
   * Create a checkpoint for debugging
   */
  async createCheckpoint(name: string, data: Record<string, unknown>): Promise<void> {
    if (!this.config.enabled || !this.currentExecution) {
      return;
    }

    const checkpoint = {
      id: uuidv4(),
      name,
      timestamp: Date.now(),
      data: this.sanitizeData(data),
      executionId: this.currentExecution.id
    };

    const checkpointPath = join(this.config.outputDir, 'checkpoints');
    await mkdir(checkpointPath, { recursive: true });
    await writeFile(
      join(checkpointPath, `${checkpoint.id}.json`),
      JSON.stringify(checkpoint, null, 2)
    );

    console.log(`🔍 [WorkflowDebugger] Created checkpoint: ${name}`);
  }

  /**
   * Generate performance metrics for an execution
   */
  generatePerformanceMetrics(execution: WorkflowExecution): PerformanceMetrics {
    const steps = Array.from(execution.steps.values());
    const completedSteps = steps.filter(s => s.status === 'completed');
    const failedSteps = steps.filter(s => s.status === 'failed');

    const totalDuration = execution.duration || 0;
    const apiCalls = steps.filter(s => s.type === 'ai_call').length;
    const errorRate = failedSteps.length / Math.max(steps.length, 1);

    return {
      executionTime: totalDuration,
      apiCalls,
      cacheHits: 0, // TODO: Track cache hits
      cacheMisses: 0, // TODO: Track cache misses
      errorRate
    };
  }

  /**
   * Generate visualization graph for an execution
   */
  generateVisualizationGraph(execution: WorkflowExecution): VisualizationGraph {
    const steps = Array.from(execution.steps.values());
    const nodes: VisualizationNode[] = [];
    const edges: VisualizationEdge[] = [];

    // Create nodes
    steps.forEach(step => {
      nodes.push({
        id: step.id,
        label: step.name,
        type: step.type,
        status: step.status,
        duration: step.duration || 0,
        children: step.children || [],
        metadata: step.metadata || {}
      });
    });

    // Create edges
    steps.forEach(step => {
      if (step.children) {
        step.children.forEach(childId => {
          edges.push({
            from: step.id,
            to: childId,
            type: 'flow'
          });
        });
      }
    });

    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(steps);

    return {
      nodes,
      edges,
      metadata: {
        totalDuration: execution.duration || 0,
        totalSteps: steps.length,
        successRate: steps.filter(s => s.status === 'completed').length / Math.max(steps.length, 1),
        criticalPath
      }
    };
  }

  /**
   * Export execution data for external analysis
   */
  async exportExecutionData(executionId: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    const outputPath = join(this.config.outputDir, 'exports');
    await mkdir(outputPath, { recursive: true });

    if (format === 'json') {
      const filePath = join(outputPath, `${executionId}.json`);
      await writeFile(filePath, JSON.stringify(this.serializeExecution(execution), null, 2));
      return filePath;
    } else if (format === 'csv') {
      const filePath = join(outputPath, `${executionId}.csv`);
      const csvData = this.convertExecutionToCSV(execution);
      await writeFile(filePath, csvData);
      return filePath;
    }

    throw new Error(`Unsupported format: ${format}`);
  }

  /**
   * Generate HTML visualization report
   */
  async generateHTMLReport(executionId: string): Promise<string> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    const graph = this.generateVisualizationGraph(execution);
    const metrics = this.generatePerformanceMetrics(execution);

    const htmlContent = this.generateHTMLContent(execution, graph, metrics);

    const outputPath = join(this.config.outputDir, 'reports');
    await mkdir(outputPath, { recursive: true });

    const filePath = join(outputPath, `${executionId}.html`);
    await writeFile(filePath, htmlContent);

    console.log(`🔍 [WorkflowDebugger] Generated HTML report: ${filePath}`);

    return filePath;
  }

  /**
   * Search executions by criteria
   */
  searchExecutions(criteria: {
    name?: string;
    status?: string;
    dateRange?: { start: Date; end: Date };
    durationRange?: { min: number; max: number };
    hasError?: boolean;
  }): WorkflowExecution[] {
    const executions = Array.from(this.executions.values());

    return executions.filter(execution => {
      if (criteria.name && !execution.name.includes(criteria.name)) {
        return false;
      }

      if (criteria.status && execution.status !== criteria.status) {
        return false;
      }

      if (criteria.dateRange) {
        const execDate = new Date(execution.startTime);
        if (execDate < criteria.dateRange.start || execDate > criteria.dateRange.end) {
          return false;
        }
      }

      if (criteria.durationRange && execution.duration) {
        if (execution.duration < criteria.durationRange.min || execution.duration > criteria.durationRange.max) {
          return false;
        }
      }

      if (criteria.hasError !== undefined) {
        if (criteria.hasError && !execution.error) {
          return false;
        }
        if (!criteria.hasError && execution.error) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get execution statistics
   */
  getExecutionStatistics(): {
    totalExecutions: number;
    successRate: number;
    averageDuration: number;
    mostCommonErrors: Array<{ error: string; count: number }>;
    executionTrends: Array<{ date: string; count: number; avgDuration: number }>;
  } {
    const executions = Array.from(this.executions.values());
    const completedExecutions = executions.filter(e => e.status === 'completed');
    const failedExecutions = executions.filter(e => e.status === 'failed');

    const successRate = completedExecutions.length / Math.max(executions.length, 1);
    const averageDuration = completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / Math.max(completedExecutions.length, 1);

    // Count error types
    const errorCounts = new Map<string, number>();
    failedExecutions.forEach(execution => {
      if (execution.error) {
        const errorType = execution.error.constructor.name;
        errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1);
      }
    });

    const mostCommonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalExecutions: executions.length,
      successRate,
      averageDuration,
      mostCommonErrors,
      executionTrends: [] // TODO: Implement trend analysis
    };
  }

  /**
   * Private helper methods
   */
  private sanitizeData(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    const serialized = JSON.stringify(data);
    const maxSize = this.config.maxInputSize;

    if (serialized.length > maxSize) {
      return `[Data too large: ${serialized.length} chars, truncated to ${maxSize}]${serialized.substring(0, maxSize)}`;
    }

    return JSON.parse(serialized);
  }

  private async saveExecutionData(execution: WorkflowExecution): Promise<void> {
    const outputPath = join(this.config.outputDir, 'executions');
    await mkdir(outputPath, { recursive: true });

    const filePath = join(outputPath, `${execution.id}.json`);
    await writeFile(filePath, JSON.stringify(this.serializeExecution(execution), null, 2));
  }

  private async generateVisualization(execution: WorkflowExecution): Promise<void> {
    const graph = this.generateVisualizationGraph(execution);
    const outputPath = join(this.config.outputDir, 'visualizations');
    await mkdir(outputPath, { recursive: true });

    // Save graph data
    const graphPath = join(outputPath, `${execution.id}.json`);
    await writeFile(graphPath, JSON.stringify(graph, null, 2));

    // Generate Mermaid diagram
    const mermaidDiagram = this.generateMermaidDiagram(graph);
    const mermaidPath = join(outputPath, `${execution.id}.mmd`);
    await writeFile(mermaidPath, mermaidDiagram);
  }

  private generateMermaidDiagram(graph: VisualizationGraph): string {
    let mermaid = 'flowchart TD\n';

    // Add nodes
    graph.nodes.forEach(node => {
      const statusIcon = this.getStatusIcon(node.status);
      const label = `${statusIcon} ${node.label}<br/>${node.duration}ms`;
      mermaid += `    ${node.id}["${label}"]\n`;
    });

    // Add edges
    graph.edges.forEach(edge => {
      mermaid += `    ${edge.from} --> ${edge.to}\n`;
    });

    return mermaid;
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'running': return '⏳';
      case 'pending': return '⭕';
      default: return '❓';
    }
  }

  private calculateCriticalPath(steps: WorkflowStep[]): string[] {
    // TODO: Implement critical path calculation
    return [];
  }

  private serializeExecution(execution: WorkflowExecution): unknown {
    return {
      ...execution,
      steps: Array.from(execution.steps.entries()).map(([id, step]) => ({ id, ...step }))
    };
  }

  private convertExecutionToCSV(execution: WorkflowExecution): string {
    const steps = Array.from(execution.steps.values());
    const headers = ['stepId', 'name', 'type', 'status', 'duration', 'startTime', 'endTime'];
    const rows = steps.map(step => [
      step.id,
      step.name,
      step.type,
      step.status,
      step.duration || 0,
      step.startTime,
      step.endTime || 0
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  private generateHTMLContent(execution: WorkflowExecution, graph: VisualizationGraph, metrics: PerformanceMetrics): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>AI Workflow Report - ${execution.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .metrics { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #e8f5e8; padding: 15px; border-radius: 5px; flex: 1; }
        .steps { margin: 20px 0; }
        .step { border: 1px solid #ddd; margin: 10px 0; padding: 10px; border-radius: 5px; }
        .step.completed { border-color: #4CAF50; }
        .step.failed { border-color: #f44336; }
        .step.running { border-color: #2196F3; }
    </style>
</head>
<body>
    <div class="header">
        <h1>AI Workflow Report</h1>
        <h2>${execution.name}</h2>
        <p>Execution ID: ${execution.id}</p>
        <p>Status: ${execution.status}</p>
        <p>Duration: ${execution.duration}ms</p>
    </div>

    <div class="metrics">
        <div class="metric">
            <h3>Execution Time</h3>
            <p>${metrics.executionTime}ms</p>
        </div>
        <div class="metric">
            <h3>API Calls</h3>
            <p>${metrics.apiCalls}</p>
        </div>
        <div class="metric">
            <h3>Error Rate</h3>
            <p>${(metrics.errorRate * 100).toFixed(1)}%</p>
        </div>
        <div class="metric">
            <h3>Success Rate</h3>
            <p>${(graph.metadata.successRate * 100).toFixed(1)}%</p>
        </div>
    </div>

    <div class="steps">
        <h3>Execution Steps</h3>
        ${Array.from(execution.steps.values()).map(step => `
            <div class="step ${step.status}">
                <h4>${step.name}</h4>
                <p>Type: ${step.type}</p>
                <p>Status: ${step.status}</p>
                <p>Duration: ${step.duration}ms</p>
                ${step.error ? `<p style="color: red;">Error: ${step.error.message}</p>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>
    `;
  }
}

// Create singleton instance
export const workflowDebugger = new WorkflowDebugger();

// Export decorator for instrumenting AI service methods
export function debugWorkflow(name: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const executionId = await workflowDebugger.startWorkflow(name, {
        method: propertyKey,
        className: target.constructor.name,
        args: args.slice(0, 2) // Limit args to avoid huge objects
      });

      try {
        const result = await originalMethod.apply(this, args);
        await workflowDebugger.endWorkflow(executionId);
        return result;
      } catch (error) {
        await workflowDebugger.endWorkflow(executionId, error as Error);
        throw error;
      }
    };

    return descriptor;
  };
}

// Export decorator for instrumenting individual steps
export function debugStep(name: string, type: WorkflowStep['type'] = 'processing') {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const stepId = await workflowDebugger.startStep(name, type, args[0]);

      try {
        const result = await originalMethod.apply(this, args);
        await workflowDebugger.endStep(stepId, result);
        return result;
      } catch (error) {
        await workflowDebugger.endStep(stepId, undefined, error as Error);
        throw error;
      }
    };

    return descriptor;
  };
}

export default workflowDebugger; 
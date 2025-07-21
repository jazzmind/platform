/**
 * AI Test Runner with Debugging Support
 * 
 * Integrates with the workflow debugger to provide visualization and inspection
 * of AI workflows during test execution. Enables developers to see exactly
 * what happens during AI processing and identify issues.
 */

import { workflowDebugger, WorkflowDebugger } from '../../../../lib/ai/debugging/workflowDebugger';
import { performance } from 'perf_hooks';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export interface TestContext {
  testName: string;
  testId: string;
  executionId: string;
  startTime: number;
  debugger: WorkflowDebugger;
  metadata: Record<string, unknown>;
}

export interface TestResult {
  testName: string;
  testId: string;
  executionId: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: Error;
  artifacts: string[];
  metrics: {
    aiCalls: number;
    totalTokens: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  startTime: number;
  endTime: number;
  duration: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    successRate: number;
  };
}

export class AITestRunner {
  private currentContext: TestContext | null = null;
  private testResults: TestResult[] = [];
  private debugger: WorkflowDebugger;
  private outputDir: string;

  constructor(outputDir: string = './test-results/ai-debugging') {
    this.debugger = workflowDebugger;
    this.outputDir = outputDir;
  }

  /**
   * Start a new test execution with debugging
   */
  async startTest(testName: string, metadata: Record<string, unknown> = {}): Promise<TestContext> {
    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const executionId = await this.debugger.startWorkflow(`Test: ${testName}`, {
      testName,
      testId,
      ...metadata
    });

    this.currentContext = {
      testName,
      testId,
      executionId,
      startTime: performance.now(),
      debugger: this.debugger,
      metadata
    };

    console.log(`🧪 [AITestRunner] Starting test: ${testName} (${testId})`);

    return this.currentContext;
  }

  /**
   * End the current test execution
   */
  async endTest(error?: Error): Promise<TestResult> {
    if (!this.currentContext) {
      throw new Error('No active test context');
    }

    const duration = performance.now() - this.currentContext.startTime;
    const status = error ? 'failed' : 'passed';

    // End the workflow debugging
    await this.debugger.endWorkflow(this.currentContext.executionId, error);

    // Generate test artifacts
    const artifacts = await this.generateTestArtifacts(this.currentContext, error);

    // Calculate metrics
    const metrics = await this.calculateTestMetrics(this.currentContext.executionId);

    const result: TestResult = {
      testName: this.currentContext.testName,
      testId: this.currentContext.testId,
      executionId: this.currentContext.executionId,
      status,
      duration,
      error,
      artifacts,
      metrics
    };

    this.testResults.push(result);

    console.log(`🧪 [AITestRunner] Completed test: ${this.currentContext.testName} (${status}, ${duration.toFixed(2)}ms)`);

    this.currentContext = null;
    return result;
  }

  /**
   * Execute a test function with debugging
   */
  async runTest<T>(
    testName: string,
    testFunction: (context: TestContext) => Promise<T>,
    metadata: Record<string, unknown> = {}
  ): Promise<{ result: T; testResult: TestResult }> {
    const context = await this.startTest(testName, metadata);

    try {
      const result = await testFunction(context);
      const testResult = await this.endTest();
      return { result, testResult };
    } catch (error) {
      const testResult = await this.endTest(error as Error);
      throw error;
    }
  }

  /**
   * Execute a test suite with debugging
   */
  async runTestSuite(
    suiteName: string,
    tests: Array<{
      name: string;
      testFunction: (context: TestContext) => Promise<any>;
      metadata?: Record<string, unknown>;
      timeout?: number;
    }>
  ): Promise<TestSuite> {
    const startTime = performance.now();
    const suiteResults: TestResult[] = [];

    console.log(`🧪 [AITestRunner] Starting test suite: ${suiteName}`);

    for (const test of tests) {
      try {
        const timeoutPromise = test.timeout ? 
          new Promise((_, reject) => setTimeout(() => reject(new Error('Test timeout')), test.timeout)) :
          null;

        const testPromise = this.runTest(test.name, test.testFunction, test.metadata);

                 const testPromiseResult = timeoutPromise ? 
           await Promise.race([testPromise, timeoutPromise]) as Promise<{ result: unknown; testResult: TestResult }> :
           await testPromise;

         suiteResults.push(testPromiseResult.testResult);
       } catch (error) {
         console.error(`🧪 [AITestRunner] Test failed: ${test.name}`, error);
         // Test already recorded in this.testResults via endTest
       }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    const summary = {
      total: suiteResults.length,
      passed: suiteResults.filter(r => r.status === 'passed').length,
      failed: suiteResults.filter(r => r.status === 'failed').length,
      skipped: suiteResults.filter(r => r.status === 'skipped').length,
      successRate: suiteResults.filter(r => r.status === 'passed').length / Math.max(suiteResults.length, 1)
    };

    const testSuite: TestSuite = {
      name: suiteName,
      tests: suiteResults,
      startTime,
      endTime,
      duration,
      summary
    };

    // Generate suite report
    await this.generateSuiteReport(testSuite);

    console.log(`🧪 [AITestRunner] Completed test suite: ${suiteName} (${summary.passed}/${summary.total} passed)`);

    return testSuite;
  }

  /**
   * Create a checkpoint during test execution
   */
  async createCheckpoint(name: string, data: Record<string, unknown>): Promise<void> {
    if (!this.currentContext) {
      throw new Error('No active test context');
    }

    await this.debugger.createCheckpoint(`Test Checkpoint: ${name}`, {
      testName: this.currentContext.testName,
      testId: this.currentContext.testId,
      ...data
    });
  }

  /**
   * Add metadata to current test
   */
  async addTestMetadata(metadata: Record<string, unknown>): Promise<void> {
    if (!this.currentContext) {
      throw new Error('No active test context');
    }

    this.currentContext.metadata = { ...this.currentContext.metadata, ...metadata };
  }

  /**
   * Generate test report with visualization
   */
  async generateTestReport(testResult: TestResult): Promise<string> {
    const outputPath = join(this.outputDir, 'reports');
    await mkdir(outputPath, { recursive: true });

    // Generate HTML report
    const htmlReport = await this.debugger.generateHTMLReport(testResult.executionId);

    // Generate additional test-specific content
    const testSpecificContent = `
      <div class="test-summary">
        <h2>Test Summary</h2>
        <p><strong>Test Name:</strong> ${testResult.testName}</p>
        <p><strong>Test ID:</strong> ${testResult.testId}</p>
        <p><strong>Status:</strong> ${testResult.status}</p>
        <p><strong>Duration:</strong> ${testResult.duration.toFixed(2)}ms</p>
        <p><strong>AI Calls:</strong> ${testResult.metrics.aiCalls}</p>
        <p><strong>Total Tokens:</strong> ${testResult.metrics.totalTokens}</p>
        <p><strong>Average Response Time:</strong> ${testResult.metrics.averageResponseTime.toFixed(2)}ms</p>
        <p><strong>Error Rate:</strong> ${(testResult.metrics.errorRate * 100).toFixed(1)}%</p>
        ${testResult.error ? `<p style="color: red;"><strong>Error:</strong> ${testResult.error.message}</p>` : ''}
      </div>
    `;

    // Read the generated HTML and insert test-specific content
    const htmlContent = await import('fs').then(fs => fs.promises.readFile(htmlReport, 'utf-8'));
    const enhancedHtml = htmlContent.replace(
      '<div class="header">',
      `<div class="header">${testSpecificContent}`
    );

    const reportPath = join(outputPath, `test_${testResult.testId}.html`);
    await writeFile(reportPath, enhancedHtml);

    console.log(`🧪 [AITestRunner] Generated test report: ${reportPath}`);

    return reportPath;
  }

  /**
   * Get test execution statistics
   */
  getTestStatistics(): {
    totalTests: number;
    successRate: number;
    averageDuration: number;
    totalAICalls: number;
    averageTokensPerTest: number;
    mostCommonErrors: Array<{ error: string; count: number }>;
  } {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const successRate = passed / Math.max(total, 1);
    const averageDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0) / Math.max(total, 1);
    const totalAICalls = this.testResults.reduce((sum, r) => sum + r.metrics.aiCalls, 0);
    const averageTokensPerTest = this.testResults.reduce((sum, r) => sum + r.metrics.totalTokens, 0) / Math.max(total, 1);

    // Count error types
    const errorCounts = new Map<string, number>();
    this.testResults.forEach(result => {
      if (result.error) {
        const errorType = result.error.constructor.name;
        errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1);
      }
    });

    const mostCommonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalTests: total,
      successRate,
      averageDuration,
      totalAICalls,
      averageTokensPerTest,
      mostCommonErrors
    };
  }

  /**
   * Compare test results across multiple runs
   */
  async compareTestRuns(
    baselineResults: TestResult[],
    currentResults: TestResult[]
  ): Promise<{
    performance: { improved: number; degraded: number; unchanged: number };
    reliability: { moreReliable: number; lessReliable: number; unchanged: number };
    efficiency: { moreEfficient: number; lessEfficient: number; unchanged: number };
  }> {
    const baselineMap = new Map(baselineResults.map(r => [r.testName, r]));
    const comparison = {
      performance: { improved: 0, degraded: 0, unchanged: 0 },
      reliability: { moreReliable: 0, lessReliable: 0, unchanged: 0 },
      efficiency: { moreEfficient: 0, lessEfficient: 0, unchanged: 0 }
    };

    currentResults.forEach(current => {
      const baseline = baselineMap.get(current.testName);
      if (!baseline) return;

      // Performance comparison (duration)
      const performanceChange = (current.duration - baseline.duration) / baseline.duration;
      if (performanceChange < -0.1) comparison.performance.improved++;
      else if (performanceChange > 0.1) comparison.performance.degraded++;
      else comparison.performance.unchanged++;

      // Reliability comparison (error rate)
      const reliabilityChange = current.metrics.errorRate - baseline.metrics.errorRate;
      if (reliabilityChange < -0.05) comparison.reliability.moreReliable++;
      else if (reliabilityChange > 0.05) comparison.reliability.lessReliable++;
      else comparison.reliability.unchanged++;

      // Efficiency comparison (tokens per success)
      const currentEfficiency = current.metrics.totalTokens / Math.max(current.metrics.aiCalls, 1);
      const baselineEfficiency = baseline.metrics.totalTokens / Math.max(baseline.metrics.aiCalls, 1);
      const efficiencyChange = (currentEfficiency - baselineEfficiency) / baselineEfficiency;
      if (efficiencyChange < -0.1) comparison.efficiency.moreEfficient++;
      else if (efficiencyChange > 0.1) comparison.efficiency.lessEfficient++;
      else comparison.efficiency.unchanged++;
    });

    return comparison;
  }

  /**
   * Private helper methods
   */
  private async generateTestArtifacts(context: TestContext, error?: Error): Promise<string[]> {
    const artifacts: string[] = [];

    // Export execution data
    const executionDataPath = await this.debugger.exportExecutionData(context.executionId, 'json');
    artifacts.push(executionDataPath);

    // Generate test report
    const reportPath = await this.generateTestReport({
      testName: context.testName,
      testId: context.testId,
      executionId: context.executionId,
      status: error ? 'failed' : 'passed',
      duration: performance.now() - context.startTime,
      error,
      artifacts: [],
      metrics: await this.calculateTestMetrics(context.executionId)
    });
    artifacts.push(reportPath);

    return artifacts;
  }

  private async calculateTestMetrics(executionId: string): Promise<TestResult['metrics']> {
    // TODO: Implement actual metrics calculation from workflow debugger
    // For now, return mock metrics
    return {
      aiCalls: 0,
      totalTokens: 0,
      averageResponseTime: 0,
      errorRate: 0
    };
  }

  private async generateSuiteReport(testSuite: TestSuite): Promise<void> {
    const outputPath = join(this.outputDir, 'suite-reports');
    await mkdir(outputPath, { recursive: true });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>AI Test Suite Report - ${testSuite.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #e8f5e8; padding: 15px; border-radius: 5px; flex: 1; text-align: center; }
        .tests { margin: 20px 0; }
        .test { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .test.passed { border-color: #4CAF50; background: #f8fff8; }
        .test.failed { border-color: #f44336; background: #fff8f8; }
        .test.skipped { border-color: #ff9800; background: #fff9f5; }
        .test-details { margin-top: 10px; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>AI Test Suite Report</h1>
        <h2>${testSuite.name}</h2>
        <p>Duration: ${testSuite.duration.toFixed(2)}ms</p>
        <p>Executed: ${new Date(testSuite.startTime).toLocaleString()}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <p>${testSuite.summary.total}</p>
        </div>
        <div class="metric">
            <h3>Passed</h3>
            <p>${testSuite.summary.passed}</p>
        </div>
        <div class="metric">
            <h3>Failed</h3>
            <p>${testSuite.summary.failed}</p>
        </div>
        <div class="metric">
            <h3>Success Rate</h3>
            <p>${(testSuite.summary.successRate * 100).toFixed(1)}%</p>
        </div>
    </div>

    <div class="tests">
        <h3>Test Results</h3>
        ${testSuite.tests.map(test => `
            <div class="test ${test.status}">
                <h4>${test.testName}</h4>
                <div class="test-details">
                    <p><strong>Status:</strong> ${test.status}</p>
                    <p><strong>Duration:</strong> ${test.duration.toFixed(2)}ms</p>
                    <p><strong>AI Calls:</strong> ${test.metrics.aiCalls}</p>
                    <p><strong>Total Tokens:</strong> ${test.metrics.totalTokens}</p>
                    ${test.error ? `<p style="color: red;"><strong>Error:</strong> ${test.error.message}</p>` : ''}
                </div>
            </div>
        `).join('')}
    </div>
</body>
</html>
    `;

    const reportPath = join(outputPath, `${testSuite.name.replace(/[^a-zA-Z0-9]/g, '_')}.html`);
    await writeFile(reportPath, htmlContent);

    console.log(`🧪 [AITestRunner] Generated suite report: ${reportPath}`);
  }
}

// Create singleton instance
export const aiTestRunner = new AITestRunner();

// Export helper functions for common test patterns
export async function testAIWorkflow<T>(
  testName: string,
  workflowFunction: (context: TestContext) => Promise<T>,
  metadata: Record<string, unknown> = {}
): Promise<T> {
  const { result } = await aiTestRunner.runTest(testName, workflowFunction, metadata);
  return result;
}

export async function testAIService<T>(
  serviceName: string,
  serviceMethod: string,
  input: unknown,
  expectedOutput?: unknown,
  metadata: Record<string, unknown> = {}
): Promise<T> {
  return testAIWorkflow(
    `${serviceName}.${serviceMethod}`,
    async (context) => {
      await context.debugger.createCheckpoint('Input', { input });
      
      // TODO: Implement actual service method invocation
      // This would require reflection or dependency injection
      
      await context.debugger.createCheckpoint('Output', { output: expectedOutput });
      
      return expectedOutput as T;
    },
    { serviceName, serviceMethod, ...metadata }
  );
}

export default aiTestRunner; 
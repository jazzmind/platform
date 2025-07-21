/**
 * Real AI Test Runner
 * 
 * Executes actual Jest tests from src/__tests__/lib/ai/ and provides visual feedback
 */

import { spawn } from 'child_process';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { SSEManager, SSEChannels, type SSEMessage } from '@/src/lib/sse/sseManager';

export interface TestFile {
  name: string;
  path: string;
  category: 'unit' | 'integration' | 'evaluation';
  exists: boolean;
}

export interface IndividualTest {
  id: string;
  name: string;
  description: string;
  status: 'passed' | 'failed' | 'running' | 'pending' | 'skipped';
  duration?: number;
  output: string;
  error?: string;
  aiPrompt?: string;
  aiResponse?: string;
  metadata?: Record<string, unknown>;
}

export interface TestResult {
  testFile: string;
  status: 'passed' | 'failed' | 'running' | 'pending' | 'skipped';
  duration?: number;
  output: string;
  error?: string;
  timestamp: string;
  passed: number;
  failed: number;
  total: number;
  skipped?: number;
  individualTests: IndividualTest[];
}

export interface TestSuiteResults {
  files: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    startTime: string;
    endTime: string;
  };
}

export class RealTestRunner {
  private testFiles: TestFile[] = [];
  private results: Map<string, TestResult> = new Map();
  private listeners: Array<(result: TestResult) => void> = [];
  private currentSessionId: string | null = null;
  private useSSE: boolean = true; // Default to true for backward compatibility

  constructor(useSSE: boolean = true) {
    this.useSSE = useSSE;
    this.discoverTests();
  }

  /**
   * Discover all available AI test files
   */
  private discoverTests(): void {
    const testDir = join(process.cwd(), 'src/__tests__/lib/ai');
    
    // Unit tests
    const unitTests = [
      'ai-service-base.test.ts',
      'documentAnalysis.test.ts', 
      'documentProcessing.test.ts',
      'embeddingService.test.ts',
      'document-classification.test.ts',
      'organization-extraction.test.ts',
      'knowledge-management.test.ts',
      'user-intent-extraction.test.ts',
      'document-sourcing.test.ts'
    ];

    // Root level tests
    const rootTests = [
      'contentExtraction.test.ts',
      'contentGeneration.test.ts',
      'crawlerService.test.ts',
      'fileAnalysis.test.ts',
      'csvExtraction.test.ts'
    ];

    // Integration tests
    const integrationTests = [
      'documentToVectorStore.test.ts'
    ];

    // Evaluation tests
    const evaluationTests = [
      'promptEvaluation.test.ts'
    ];

    // Add unit tests
    unitTests.forEach(test => {
      const testPath = join(testDir, 'unit', test);
      this.testFiles.push({
        name: test,
        path: testPath,
        category: 'unit',
        exists: existsSync(testPath)
      });
    });

    // Add root tests
    rootTests.forEach(test => {
      const testPath = join(testDir, test);
      this.testFiles.push({
        name: test,
        path: testPath,
        category: 'unit',
        exists: existsSync(testPath)
      });
    });

    // Add integration tests
    integrationTests.forEach(test => {
      const testPath = join(testDir, 'integration', test);
      this.testFiles.push({
        name: test,
        path: testPath,
        category: 'integration', 
        exists: existsSync(testPath)
      });
    });

    // Add evaluation tests
    evaluationTests.forEach(test => {
      const testPath = join(testDir, 'evaluation', test);
      this.testFiles.push({
        name: test,
        path: testPath,
        category: 'evaluation',
        exists: existsSync(testPath)
      });
    });
  }

  /**
   * Get list of available test files
   */
  getTestFiles(): TestFile[] {
    return this.testFiles;
  }

  /**
   * Start a test session with optional SSE support
   */
  startTestSession(metadata: Record<string, unknown> = {}): string {
    if (this.useSSE) {
      this.currentSessionId = SSEManager.createSession(
        SSEChannels.AI_TESTING,
        { 
          testRunner: 'real-ai-tests',
          startTime: new Date().toISOString(),
          ...metadata 
        },
        {
          maxClients: 10,
          enableHeartbeat: true,
          heartbeatInterval: 15000, // 15 seconds for testing
          autoCleanup: true,
        }
      );

      console.log(`🧪 Test session started: ${this.currentSessionId}`);
    } else {
      // For console runs, just generate a session ID for AI debug logging
      this.currentSessionId = `console-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log(`🧪 Console test session started: ${this.currentSessionId}`);
    }
    
    return this.currentSessionId;
  }

  /**
   * Stop the current test session
   */
  stopTestSession(): void {
    if (this.currentSessionId) {
      if (this.useSSE) {
        SSEManager.deleteSession(this.currentSessionId);
        console.log('🛑 Test session stopped');
      } else {
        console.log('🛑 Console test session stopped');
      }
      this.currentSessionId = null;
    }
  }

  /**
   * Broadcast test result to all connected clients (only if SSE enabled)
   */
  private broadcastTestResult(result: TestResult): void {
    if (this.currentSessionId && this.useSSE) {
      const message: SSEMessage = {
        type: 'test-result',
        data: result,
        sessionId: this.currentSessionId,
      };
      
      SSEManager.broadcastToSession(this.currentSessionId, message);
    }
    
    // Always notify local listeners regardless of SSE
    this.notifyListeners(result);
  }

  /**
   * Broadcast individual test update (only if SSE enabled)
   */
  private broadcastIndividualTestUpdate(testFile: string, individualTest: IndividualTest): void {
    if (this.currentSessionId && this.useSSE) {
      const message: SSEMessage = {
        type: 'individual-test-update',
        data: { testFile, individualTest },
        sessionId: this.currentSessionId,
      };
      
      SSEManager.broadcastToSession(this.currentSessionId, message);
    }
  }

  /**
   * Broadcast test suite completion (only if SSE enabled)
   */
  private broadcastSuiteComplete(suiteResults: TestSuiteResults): void {
    if (this.currentSessionId && this.useSSE) {
      const message: SSEMessage = {
        type: 'suite-complete',
        data: suiteResults,
        sessionId: this.currentSessionId,
      };
      
      SSEManager.broadcastToSession(this.currentSessionId, message);
    }
  }

  /**
   * Run a specific test file
   */
  async runTest(testFile: string): Promise<TestResult> {
    const file = this.testFiles.find(f => f.name === testFile);
    if (!file) {
      throw new Error(`Test file not found: ${testFile}`);
    }

    if (!file.exists) {
      const result: TestResult = {
        testFile,
        status: 'failed',
        output: '',
        error: 'Test file does not exist',
        timestamp: new Date().toISOString(),
        passed: 0,
        failed: 1,
        total: 1,
        individualTests: []
      };
      this.results.set(testFile, result);
      this.broadcastTestResult(result);
      return result;
    }

    // Initialize result
    const result: TestResult = {
      testFile,
      status: 'running',
      output: '',
      timestamp: new Date().toISOString(),
      passed: 0,
      failed: 0,
      total: 0,
      individualTests: []
    };

    this.results.set(testFile, result);
    this.broadcastTestResult(result);

    return new Promise((resolve) => {
      const startTime = Date.now();
      
      // Generate a unique session ID for this test run to correlate with debug logs
      const testSessionId = `test-${testFile.replace('.test.ts', '')}-${Date.now()}`;
      
      // Run Jest on the specific test file with verbose output
      const jestProcess = spawn('npx', ['jest', file.path, '--verbose', '--no-coverage'], {
        cwd: process.cwd(),
        stdio: 'pipe',
        env: { 
          ...process.env, 
          FORCE_COLOR: '0', // Disable colors for easier parsing
          AI_TEST_SESSION_ID: testSessionId, // Set session ID for debug logging
          AI_TEST_MODE: 'true', // Ensure test mode is set
          NODE_ENV: 'test' // Ensure test environment
        }
      });

      let output = '';
      let error = '';
      let currentTest: IndividualTest | null = null;

      jestProcess.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        // Parse individual tests as they execute
        const { individualTests, updatedTest } = this.parseIndividualTests(chunk, result.individualTests, currentTest, testSessionId);
        
        if (updatedTest) {
          currentTest = updatedTest;
          this.broadcastIndividualTestUpdate(testFile, updatedTest);
        }

        // Update result with real-time output and individual tests
        result.output = output;
        result.individualTests = individualTests;
        this.results.set(testFile, { ...result });
        this.broadcastTestResult({ ...result });
      });

      jestProcess.stderr?.on('data', (data) => {
        const chunk = data.toString();
        error += chunk;
        output += chunk; // Add stderr to output too
      });

      jestProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        // Parse Jest output for test counts and final individual test results
        const stats = this.parseJestOutput(output);
        const { individualTests } = this.parseIndividualTests(output, [], null, testSessionId, true);
        
        const finalResult: TestResult = {
          testFile,
          status: code === 0 ? 'passed' : 'failed',
          duration,
          output,
          error: error || undefined,
          timestamp: new Date().toISOString(),
          passed: stats.passed,
          failed: stats.failed,
          total: stats.total,
          skipped: stats.skipped,
          individualTests
        };

        this.results.set(testFile, finalResult);
        this.broadcastTestResult(finalResult);
        resolve(finalResult);
      });

      jestProcess.on('error', (err) => {
        const finalResult: TestResult = {
          testFile,
          status: 'failed',
          duration: Date.now() - startTime,
          output,
          error: err.message,
          timestamp: new Date().toISOString(),
          passed: 0,
          failed: 1,
          total: 1,
          individualTests: []
        };

        this.results.set(testFile, finalResult);
        this.broadcastTestResult(finalResult);
        resolve(finalResult);
      });
    });
  }

  /**
   * Parse individual test results from Jest output
   */
  private parseIndividualTests(
    output: string, 
    existingTests: IndividualTest[], 
    currentTest: IndividualTest | null,
    sessionId?: string,
    isFinalParse: boolean = false
  ): { individualTests: IndividualTest[], updatedTest: IndividualTest | null } {
    const tests = [...existingTests];
    let updatedTest: IndividualTest | null = null;

    // Parse Jest verbose output for individual tests
    // Look for patterns like:
    // "✓ should generate valid embedding for simple text (123ms)"
    // "✗ should handle error cases (45ms)"
    // "○ skipped test"
    const testResultRegex = /^\s*([✓✗×○]|\s*✓|\s*✗)\s+(.+?)(?:\s+\((\d+)ms\))?$/gm;
    let match;

    while ((match = testResultRegex.exec(output)) !== null) {
      const [, statusSymbol, testName, duration] = match;
      const cleanTestName = testName.trim();
      const testId = `${cleanTestName.replace(/\s+/g, '-').toLowerCase()}`;
      
      // Find existing test or create new one
      let test = tests.find(t => t.id === testId);
      if (!test) {
        test = {
          id: testId,
          name: cleanTestName,
          description: cleanTestName,
          status: 'pending',
          output: '',
          metadata: sessionId ? { sessionId } : {}
        };
        tests.push(test);
      }

      // Update test status based on Jest output
      const trimmedStatus = statusSymbol.trim();
      if (trimmedStatus === '✓') {
        test.status = 'passed';
        test.duration = duration ? parseInt(duration) : undefined;
      } else if (trimmedStatus === '✗' || trimmedStatus === '×') {
        test.status = 'failed';
        test.duration = duration ? parseInt(duration) : undefined;
      } else if (trimmedStatus === '○') {
        test.status = 'skipped';
        test.duration = duration ? parseInt(duration) : undefined;
      } else {
        test.status = 'running';
      }

      updatedTest = test;
    }

    // Look for describe/it block patterns in verbose output
    const describeItRegex = /^\s*(✓|✗|○)\s+(.+)/gm;
    let describeMatch;
    while ((describeMatch = describeItRegex.exec(output)) !== null) {
      const [, status, testDescription] = describeMatch;
      const testId = `${testDescription.trim().replace(/\s+/g, '-').toLowerCase()}`;
      
      let test = tests.find(t => t.id === testId);
      if (!test) {
        test = {
          id: testId,
          name: testDescription.trim(),
          description: testDescription.trim(),
          status: 'pending',
          output: '',
          metadata: sessionId ? { sessionId } : {}
        };
        tests.push(test);
      }

      if (status === '✓') {
        test.status = 'passed';
      } else if (status === '✗') {
        test.status = 'failed';
      } else if (status === '○') {
        test.status = 'skipped';
      }

      updatedTest = test;
    }

    // Parse console.log output for AI prompts and responses
    if (isFinalParse) {
      this.extractAIDetails(output, tests);
    }

    return { individualTests: tests, updatedTest };
  }

  /**
   * Extract AI prompts and responses from console.log output
   */
  private extractAIDetails(output: string, tests: IndividualTest[]): void {
    const lines = output.split('\n');
    let currentTest: IndividualTest | null = null;
    let captureMode: 'prompt' | 'response' | null = null;
    let captureBuffer: string[] = [];

    for (const line of lines) {
      // Identify which test we're in based on console.log patterns
      if (line.includes('✅') && line.includes('test')) {
        const testName = line.replace(/.*✅\s*/, '').trim();
        currentTest = tests.find(t => t.name.includes(testName) || testName.includes(t.name)) || null;
        captureMode = null;
        captureBuffer = [];
      }

      // Look for AI prompt patterns
      if (line.includes('AI call') || line.includes('prompt:') || line.includes('input:')) {
        captureMode = 'prompt';
        captureBuffer = [line];
        continue;
      }

      // Look for AI response patterns
      if (line.includes('response:') || line.includes('result:') || line.includes('output:')) {
        if (currentTest && captureMode === 'prompt' && captureBuffer.length > 0) {
          currentTest.aiPrompt = captureBuffer.join('\n');
        }
        captureMode = 'response';
        captureBuffer = [line];
        continue;
      }

      // Continue capturing if we're in a capture mode
      if (captureMode && line.trim()) {
        captureBuffer.push(line);
      } else if (captureMode && !line.trim()) {
        // End of capture
        if (currentTest) {
          if (captureMode === 'prompt') {
            currentTest.aiPrompt = captureBuffer.join('\n');
          } else if (captureMode === 'response') {
            currentTest.aiResponse = captureBuffer.join('\n');
          }
        }
        captureMode = null;
        captureBuffer = [];
      }
    }

    // Handle any remaining capture buffer
    if (currentTest && captureMode && captureBuffer.length > 0) {
      if (captureMode === 'prompt') {
        currentTest.aiPrompt = captureBuffer.join('\n');
      } else if (captureMode === 'response') {
        currentTest.aiResponse = captureBuffer.join('\n');
      }
    }
  }

  /**
   * Run multiple test files
   */
  async runTests(testFiles: string[]): Promise<TestSuiteResults> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    // Start a new session if none exists
    if (!this.currentSessionId) {
      this.startTestSession({ testFiles });
    }

    // Set a suite-level session ID for all tests in this run
    const suiteSessionId = `test-suite-${Date.now()}`;
    console.log(`🧪 Running test suite with session ID: ${suiteSessionId}`);

    for (const testFile of testFiles) {
      try {
        const result = await this.runTest(testFile);
        results.push(result);
      } catch (error) {
        const failedResult: TestResult = {
          testFile,
          status: 'failed',
          output: '',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          passed: 0,
          failed: 1,
          total: 1,
          individualTests: []
        };
        results.push(failedResult);
        this.broadcastTestResult(failedResult);
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    const summary = {
      total: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      duration,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString()
    };

    const suiteResults: TestSuiteResults = {
      files: results,
      summary
    };

    this.broadcastSuiteComplete(suiteResults);
    return suiteResults;
  }

  /**
   * Run all available tests
   */
  async runAllTests(): Promise<TestSuiteResults> {
    const existingTests = this.testFiles
      .filter(f => f.exists)
      .map(f => f.name);
    
    return this.runTests(existingTests);
  }

  /**
   * Get cached result for a test
   */
  getResult(testFile: string): TestResult | undefined {
    return this.results.get(testFile);
  }

  /**
   * Get all cached results
   */
  getAllResults(): TestResult[] {
    return Array.from(this.results.values());
  }

  /**
   * Subscribe to test result updates (local listeners only)
   */
  onTestUpdate(listener: (result: TestResult) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Unsubscribe from test result updates
   */
  offTestUpdate(listener: (result: TestResult) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Export test results to file
   */
  exportResults(format: 'json' | 'html' = 'json'): string {
    const results = this.getAllResults();
    
    if (format === 'json') {
      const output = {
        timestamp: new Date().toISOString(),
        results,
        summary: {
          total: results.length,
          passed: results.filter(r => r.status === 'passed').length,
          failed: results.filter(r => r.status === 'failed').length,
        }
      };
      
      const filePath = join(process.cwd(), `ai-test-results-${Date.now()}.json`);
      writeFileSync(filePath, JSON.stringify(output, null, 2));
      return filePath;
    }

    // HTML format
    const html = this.generateHTMLReport(results);
    const filePath = join(process.cwd(), `ai-test-results-${Date.now()}.html`);
    writeFileSync(filePath, html);
    return filePath;
  }

  /**
   * Parse Jest output to extract test statistics
   */
  private parseJestOutput(output: string): { passed: number; failed: number; total: number; skipped: number } {
    const testSummaryMatch = output.match(/Tests:\s*(?:(\d+)\s*passed[,\s]*)?(?:(\d+)\s*failed[,\s]*)?(?:(\d+)\s*total)?(?:,\s*(\d+)\s*skipped)?/);
    
    if (testSummaryMatch) {
      const passed = parseInt(testSummaryMatch[1] || '0');
      const failed = parseInt(testSummaryMatch[2] || '0');
      const total = parseInt(testSummaryMatch[3] || '0');
      const skipped = parseInt(testSummaryMatch[4] || '0');
      return { passed, failed, total, skipped };
    }

    // Fallback: count ✓ and ✗ symbols
    const passedCount = (output.match(/✓/g) || []).length;
    const failedCount = (output.match(/✗/g) || []).length;
    
    return {
      passed: passedCount,
      failed: failedCount,
      total: passedCount + failedCount,
      skipped: 0 // No direct count for skipped in this fallback
    };
  }

  /**
   * Generate HTML report
   */
  private generateHTMLReport(results: TestResult[]): string {
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const total = results.length;

    return `
<!DOCTYPE html>
<html>
<head>
    <title>AI Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border-radius: 8px; flex: 1; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric.passed { border-left: 4px solid #4CAF50; }
        .metric.failed { border-left: 4px solid #f44336; }
        .metric.total { border-left: 4px solid #2196F3; }
        .test-results { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .test-item { border-bottom: 1px solid #eee; padding: 20px; }
        .test-item:last-child { border-bottom: none; }
        .test-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .test-name { font-weight: bold; font-size: 1.1em; }
        .test-status { padding: 4px 12px; border-radius: 4px; color: white; font-size: 0.9em; }
        .test-status.passed { background: #4CAF50; }
        .test-status.failed { background: #f44336; }
        .test-stats { color: #666; font-size: 0.9em; margin: 5px 0; }
        .test-output { background: #f8f8f8; padding: 15px; border-radius: 4px; margin-top: 10px; font-family: monospace; font-size: 0.9em; white-space: pre-wrap; max-height: 300px; overflow-y: auto; }
        .error { color: #d32f2f; }
    </style>
</head>
<body>
    <div class="header">
        <h1>AI Test Results</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>

    <div class="summary">
        <div class="metric total">
            <h3>Total Tests</h3>
            <p style="font-size: 2em; margin: 0;">${total}</p>
        </div>
        <div class="metric passed">
            <h3>Passed</h3>
            <p style="font-size: 2em; margin: 0;">${passed}</p>
        </div>
        <div class="metric failed">
            <h3>Failed</h3>
            <p style="font-size: 2em; margin: 0;">${failed}</p>
        </div>
    </div>

    <div class="test-results">
        ${results.map(result => `
            <div class="test-item">
                <div class="test-header">
                    <span class="test-name">${result.testFile}</span>
                    <span class="test-status ${result.status}">${result.status.toUpperCase()}</span>
                </div>
                <div class="test-stats">
                    ${result.duration ? `Duration: ${result.duration}ms` : ''} | 
                    Passed: ${result.passed} | 
                    Failed: ${result.failed} | 
                    Total: ${result.total}
                </div>
                ${result.error ? `<div class="error">Error: ${result.error}</div>` : ''}
                <div class="test-output">${result.output}</div>
            </div>
        `).join('')}
    </div>
</body>
</html>
    `;
  }

  /**
   * Notify all listeners of test result updates
   */
  private notifyListeners(result: TestResult): void {
    this.listeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        console.error('Error notifying test listener:', error);
      }
    });
  }
}

// Export singleton instance
export const realTestRunner = new RealTestRunner();
export default realTestRunner; 
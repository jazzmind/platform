/**
 * RFP Processing Service
 * 
 * Specialized service for processing Request for Proposal (RFP) documents
 * when uploaded to chat. Handles long documents with token limit checking,
 * summarization, opportunity matching, and enhanced semantic analysis.
 * 
 * Extends the existing documentProcessing.ts infrastructure with RFP-specific logic.
 */

import { AIService } from './aiService';
import { z } from 'zod';
import { MODELS } from './models';

// Types
export interface RFPProcessingOptions {
  file: File;
  uploadedBy: string;
  progressReporter?: (progress: RFPProcessingProgress) => Promise<void>;
  organizationId?: string;
  maxTokens?: number;
  enableOpportunityMatching?: boolean;
  createNewOpportunityIfNoMatch?: boolean;
}

export interface RFPProcessingProgress {
  stage: 'size_check' | 'extraction' | 'summarization' | 'opportunity_matching' | 'chunking' | 'semantic_analysis' | 'entity_extraction' | 'completing';
  current: number;
  total: number;
  message: string;
  metadata?: {
    fileSize?: number;
    estimatedTokens?: number;
    chunkCount?: number;
    opportunityMatches?: number;
    entitiesFound?: number;
  };
}

export interface RFPProcessingResult {
  documentSummary: {
    title: string;
    executiveSummary: string;
    keyRequirements: string[];
    projectScope: string;
    timeline?: string;
    budget?: string;
    submissionDeadline?: string;
    contactInfo?: {
      primaryContact?: string;
      email?: string;
      organization?: string;
    };
  };
  opportunityRecommendation: {
    shouldCreateNew: boolean;
    matchedOpportunities: Array<{
      id: string;
      title: string;
      confidence: number;
      reasoning: string;
    }>;
    recommendedTitle?: string;
    recommendedDescription?: string;
    estimatedValue?: number;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  };
  semanticAnalysis: {
    documentType: 'rfp' | 'tender' | 'request_for_information' | 'statement_of_work' | 'other';
    confidence: number;
    keyTopics: string[];
    technicalRequirements: string[];
    complianceRequirements: string[];
    evaluationCriteria: string[];
  };
  extractedEntities: {
    organizations: Array<{
      name: string;
      role: 'client' | 'partner' | 'vendor' | 'other';
      confidence: number;
      contact?: string;
    }>;
    contacts: Array<{
      name: string;
      role?: string;
      email?: string;
      phone?: string;
      organization?: string;
    }>;
    locations: string[];
    dates: Array<{
      date: string;
      type: 'deadline' | 'start_date' | 'end_date' | 'milestone';
      description: string;
    }>;
    amounts: Array<{
      amount: string;
      type: 'budget' | 'estimate' | 'penalty' | 'other';
      description: string;
    }>;
  };
  processingMetadata: {
    originalFileSize: number;
    estimatedTokens: number;
    actualTokensUsed: number;
    chunkCount: number;
    processingTime: number;
    warnings: string[];
  };
}

// Zod schemas for AI responses
const rfpSummarySchema = z.object({
  title: z.string(),
  executiveSummary: z.string(),
  keyRequirements: z.array(z.string()),
  projectScope: z.string(),
  timeline: z.string().optional(),
  budget: z.string().optional(),
  submissionDeadline: z.string().optional(),
  contactInfo: z.object({
    primaryContact: z.string().optional(),
    email: z.string().optional(),
    organization: z.string().optional(),
  }).optional(),
});

const opportunityMatchingSchema = z.object({
  shouldCreateNew: z.boolean(),
  matches: z.array(z.object({
    opportunityId: z.string(),
    title: z.string(),
    confidence: z.number().min(0).max(100),
    reasoning: z.string(),
  })),
  newOpportunityRecommendation: z.object({
    title: z.string(),
    description: z.string(),
    estimatedValue: z.number().optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
  }).optional(),
});

const semanticAnalysisSchema = z.object({
  documentType: z.enum(['rfp', 'tender', 'request_for_information', 'statement_of_work', 'other']),
  confidence: z.number().min(0).max(100),
  keyTopics: z.array(z.string()),
  technicalRequirements: z.array(z.string()),
  complianceRequirements: z.array(z.string()),
  evaluationCriteria: z.array(z.string()),
});

const entityExtractionSchema = z.object({
  organizations: z.array(z.object({
    name: z.string(),
    role: z.enum(['client', 'partner', 'vendor', 'other']),
    confidence: z.number().min(0).max(100),
    contact: z.string().optional(),
  })),
  contacts: z.array(z.object({
    name: z.string(),
    role: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    organization: z.string().optional(),
  })),
  locations: z.array(z.string()),
  dates: z.array(z.object({
    date: z.string(),
    type: z.enum(['deadline', 'start_date', 'end_date', 'milestone']),
    description: z.string(),
  })),
  amounts: z.array(z.object({
    amount: z.string(),
    type: z.enum(['budget', 'estimate', 'penalty', 'other']),
    description: z.string(),
  })),
});

export class RFPProcessingService extends AIService {
  private readonly DEFAULT_MAX_TOKENS = 100000; // ~25,000 words

  constructor() {
    super({
      maxRetries: 3,
      timeoutMs: 300000, // 5 minutes for complex RFP processing
      enableLogging: true,
      enableDebugLogging: true,
      logPrefix: 'RFPProcessing',
    });
  }

  /**
   * Main RFP processing pipeline
   */
  async processRFPDocument(options: RFPProcessingOptions): Promise<RFPProcessingResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    let actualTokensUsed = 0;

    this.log(`Starting RFP processing for file: ${options.file.name}`);

    try {
      // Step 1: Size and token limit checking (5%)
      await this.reportProgress(options, {
        stage: 'size_check',
        current: 5,
        total: 100,
        message: 'Checking document size and token limits...',
        metadata: { fileSize: options.file.size }
      });

      // Step 2: Extract content and check token limits (15%)
      await this.reportProgress(options, {
        stage: 'extraction',
        current: 15,
        total: 100,
        message: 'Extracting content from RFP document...'
      });

      const { extractContentWithTokenManagement, checkTokenLimits } = await import('./contentExtraction');
      const { summarizeComplete } = await import('./documentSummarization');
      
      const fileBuffer = Buffer.from(await options.file.arrayBuffer());
      let extractedContent = await extractContentWithTokenManagement(
        fileBuffer, 
        this.determineFileType(options.file.type, options.file.name),
        {
          maxTokens: options.maxTokens || this.DEFAULT_MAX_TOKENS,
          enableChunking: false, // We'll handle chunking ourselves
          fileId: undefined
        }
      );

      // Check if we need to do chunking and summarization
      const tokenCheck = checkTokenLimits(extractedContent.text, options.maxTokens);
      
      if (tokenCheck.requiresChunking) {
        await this.reportProgress(options, {
          stage: 'chunking',
          current: 20,
          total: 100,
          message: 'Processing large document with intelligent summarization...'
        });

        // Use the new document summarization service
        const summaryResult = await summarizeComplete(extractedContent.text, {
          filename: options.file.name,
                     progressCallback: async (progress) => {
             await this.reportProgress(options, {
               stage: 'summarization',
               current: 20 + Math.round(progress.current * 0.15), // 20-35%
               total: 100,
               message: progress.message
             });
           }
        });
        
        // Convert summary to condensed text format
        const condensedText = `${summaryResult.executiveSummary}\n\n` +
          `Key Points:\n${summaryResult.keyPoints.map(p => `- ${p}`).join('\n')}\n\n` +
          `Main Topics: ${summaryResult.mainTopics.join(', ')}` +
          (summaryResult.recommendations ? `\n\nRecommendations:\n${summaryResult.recommendations.map(r => `- ${r}`).join('\n')}` : '');
        
        extractedContent = {
          text: condensedText,
          metadata: {
            ...extractedContent.metadata,
            wasChunked: true,
            originalTokenCount: tokenCheck.estimatedTokens,
            chunkCount: Math.ceil(extractedContent.text.length / 8000)
          }
        };
        
        warnings.push(`Document was summarized from ${tokenCheck.estimatedTokens.toLocaleString()} tokens to ~${Math.ceil(condensedText.length / 4).toLocaleString()} tokens`);
      }

      // Step 3: Generate document summary (35%)
      await this.reportProgress(options, {
        stage: 'summarization',
        current: 35,
        total: 100,
        message: 'Creating comprehensive RFP summary...'
      });

      const { summary, tokensUsed: summaryTokens } = await this.generateRFPSummary(
        extractedContent.text,
        options.file.name
      );
      actualTokensUsed += summaryTokens;

      // Step 4: Opportunity matching (55%)
      await this.reportProgress(options, {
        stage: 'opportunity_matching',
        current: 55,
        total: 100,
        message: 'Analyzing opportunity matches...'
      });

      const { opportunityRecommendation, tokensUsed: matchingTokens } = await this.analyzeOpportunityMatching(
        extractedContent.text,
        summary,
        options.organizationId,
        options.enableOpportunityMatching !== false
      );
      actualTokensUsed += matchingTokens;

      // Step 5: Semantic analysis (75%)
      await this.reportProgress(options, {
        stage: 'semantic_analysis',
        current: 75,
        total: 100,
        message: 'Performing semantic analysis...'
      });

      const { semanticAnalysis, tokensUsed: semanticTokens } = await this.performSemanticAnalysis(
        extractedContent.text
      );
      actualTokensUsed += semanticTokens;

      // Step 6: Entity extraction (90%)
      await this.reportProgress(options, {
        stage: 'entity_extraction',
        current: 90,
        total: 100,
        message: 'Extracting organizations, contacts, and key data...'
      });

      const { extractedEntities, tokensUsed: entityTokens } = await this.extractRFPEntities(
        extractedContent.text
      );
      actualTokensUsed += entityTokens;

      // Step 7: Completion (100%)
      await this.reportProgress(options, {
        stage: 'completing',
        current: 100,
        total: 100,
        message: 'RFP processing complete!',
        metadata: {
          opportunityMatches: opportunityRecommendation.matchedOpportunities.length,
          entitiesFound: extractedEntities.organizations.length + extractedEntities.contacts.length
        }
      });

      const processingTime = Date.now() - startTime;
      this.log(`RFP processing completed in ${processingTime}ms, used ${actualTokensUsed} tokens`);

      return {
        documentSummary: summary,
        opportunityRecommendation,
        semanticAnalysis,
        extractedEntities,
        processingMetadata: {
          originalFileSize: options.file.size,
          estimatedTokens: tokenCheck.estimatedTokens,
          actualTokensUsed,
          chunkCount: extractedContent.metadata?.chunkCount || 1,
          processingTime,
          warnings
        }
      };

    } catch (error) {
      this.log(`RFP processing failed: ${error}`, 'error');
      throw error;
    }
  }





  /**
   * Generate comprehensive RFP summary
   */
  private async generateRFPSummary(content: string, filename: string): Promise<{
    summary: RFPProcessingResult['documentSummary'];
    tokensUsed: number;
  }> {
    const systemPrompt = `You are an expert RFP analyst specializing in extracting key information from Request for Proposal documents.

Your task is to analyze the RFP content and create a comprehensive summary that includes:
1. Document title and executive summary
2. Key requirements and project scope
3. Timeline, budget, and deadline information
4. Primary contact information

Focus on actionable business intelligence that would help in proposal development and opportunity assessment.`;

    const userPrompt = `Analyze this RFP document and provide a comprehensive summary:

**Filename:** ${filename}
**Content:** ${content.substring(0, 50000)} ${content.length > 50000 ? '[... truncated for analysis]' : ''}

Extract the key information needed for proposal development and opportunity assessment.`;

    const result = await this.callAI(
      MODELS.reasoning,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      rfpSummarySchema,
      'generateRFPSummary',
      'rfp_summarization'
    );

    return {
      summary: result,
      tokensUsed: this.estimateTokenUsage(systemPrompt + userPrompt)
    };
  }

  /**
   * Analyze opportunity matching for the RFP
   */
  private async analyzeOpportunityMatching(
    content: string,
    summary: RFPProcessingResult['documentSummary'],
    organizationId?: string,
    enableMatching: boolean = true
  ): Promise<{
    opportunityRecommendation: RFPProcessingResult['opportunityRecommendation'];
    tokensUsed: number;
  }> {
    if (!enableMatching) {
      return {
        opportunityRecommendation: {
          shouldCreateNew: true,
          matchedOpportunities: [],
          recommendedTitle: summary.title,
          recommendedDescription: summary.executiveSummary,
          priority: 'high'
        },
        tokensUsed: 0
      };
    }

    // Get existing opportunities for matching
    let existingOpportunities: Array<{ id: string; title: string; description?: string }> = [];
    
    if (organizationId) {
      try {
        const { getOpportunitiesByOrganizationId } = await import('../database');
        const searchResults = await getOpportunitiesByOrganizationId(organizationId);
        existingOpportunities = searchResults.slice(0, 10).map((opp: { id: string; title?: string; description?: string }) => ({
          id: opp.id,
          title: opp.title || 'Untitled Opportunity',
          description: opp.description || ''
        }));
      } catch (error) {
        this.log(`Failed to fetch opportunities for matching: ${error}`, 'warn');
      }
    }

    const systemPrompt = `You are an expert business analyst specializing in opportunity management and RFP analysis.

Your task is to analyze an RFP and determine:
1. Whether it matches any existing opportunities in the pipeline
2. If a new opportunity should be created
3. Recommended opportunity details (title, description, value, priority)

Focus on business value, strategic alignment, and avoiding duplicates while ensuring nothing falls through the cracks.`;

    const userPrompt = `Based on this RFP analysis, determine opportunity matching:

**RFP Summary:**
- Title: ${summary.title}
- Executive Summary: ${summary.executiveSummary}
- Key Requirements: ${summary.keyRequirements.join(', ')}
- Project Scope: ${summary.projectScope}
- Timeline: ${summary.timeline || 'Not specified'}
- Budget: ${summary.budget || 'Not specified'}

**Existing Opportunities:**
${existingOpportunities.length > 0 
  ? existingOpportunities.map(opp => `- ${opp.title} (ID: ${opp.id})\n  Description: ${opp.description}`).join('\n')
  : 'No existing opportunities found'
}

Analyze potential matches and provide recommendations for opportunity management.`;

    const result = await this.callAI(
      MODELS.reasoning,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      opportunityMatchingSchema,
      'analyzeOpportunityMatching',
      'opportunity_matching'
    );

    return {
      opportunityRecommendation: {
        shouldCreateNew: result.shouldCreateNew,
        matchedOpportunities: result.matches.map(match => ({
          id: match.opportunityId,
          title: match.title,
          confidence: match.confidence,
          reasoning: match.reasoning
        })),
        recommendedTitle: result.newOpportunityRecommendation?.title || summary.title,
        recommendedDescription: result.newOpportunityRecommendation?.description || summary.executiveSummary,
        estimatedValue: result.newOpportunityRecommendation?.estimatedValue,
        priority: result.newOpportunityRecommendation?.priority || 'high'
      },
      tokensUsed: this.estimateTokenUsage(systemPrompt + userPrompt)
    };
  }

  /**
   * Perform semantic analysis on the RFP
   */
  private async performSemanticAnalysis(content: string): Promise<{
    semanticAnalysis: RFPProcessingResult['semanticAnalysis'];
    tokensUsed: number;
  }> {
    const systemPrompt = `You are an expert document analyst specializing in procurement and RFP analysis.

Analyze the document to identify:
1. Document type (RFP, tender, RFI, SOW, etc.)
2. Key topics and themes
3. Technical requirements
4. Compliance and regulatory requirements
5. Evaluation criteria

Provide structured analysis for proposal development and compliance assessment.`;

    const userPrompt = `Perform semantic analysis on this document:

**Content:** ${content.substring(0, 30000)} ${content.length > 30000 ? '[... truncated for analysis]' : ''}

Identify the document type, key topics, requirements, and evaluation criteria.`;

    const result = await this.callAI(
      MODELS.reasoning,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      semanticAnalysisSchema,
      'performSemanticAnalysis',
      'semantic_analysis'
    );

    return {
      semanticAnalysis: {
        documentType: result.documentType,
        confidence: result.confidence,
        keyTopics: result.keyTopics,
        technicalRequirements: result.technicalRequirements,
        complianceRequirements: result.complianceRequirements,
        evaluationCriteria: result.evaluationCriteria
      },
      tokensUsed: this.estimateTokenUsage(systemPrompt + userPrompt)
    };
  }

  /**
   * Extract entities from RFP content
   */
  private async extractRFPEntities(content: string): Promise<{
    extractedEntities: RFPProcessingResult['extractedEntities'];
    tokensUsed: number;
  }> {
    const systemPrompt = `You are an expert entity extraction specialist focused on RFP and procurement documents.

Extract key entities including:
1. Organizations (clients, partners, vendors) with roles
2. Contacts (names, roles, email, phone)
3. Locations (addresses, project sites)
4. Important dates (deadlines, milestones, project dates)
5. Financial amounts (budgets, estimates, penalties)

Focus on accuracy and business relevance for proposal development.`;

    const userPrompt = `Extract entities from this RFP document:

**Content:** ${content.substring(0, 40000)} ${content.length > 40000 ? '[... truncated for analysis]' : ''}

Identify all relevant organizations, contacts, locations, dates, and amounts.`;

    const result = await this.callAI(
      MODELS.reasoning,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      entityExtractionSchema,
      'extractRFPEntities',
      'entity_extraction'
    );

    return {
      extractedEntities: {
        organizations: result.organizations.map(org => ({
          name: org.name,
          role: org.role,
          confidence: org.confidence,
          contact: org.contact
        })),
        contacts: result.contacts,
        locations: result.locations,
        dates: result.dates,
        amounts: result.amounts
      },
      tokensUsed: this.estimateTokenUsage(systemPrompt + userPrompt)
    };
  }

  // Helper methods
  private async reportProgress(options: RFPProcessingOptions, progress: RFPProcessingProgress): Promise<void> {
    if (options.progressReporter) {
      await options.progressReporter(progress);
    }
  }

  private determineFileType(mimeType: string, filename: string): string {
    if (mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
      return 'pdf';
    }
    if (mimeType.startsWith('text/') || filename.toLowerCase().endsWith('.txt') || filename.toLowerCase().endsWith('.md')) {
      return 'text';
    }
    if (mimeType.startsWith('image/')) {
      return 'image';
    }
    return 'text'; // Default fallback
  }

  private estimateTokenUsage(text: string): number {
    return Math.ceil(text.length / 4); // ~4 characters per token
  }
}

// Export singleton instance
export const rfpProcessingService = new RFPProcessingService(); 
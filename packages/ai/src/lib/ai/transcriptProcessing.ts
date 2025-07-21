import { AIService } from './aiService';
import { MODELS } from './models';
import { z } from 'zod';

// Add SSE imports
import { SSEManager } from '../sse/sseManager';

// Transcript analysis response schema
const transcriptAnalysisSchema = z.object({
  summary: z.string(),
  keyTopics: z.array(z.string()),
  actionItems: z.array(z.string()),
  participants: z.array(z.object({
    identifier: z.string(),
    role: z.string().nullable(),
    keyPoints: z.array(z.string())
  })),
  businessContext: z.object({
    projectType: z.string().nullable(),
    budget: z.string().nullable(),
    timeline: z.string().nullable(),
    requirements: z.array(z.string()),
    challenges: z.array(z.string()),
    opportunities: z.array(z.string())
  }),
  confidence: z.number().min(0).max(100),
  recommendedActions: z.array(z.object({
    action: z.string(),
    reason: z.string(),
    priority: z.enum(['high', 'medium', 'low'])
  }))
});

// Opportunity matching schema
const opportunityMatchingSchema = z.object({
  matches: z.array(z.object({
    opportunityId: z.string(),
    relevanceScore: z.number().min(0).max(100),
    reasoning: z.string(),
    suggestedConnection: z.string()
  })),
  newOpportunityRecommendation: z.object({
    shouldCreate: z.boolean(),
    title: z.string().nullable(),
    description: z.string().nullable(),
    estimatedValue: z.string().nullable(),
    priority: z.enum(['high', 'medium', 'low']).nullable()
  }).nullable()
});

export interface TranscriptAnalysisResult {
  summary: string;
  keyTopics: string[];
  actionItems: string[];
  participants: Array<{
    identifier: string;
    role: string | null;
    keyPoints: string[];
  }>;
  businessContext: {
    projectType: string | null;
    budget: string | null;
    timeline: string | null;
    requirements: string[];
    challenges: string[];
    opportunities: string[];
  };
  confidence: number;
  recommendedActions: Array<{
    action: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface OpportunityMatchingResult {
  matches: Array<{
    opportunityId: string;
    relevanceScore: number;
    reasoning: string;
    suggestedConnection: string;
  }>;
  newOpportunityRecommendation: {
    shouldCreate: boolean;
    title: string | null;
    description: string | null;
    estimatedValue: string | null;
    priority: 'high' | 'medium' | 'low' | null;
  } | null;
}

export interface TranscriptProcessingOptions {
  filename?: string;
  existingOpportunities?: Array<{
    id: string;
    title: string;
    description?: string;
    status?: string;
    value?: number;
  }>;
  organizationContext?: string;
  organizationId?: string; // Added for vector search
  sseSessionId?: string; // Add SSE session ID for progress updates
}

class TranscriptProcessingService extends AIService {
  private broadcastProgress(
    sseSessionId: string,
    stage: string,
    progress: number,
    message: string,
    data?: Record<string, unknown>
  ): void {
    try {
      SSEManager.broadcastToSession(sseSessionId, {
        type: 'transcript-progress',
        data: {
          stage,
          progress,
          message,
          timestamp: new Date().toISOString(),
          ...data
        }
      });
    } catch (error) {
      console.warn('Failed to broadcast transcript progress:', error);
    }
  }

  constructor() {
    super({
      maxRetries: 3,
      timeoutMs: 120000,
      enableLogging: true,
      enableDebugLogging: true
    });
  }

  /**
   * Analyze transcript content and extract key insights
   */
  async analyzeTranscript(
    transcriptContent: string,
    options: TranscriptProcessingOptions = {}
  ): Promise<TranscriptAnalysisResult> {
    this.log('Starting transcript analysis');

    // Broadcast progress if SSE session provided
    if (options.sseSessionId) {
      this.broadcastProgress(
        options.sseSessionId,
        'analysis',
        10,
        'Starting transcript analysis...'
      );
    }

    const systemPrompt = `You are an expert transcript analyst specializing in business meetings, calls, and interviews.

Your task is to analyze transcript content and extract key insights, including:
- Meeting summary and main topics discussed
- Participants and their key contributions
- Action items and next steps
- Business context (project type, budget, timeline, requirements)
- Challenges and opportunities identified
- Recommended follow-up actions

Analyze the transcript thoroughly and provide structured insights that can help with:
- Opportunity identification and matching
- Proposal development
- Client relationship management
- Project planning and execution

Focus on actionable insights and business value.`;

    const userPrompt = `Analyze this transcript and extract key insights:

**Filename:** ${options.filename || 'Unknown'}
**Content Length:** ${transcriptContent.length} characters

**Transcript Content:**
${transcriptContent}

${options.organizationContext ? `**Organization Context:** ${options.organizationContext}` : ''}

Please provide a comprehensive analysis including:
1. Executive summary of the meeting/conversation
2. Key topics and themes discussed
3. Identified participants and their roles
4. Action items and next steps
5. Business context (requirements, budget, timeline)
6. Challenges and opportunities identified
7. Recommended actions for follow-up

Be thorough but concise, focusing on actionable insights.`;

    // Broadcast progress before AI call
    if (options.sseSessionId) {
      this.broadcastProgress(
        options.sseSessionId,
        'analysis',
        20,
        'Processing transcript with AI...'
      );
    }

    const result = await this.callAI(
      MODELS.reasoning,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      transcriptAnalysisSchema,
      'analyzeTranscript',
      'transcript_analysis'
    );

    // Broadcast completion
    if (options.sseSessionId) {
      this.broadcastProgress(
        options.sseSessionId,
        'analysis',
        40,
        'Transcript analysis complete',
        { analysisComplete: true, confidence: result.confidence }
      );
    }

    this.log(`Transcript analysis complete with ${result.confidence}% confidence`);
    return result;
  }

  /**
   * Search for relevant opportunities using vector similarity
   */
  async searchRelevantOpportunities(
    transcriptContent: string,
    organizationId?: string,
    limit: number = 10,
    sseSessionId?: string
  ): Promise<Array<{
    id: string;
    title: string;
    description?: string;
    status?: string;
    value?: number;
    similarity?: number;
  }>> {
    try {
      // Broadcast progress
      if (sseSessionId) {
        this.broadcastProgress(
          sseSessionId,
          'search',
          45,
          'Searching for relevant opportunities using vector search...'
        );
      }

      // Use vector search to find relevant opportunities
      const { searchEntitiesVector } = await import('./entityIndexing');
      
      // Create search query from transcript key topics
      const searchQuery = `${transcriptContent.substring(0, 2000)} opportunity business project`;
      
      // Search for similar opportunities
      const vectorResults = await searchEntitiesVector(searchQuery, ['opportunity'], limit);
      
      console.log(`🔍 Vector search found ${vectorResults.length} potentially relevant opportunities`);
      
      if (vectorResults.length === 0) {
              // Fallback: get recent opportunities if no vector matches
      const { getOpportunitiesByOrganizationId } = await import('../database');
      if (organizationId) {
        const allOpportunities = await getOpportunitiesByOrganizationId(organizationId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fallbackResults = allOpportunities.slice(0, limit).map((opp: any) => ({
          id: opp.id,
          title: opp.title || 'Untitled Opportunity',
          description: undefined,
          status: opp.status,
          value: opp.estimatedValue
        }));

        if (sseSessionId) {
          this.broadcastProgress(
            sseSessionId,
            'search',
            60,
            `Found ${fallbackResults.length} opportunities from organization database`
          );
        }

        return fallbackResults;
      }
        
        if (sseSessionId) {
          this.broadcastProgress(
            sseSessionId,
            'search',
            60,
            'No relevant opportunities found'
          );
        }
        return [];
      }
      
      // Convert vector results to opportunity format
      const results = vectorResults.map(result => ({
        id: result.entityId,
        title: result.title || 'Untitled Opportunity', 
        description: undefined,
        status: result.metadata?.status as string,
        value: result.metadata?.estimatedValue as number,
        similarity: result.similarity
      }));

      // Broadcast completion
      if (sseSessionId) {
        this.broadcastProgress(
          sseSessionId,
          'search',
          60,
          `Found ${results.length} relevant opportunities from vector search`
        );
      }

      return results;
      
    } catch (error) {
      console.error('Error in vector search for opportunities:', error);
      
      if (sseSessionId) {
        this.broadcastProgress(
          sseSessionId,
          'search',
          60,
          'Error searching opportunities, using fallback...'
        );
      }

      // Fallback: get recent opportunities
      try {
        const { getOpportunitiesByOrganizationId } = await import('../database');
        if (organizationId) {
          const allOpportunities = await getOpportunitiesByOrganizationId(organizationId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return allOpportunities.slice(0, limit).map((opp: any) => ({
            id: opp.id,
            title: opp.title || 'Untitled Opportunity',
            description: undefined,
            status: opp.status,
            value: opp.estimatedValue
          }));
        }
        return [];
      } catch (fallbackError) {
        console.error('Fallback opportunity retrieval failed:', fallbackError);
        return [];
      }
    }
  }

  /**
   * Match transcript to existing opportunities with improved relevance filtering
   */
  async matchToOpportunities(
    transcriptAnalysis: TranscriptAnalysisResult,
    existingOpportunities: Array<{
      id: string;
      title: string;
      description?: string;
      status?: string;
      value?: number;
    }>,
    sseSessionId?: string
  ): Promise<OpportunityMatchingResult> {
    this.log(`Matching transcript to ${existingOpportunities.length} existing opportunities`);

    // Broadcast progress
    if (sseSessionId) {
      this.broadcastProgress(
        sseSessionId,
        'matching',
        65,
        `Analyzing matches against ${existingOpportunities.length} opportunities...`
      );
    }

    const systemPrompt = `You are an expert business analyst specializing in opportunity matching and business development.

Your task is to analyze a transcript and match it against existing business opportunities.

For each opportunity, provide:
1. A relevance score (0-100) based on how well the transcript content aligns with the opportunity
2. Clear reasoning for the score
3. Specific connections between transcript content and the opportunity

Scoring criteria:
- 90-100: Direct match - same client, project type, or explicit mention
- 70-89: Strong alignment - similar business domain, requirements, or stakeholders  
- 50-69: Moderate alignment - related industry, complementary services
- 20-49: Weak alignment - tangential connections
- 0-19: No meaningful alignment

Focus on business value, strategic alignment, and practical connections.`;

    const userPrompt = `Based on this transcript analysis, match to existing opportunities:

**Transcript Summary:**
${transcriptAnalysis.summary}

**Key Topics:** ${transcriptAnalysis.keyTopics.join(', ')}

**Business Context:**
- Project Type: ${transcriptAnalysis.businessContext.projectType || 'Unknown'}
- Budget: ${transcriptAnalysis.businessContext.budget || 'Not specified'}
- Timeline: ${transcriptAnalysis.businessContext.timeline || 'Not specified'}
- Requirements: ${transcriptAnalysis.businessContext.requirements.join(', ')}

**Existing Opportunities to Match Against:**
${existingOpportunities.map(opp => `- ID: ${opp.id}
  Title: "${opp.title}"
  Status: ${opp.status || 'Active'}
  Value: ${opp.value ? `$${opp.value.toLocaleString()}` : 'Not specified'}
  Description: ${opp.description || 'No description available'}`).join('\n\n')}

Analyze each opportunity and provide relevance scoring with detailed reasoning.
Focus on business value and strategic alignment.`;

    const result = await this.callAI(
      MODELS.default,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      opportunityMatchingSchema,
      'matchToOpportunities',
      'opportunity_matching'
    );

    // Filter to only include meaningful matches (>20% relevance)
    const meaningfulMatches = result.matches.filter(match => match.relevanceScore >= 20);
    
    // Sort by relevance score descending and take top 5
    meaningfulMatches.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const topMatches = meaningfulMatches.slice(0, 5);

    // Broadcast completion
    if (sseSessionId) {
      this.broadcastProgress(
        sseSessionId,
        'matching',
        80,
        `Found ${topMatches.length} meaningful opportunity matches`,
        { matchesFound: topMatches.length }
      );
    }

    this.log(`Opportunity matching complete: ${topMatches.length} meaningful matches found (>20% relevance)`);
    
    return {
      ...result,
      matches: topMatches
    };
  }

  /**
   * Process transcript: analyze content and match to opportunities with vector search
   */
  async processTranscript(
    transcriptContent: string,
    options: TranscriptProcessingOptions = {}
  ): Promise<{
    analysis: TranscriptAnalysisResult;
    opportunityMatches?: OpportunityMatchingResult;
  }> {
    // Broadcast start
    if (options.sseSessionId) {
      this.broadcastProgress(
        options.sseSessionId,
        'starting',
        0,
        `Starting transcript processing for ${options.filename || 'document'}...`
      );
    }

    // Step 1: Analyze transcript content
    const analysis = await this.analyzeTranscript(transcriptContent, options);

    // Step 2: Use vector search to find relevant opportunities first
    let opportunityMatches: OpportunityMatchingResult | undefined;
    
    if (options.existingOpportunities && options.existingOpportunities.length > 0) {
      // Use provided opportunities (for backward compatibility)
      opportunityMatches = await this.matchToOpportunities(analysis, options.existingOpportunities, options.sseSessionId);
    } else if (options.organizationId) {
      // Use vector search to find relevant opportunities first
      const relevantOpportunities = await this.searchRelevantOpportunities(
        transcriptContent,
        options.organizationId,
        10,
        options.sseSessionId
      );
      
      if (relevantOpportunities.length > 0) {
        opportunityMatches = await this.matchToOpportunities(analysis, relevantOpportunities, options.sseSessionId);
      }
    }

    // Broadcast completion
    if (options.sseSessionId) {
      this.broadcastProgress(
        options.sseSessionId,
        'complete',
        100,
        'Transcript processing complete!',
        {
          analysisComplete: true,
          matchesFound: opportunityMatches?.matches?.length || 0,
          confidence: analysis.confidence
        }
      );
    }

    return {
      analysis,
      opportunityMatches
    };
  }
}

// Create singleton instance
const transcriptProcessingService = new TranscriptProcessingService();

// Export main functions
export async function analyzeTranscript(
  transcriptContent: string,
  options: TranscriptProcessingOptions = {}
): Promise<TranscriptAnalysisResult> {
  return transcriptProcessingService.analyzeTranscript(transcriptContent, options);
}

export async function matchToOpportunities(
  transcriptAnalysis: TranscriptAnalysisResult,
  existingOpportunities: Array<{
    id: string;
    title: string;
    description?: string;
    status?: string;
    value?: number;
  }>,
  sseSessionId?: string
): Promise<OpportunityMatchingResult> {
  return transcriptProcessingService.matchToOpportunities(transcriptAnalysis, existingOpportunities, sseSessionId);
}

export async function processTranscript(
  transcriptContent: string,
  options: TranscriptProcessingOptions = {}
): Promise<{
  analysis: TranscriptAnalysisResult;
  opportunityMatches?: OpportunityMatchingResult;
}> {
  return transcriptProcessingService.processTranscript(transcriptContent, options);
} 
import { AIService } from './aiService';
import { MODELS } from './models';
import { z } from 'zod';

// Feature flag for gradual rollout
const USE_UNIFIED_CLASSIFICATION = process.env.USE_UNIFIED_CLASSIFICATION === 'true';

// Unified response schema combining all classification needs
const unifiedClassificationSchema = z.object({
  documentType: z.enum(['rfp', 'requirements', 'proposal', 'ideation', 'reference', 'transcript', 'service_offering', 'methodology', 'case_study', 'testimonials', 'other']),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
  suggestedSections: z.array(z.string()),
  priority: z.enum(['high', 'medium', 'low']),
  keyTopics: z.array(z.string()),
  shouldUpdateSections: z.boolean(),
  // Additional metadata for comprehensive analysis
  metadata: z.object({
    wordCount: z.number(),
    hasFinancialInfo: z.boolean(),
    hasContactInfo: z.boolean(),
    hasDeadlines: z.boolean(),
    structureQuality: z.enum(['excellent', 'good', 'fair', 'poor'])
  }).optional()
});

export interface UnifiedClassificationResult {
  documentType: 'rfp' | 'requirements' | 'proposal' | 'ideation' | 'reference' | 'transcript' | 'service_offering' | 'methodology' | 'case_study' | 'testimonials' | 'other';
  confidence: number;
  reasoning: string;
  suggestedSections: string[];
  priority: 'high' | 'medium' | 'low';
  keyTopics: string[];
  shouldUpdateSections: boolean;
  metadata?: {
    wordCount: number;
    hasFinancialInfo: boolean;
    hasContactInfo: boolean;
    hasDeadlines: boolean;
    structureQuality: 'excellent' | 'good' | 'fair' | 'poor';
  };
}

/**
 * Unified Document Classification Service
 * Consolidates all document classification functionality from across the codebase
 */
class UnifiedDocumentClassifier extends AIService {
  constructor() {
    super({
      maxRetries: 3,
      timeoutMs: 45000,
      enableLogging: true,
      enableDebugLogging: true,
      logPrefix: 'DocumentClassifier',
    });
  }

  /**
   * Master document classification method
   * Replaces classifyDocument from fileClassification.ts, documentAnalysis.ts, and documentExtraction.ts
   */
  async classifyDocument(
    filename: string,
    extractedText: string,
    existingSections: Array<{ id: string; title: string; content?: string }> = [],
    options: {
      includeMetadata?: boolean;
      customPrompt?: string;
    } = {}
  ): Promise<UnifiedClassificationResult> {
    this.log(`Classifying document: ${filename} (${extractedText.length} chars)`);

    try {
      const systemPrompt = options.customPrompt || this.buildClassificationPrompt();
      const userPrompt = this.buildUserPrompt(filename, extractedText, existingSections, options.includeMetadata);

      const result = await this.callAI(
        MODELS.reasoning,
        [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        unifiedClassificationSchema,
        `classifyDocument(${filename})`,
        'classification'
      );

      this.log(`Classification complete: ${result.documentType} (confidence: ${result.confidence}%)`);
      
      return {
        documentType: result.documentType,
        confidence: Math.min(100, Math.max(0, result.confidence)),
        reasoning: result.reasoning || 'Document classification completed.',
        suggestedSections: result.suggestedSections || [],
        priority: result.priority,
        keyTopics: result.keyTopics || [],
        shouldUpdateSections: Boolean(result.shouldUpdateSections),
        metadata: result.metadata
      };

    } catch (error) {
      this.log(`Classification failed: ${error}`, 'warn');
      return this.generateFallbackClassification(filename, extractedText);
    }
  }

  /**
   * Quick document type detection (keyword-based fallback)
   * Replaces detectDocumentType from documentAnalysis.ts
   */
  detectDocumentType(content: string): UnifiedClassificationResult['documentType'] {
    const lowerContent = content.toLowerCase();
    
    // Check for transcript-specific patterns first
    const transcriptPatterns = [
      /speaker\s*\d+\s*\(/i,           // "Speaker 1 (", "Speaker 2 ("
      /\(\d{1,2}:\d{2}\)/,             // "(00:00)", "(12:34)"
      /\[\d{1,2}:\d{2}:\d{2}\]/,       // "[00:12:34]"
      /^[A-Z][a-z]+\s*\d*:\s/m,        // "John: ", "Speaker1: "
      /meeting transcript/i,
      /call transcript/i,
      /interview transcript/i
    ];
    
    const transcriptMatches = transcriptPatterns.filter(pattern => 
      pattern.test(content)
    ).length;
    
    // Also check for multiple speaker indicators
    const speakerIndicators = content.match(/speaker\s*\d+|interviewer|interviewee|\w+:/gi) || [];
    const hasMultipleSpeakers = speakerIndicators.length > 3;
    
    // Strong transcript indicators
    if (transcriptMatches >= 2 || (transcriptMatches >= 1 && hasMultipleSpeakers)) {
      return 'transcript';
    }
    
    // Check for service offering keywords
    const serviceOfferingKeywords = [
      'service offering', 'capability statement', 'services provided', 'service catalog',
      'offerings', 'capabilities', 'expertise', 'specialization', 'service portfolio'
    ];
    
    // Check for methodology keywords
    const methodologyKeywords = [
      'methodology', 'framework', 'process', 'procedures', 'workflow',
      'best practices', 'standards', 'approach', 'method', 'protocol'
    ];
    
    // Check for case study keywords
    const caseStudyKeywords = [
      'case study', 'success story', 'project example', 'client story',
      'implementation', 'results achieved', 'outcome', 'solution delivered'
    ];
    
    // Check for testimonials keywords
    const testimonialsKeywords = [
      'testimonial', 'testimonials', 'client feedback', 'review', 'recommendation',
      'client says', 'feedback', 'endorsement', 'praise', 'rating'
    ];
    
    // Check for requirements-specific keywords
    const requirementsKeywords = [
      'requirements', 'specifications', 'must have', 'shall', 'should',
      'functional requirements', 'non-functional requirements', 'acceptance criteria',
      'user stories', 'use cases', 'rfp', 'request for proposal'
    ];
    
    const proposalKeywords = [
      'proposal', 'solution', 'approach', 'methodology', 'deliverables',
      'timeline', 'budget', 'cost', 'pricing', 'team', 'experience',
      'case study', 'references'
    ];
    
    // Count keyword matches
    const serviceOfferingCount = serviceOfferingKeywords.filter(keyword => 
      lowerContent.includes(keyword)
    ).length;
    
    const methodologyCount = methodologyKeywords.filter(keyword => 
      lowerContent.includes(keyword)
    ).length;
    
    const caseStudyCount = caseStudyKeywords.filter(keyword => 
      lowerContent.includes(keyword)
    ).length;
    
    const testimonialsCount = testimonialsKeywords.filter(keyword => 
      lowerContent.includes(keyword)
    ).length;
    
    const requirementsCount = requirementsKeywords.filter(keyword => 
      lowerContent.includes(keyword)
    ).length;
    
    const proposalCount = proposalKeywords.filter(keyword => 
      lowerContent.includes(keyword)
    ).length;
    
    // Prioritize specific content types
    if (testimonialsCount >= 2) {
      return 'testimonials';
    } else if (caseStudyCount >= 2) {
      return 'case_study';
    } else if (methodologyCount >= 3) {
      return 'methodology';
    } else if (serviceOfferingCount >= 2) {
      return 'service_offering';
    } else if (requirementsCount > proposalCount && requirementsCount >= 3) {
      return 'requirements';
    } else if (proposalCount >= 3) {
      return 'proposal';
    } else if (lowerContent.includes('rfp') || lowerContent.includes('request for proposal')) {
      return 'rfp';
    } else {
      return 'other';
    }
  }

  /**
   * Get section update priority
   * Replaces getSectionUpdatePriority from fileClassification.ts
   */
  getSectionUpdatePriority(classification: UnifiedClassificationResult): {
    shouldProcess: boolean;
    priority: number;
    reason: string;
  } {
    switch (classification.documentType) {
      case 'rfp':
        return {
          shouldProcess: true,
          priority: 1,
          reason: 'RFP documents contain critical requirements that should update opportunity sections'
        };
      
      case 'requirements':
        return {
          shouldProcess: true,
          priority: 2,
          reason: 'Requirements documents specify what needs to be addressed in the proposal'
        };
      
      case 'transcript':
        return {
          shouldProcess: true,
          priority: 3,
          reason: 'Transcripts contain valuable client insights and requirements that should be analyzed and summarized'
        };
      
      case 'ideation':
        return {
          shouldProcess: classification.confidence > 70,
          priority: 4,
          reason: 'Ideation documents may contain useful content for proposal development'
        };
      
      case 'service_offering':
        return {
          shouldProcess: false,
          priority: 5,
          reason: 'Service offerings are stored in knowledge base for reuse but don\'t typically update current sections'
        };
      
      case 'methodology':
        return {
          shouldProcess: false,
          priority: 6,
          reason: 'Methodologies are stored in knowledge base for reuse but don\'t typically update current sections'
        };
      
      case 'case_study':
        return {
          shouldProcess: false,
          priority: 7,
          reason: 'Case studies are stored in knowledge base for reference but don\'t typically update current sections'
        };
      
      case 'testimonials':
        return {
          shouldProcess: false,
          priority: 8,
          reason: 'Testimonials are stored in knowledge base for reference but don\'t typically update current sections'
        };
      
      case 'reference':
        return {
          shouldProcess: false,
          priority: 9,
          reason: 'Reference materials are stored for context but don\'t typically update sections'
        };
      
      case 'proposal':
        return {
          shouldProcess: false,
          priority: 10,
          reason: 'Existing proposals are stored for reference rather than updating current sections'
        };
      
      default:
        return {
          shouldProcess: classification.confidence > 80,
          priority: 11,
          reason: 'Uncertain document type - process only if high confidence'
        };
    }
  }

  /**
   * Build comprehensive classification prompt
   */
  private buildClassificationPrompt(): string {
    return `You are an expert document analyst specializing in business documents, RFPs, proposals, and requirements analysis. 

Your task is to classify documents accurately to guide proper processing workflows and determine how they should be handled in an opportunity management system.

DOCUMENT TYPES:
- "rfp": Request for Proposal or tender document from client
- "requirements": Requirements specification or statement of work  
- "proposal": Existing proposal or response document
- "ideation": Brainstorming, notes, or preliminary ideas
- "reference": Supporting materials, case studies, or background info
- "transcript": Meeting transcripts, call recordings, or interview notes (if the document is a transcript of a ideation session etc, it should be classified as "transcript")
- "service_offering": Service descriptions, capability statements, or offering catalogs
- "methodology": Process documents, frameworks, or procedural guides
- "case_study": Client success stories, project examples, or use cases
- "testimonials": Client testimonials, reviews, or feedback documents
- "other": Unclear or mixed content

CLASSIFICATION CRITERIA:
1. **Content Analysis**: What is the primary purpose and structure?
2. **Language Patterns**: Formal vs informal, directive vs descriptive
3. **Financial Indicators**: Budget mentions, pricing requests, cost structures
4. **Timeline References**: Deadlines, milestones, delivery dates
5. **Contact Information**: Decision makers, stakeholders, project teams
6. **Section Structure**: How well organized and professional is the document?

PRIORITY ASSESSMENT:
- "high": Critical business documents requiring immediate action (RFPs, urgent requirements)
- "medium": Important documents for knowledge building (proposals, specifications)  
- "low": Reference materials or supporting documentation

SECTION UPDATE STRATEGY:
- Should this document's content be used to update/populate existing sections?
- Which sections would benefit from this content?
- Focus on practical impact: RFPs and requirements typically trigger section updates

Provide detailed reasoning for your classification and be conservative - when in doubt, classify as lower priority and recommend manual review.`;
  }

  /**
   * Build user prompt with document context
   */
  private buildUserPrompt(
    filename: string,
    extractedText: string,
    existingSections: Array<{ id: string; title: string; content?: string }>,
    includeMetadata: boolean = false
  ): string {
    const contentPreview = extractedText.length > 6000 
      ? extractedText.substring(0, 6000) + '\n\n[Content continues...]'
      : extractedText;

    let prompt = `Analyze and classify this document:

**Filename:** ${filename}
**Content Length:** ${extractedText.length} characters

**Document Content:**
${contentPreview}

**Existing Sections in System:**
${existingSections.map(s => `- ${s.title}${s.content ? ` (${s.content.length} chars)` : ' (empty)'}`).join('\n')}

Please provide a comprehensive classification including document type, confidence level, reasoning, suggested sections, priority level, key topics, and whether sections should be updated.`;

    if (includeMetadata) {
      prompt += `

**Additional Analysis Required:**
- Estimate word count
- Detect financial information (pricing, budgets, costs)
- Identify contact information (names, emails, roles) 
- Find deadline or timeline references
- Assess overall document structure quality`;
    }

    return prompt;
  }

  /**
   * Generate fallback classification using heuristics
   */
  private generateFallbackClassification(filename: string, extractedText: string): UnifiedClassificationResult {
    const lowerFilename = filename.toLowerCase();
    const lowerText = extractedText.toLowerCase();
    
    let documentType: UnifiedClassificationResult['documentType'] = 'other';
    let shouldUpdateSections = false;
    let priority: UnifiedClassificationResult['priority'] = 'medium';
    
    // Check for transcript patterns first
    const transcriptIndicators = [
      lowerFilename.includes('transcript'),
      lowerFilename.includes('meeting'),
      lowerFilename.includes('call'),
      lowerFilename.includes('interview'),
      /speaker\s*\d+\s*\(/i.test(extractedText),
      /\(\d{1,2}:\d{2}\)/.test(extractedText),
      (extractedText.match(/\w+:/g) || []).length > 5 // Multiple speaker patterns
    ];
    
    if (transcriptIndicators.filter(Boolean).length >= 2) {
      documentType = 'transcript';
      shouldUpdateSections = true;
      priority = 'high';
    }
    // Check for testimonials
    else if (
      lowerFilename.includes('testimonial') ||
      lowerFilename.includes('feedback') ||
      lowerFilename.includes('review') ||
      lowerText.includes('testimonial') ||
      lowerText.includes('client says') ||
      lowerText.includes('feedback')
    ) {
      documentType = 'testimonials';
      shouldUpdateSections = false;
      priority = 'medium';
    }
    // Check for case studies
    else if (
      lowerFilename.includes('case') ||
      lowerFilename.includes('study') ||
      lowerText.includes('case study') ||
      lowerText.includes('success story') ||
      lowerText.includes('project example')
    ) {
      documentType = 'case_study';
      shouldUpdateSections = false;
      priority = 'medium';
    }
    // Check for methodology
    else if (
      lowerFilename.includes('methodology') ||
      lowerFilename.includes('framework') ||
      lowerFilename.includes('process') ||
      lowerText.includes('methodology') ||
      lowerText.includes('framework') ||
      lowerText.includes('best practices')
    ) {
      documentType = 'methodology';
      shouldUpdateSections = false;
      priority = 'medium';
    }
    // Check for service offerings
    else if (
      lowerFilename.includes('service') ||
      lowerFilename.includes('offering') ||
      lowerFilename.includes('capability') ||
      lowerText.includes('service offering') ||
      lowerText.includes('capabilities') ||
      lowerText.includes('services provided')
    ) {
      documentType = 'service_offering';
      shouldUpdateSections = false;
      priority = 'medium';
    }
    // Simple heuristics for other classification types
    else if (
      lowerFilename.includes('rfp') || 
      lowerFilename.includes('request') ||
      lowerFilename.includes('tender') ||
      lowerText.includes('request for proposal') ||
      lowerText.includes('rfp')
    ) {
      documentType = 'rfp';
      shouldUpdateSections = true;
      priority = 'high';
    } else if (
      lowerFilename.includes('requirements') ||
      lowerText.includes('requirements') ||
      lowerText.includes('statement of work') ||
      lowerText.includes('scope of work')
    ) {
      documentType = 'requirements';
      shouldUpdateSections = true;
      priority = 'high';
    } else if (
      lowerFilename.includes('proposal') ||
      lowerFilename.includes('response') ||
      lowerText.includes('we propose') ||
      lowerText.includes('our solution')
    ) {
      documentType = 'proposal';
      shouldUpdateSections = false;
      priority = 'medium';
    } else if (
      lowerFilename.includes('reference') ||
      lowerFilename.includes('background')
    ) {
      documentType = 'reference';
      shouldUpdateSections = false;
      priority = 'low';
    }

    return {
      documentType,
      confidence: 60,
      reasoning: 'Fallback classification based on filename and content patterns.',
      suggestedSections: [],
      priority,
      keyTopics: [],
      shouldUpdateSections
    };
  }
}

// Create singleton instance
const unifiedDocumentClassifier = new UnifiedDocumentClassifier();

// Export unified interface (replaces all previous classification functions)
export async function classifyDocument(
  filename: string,
  extractedText: string,
  existingSections: Array<{ id: string; title: string; content?: string }> = []
): Promise<UnifiedClassificationResult> {
  if (USE_UNIFIED_CLASSIFICATION) {
    return unifiedDocumentClassifier.classifyDocument(filename, extractedText, existingSections);
  } else {
    // Fallback to legacy implementation during migration
    const { classifyDocument: legacyClassify } = await import('./fileClassification');
    const legacyResult = await legacyClassify(filename, extractedText, existingSections);
    
    // Convert legacy format to unified format
    return {
      documentType: legacyResult.documentType,
      confidence: legacyResult.confidence,
      reasoning: legacyResult.reasoning,
      suggestedSections: legacyResult.suggestedSections,
      priority: legacyResult.priority,
      keyTopics: legacyResult.keyTopics,
      shouldUpdateSections: legacyResult.shouldUpdateSections
    };
  }
}

export function detectDocumentType(content: string): UnifiedClassificationResult['documentType'] {
  return unifiedDocumentClassifier.detectDocumentType(content);
}

export function getSectionUpdatePriority(classification: UnifiedClassificationResult): {
  shouldProcess: boolean;
  priority: number;
  reason: string;
} {
  return unifiedDocumentClassifier.getSectionUpdatePriority(classification);
}

// Export the service instance for advanced usage
export { unifiedDocumentClassifier, UnifiedDocumentClassifier };
export default unifiedDocumentClassifier; 
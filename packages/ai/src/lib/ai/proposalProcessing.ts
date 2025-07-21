import { AIService } from './aiService';
import { MODELS } from './models';
import { z } from 'zod';
import type { ExtractedContactData } from './documentExtraction';
import { openaiFileService } from './openaiFileService';

// Schemas for proposal extraction
const proposalDetectionSchema = z.object({
  isProposal: z.boolean(),
  confidence: z.number().min(0).max(1),
  proposalType: z.enum(['business', 'technical', 'research', 'consulting', 'other']).nullable().optional(),
  clientOrganization: z.string().nullable().optional(),
  projectTitle: z.string().nullable().optional(),
  estimatedValue: z.number().nullable().optional(),
  reasoning: z.string()
});

const proposalMatchingSchema = z.object({
  matches: z.array(z.object({
    entityType: z.enum(['proposal', 'opportunity']),
    entityId: z.string(),
    matchType: z.enum(['exact', 'similar', 'related']),
    confidence: z.number().min(0).max(1),
    matchingFactors: z.array(z.string()),
    reasoning: z.string()
  })),
  createNewRecommendation: z.object({
    shouldCreate: z.boolean(),
    recommendedType: z.enum(['proposal', 'opportunity', 'both']).nullable().optional(),
    reasoning: z.string()
  })
});

const proposalExtractionSchema = z.object({
  services: z.array(z.object({
    name: z.string(),
    description: z.string(),
    category: z.string().nullable().optional(),
    technologies: z.array(z.string()).nullable().optional(),
    deliverables: z.array(z.string()).nullable().optional(),
    confidence: z.number().min(0).max(1)
  })),
  methodology: z.array(z.object({
    title: z.string(),
    description: z.string(),
    steps: z.array(z.string()).nullable().optional(),
    frameworks: z.array(z.string()).nullable().optional(),
    tools: z.array(z.string()).nullable().optional(),
    confidence: z.number().min(0).max(1)
  })),
  testimonials: z.array(z.object({
    clientName: z.string(),
    clientTitle: z.string().nullable().optional(),
    clientOrganization: z.string().nullable().optional(),
    quote: z.string(),
    projectType: z.string().nullable().optional(),
    outcome: z.string().nullable().optional(),
    rating: z.number().min(1).max(5).nullable().optional(),
    confidence: z.number().min(0).max(1)
  })),
  caseStudies: z.array(z.object({
    title: z.string(),
    client: z.string(),
    industry: z.string().nullable().optional(),
    challenge: z.string(),
    solution: z.string(),
    results: z.string(),
    technologies: z.array(z.string()).nullable().optional(),
    duration: z.string().nullable().optional(),
    teamSize: z.number().nullable().optional(),
    confidence: z.number().min(0).max(1)
  })),
  contacts: z.array(z.object({
    name: z.string(),
    title: z.string().nullable().optional(),
    organization: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    role: z.enum(['client', 'team', 'stakeholder', 'reference']).nullable().optional(),
    confidence: z.number().min(0).max(1)
  }))
});

// Interfaces
export interface ProposalDetectionResult {
  isProposal: boolean;
  confidence: number;
  proposalType?: 'business' | 'technical' | 'research' | 'consulting' | 'other' | null;
  clientOrganization?: string | null;
  projectTitle?: string | null;
  estimatedValue?: number | null;
  reasoning: string;
}

export interface ProposalMatch {
  entityType: 'proposal' | 'opportunity';
  entityId: string;
  matchType: 'exact' | 'similar' | 'related';
  confidence: number;
  matchingFactors: string[];
  reasoning: string;
}

export interface ProposalMatchingResult {
  matches: ProposalMatch[];
  createNewRecommendation: {
    shouldCreate: boolean;
    recommendedType?: 'proposal' | 'opportunity' | 'both' | null;
    reasoning: string;
  };
}

export interface ExtractedService {
  name: string;
  description: string;
  category?: string | null;
  technologies?: string[] | null;
  deliverables?: string[] | null;
  confidence: number;
}

export interface ExtractedMethodology {
  title: string;
  description: string;
  steps?: string[] | null;
  frameworks?: string[] | null;
  tools?: string[] | null;
  confidence: number;
}

export interface ExtractedTestimonial {
  clientName: string;
  clientTitle?: string | null;
  clientOrganization?: string | null;
  quote: string;
  projectType?: string | null;
  outcome?: string | null;
  rating?: number | null;
  confidence: number;
}

export interface ExtractedCaseStudy {
  title: string;
  client: string;
  industry?: string | null;
  challenge: string;
  solution: string;
  results: string;
  technologies?: string[] | null;
  duration?: string | null;
  teamSize?: number | null;
  confidence: number;
}

export interface ProposalExtractionResult {
  services: ExtractedService[];
  methodology: ExtractedMethodology[];
  testimonials: ExtractedTestimonial[];
  caseStudies: ExtractedCaseStudy[];
  contacts: ExtractedContactData[];
}

export interface ProposalProcessingOptions {
  extractServices?: boolean;
  extractMethodology?: boolean;
  extractTestimonials?: boolean;
  extractCaseStudies?: boolean;
  extractContacts?: boolean;
}

/**
 * Enhanced ProposalProcessingService extending AIService base class
 * Provides proposal-specific detection, matching, and extraction capabilities
 */
class ProposalProcessingService extends AIService {
  constructor() {
    super({
      maxRetries: 3,
      timeoutMs: 90000, // 1.5 minutes for complex proposal processing
      enableLogging: true,
      enableDebugLogging: true,
      logPrefix: 'ProposalProcessing',
    });
  }

  /**
   * Process a file (PDF, image, etc.) by uploading to OpenAI and returning file ID
   */
  async processFile(
    buffer: Buffer,
    filename: string,
    organizationId: string,
    entityType: string = 'proposal',
    entityId: string
  ): Promise<string> {
    this.log(`Processing file: ${filename} for organization ${organizationId}`);

    try {
      // Upload file to OpenAI and get file ID for direct AI processing
      const fileId = await openaiFileService.processFileForAI(
        buffer,
        filename,
        organizationId,
        entityType,
        entityId
      );

      this.log(`Successfully processed file ${filename} -> OpenAI file ID: ${fileId}`);
      return fileId;

    } catch (error) {
      this.log(`Error processing file ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Detect if a document is a proposal and extract basic metadata
   * Now supports both text content and file processing using OpenAI file uploads
   */
  async detectProposal(
    documentContent: string,
    filename?: string,
    fileBuffer?: Buffer,
    organizationId?: string,
    entityId?: string
  ): Promise<ProposalDetectionResult> {
    this.log(`Detecting proposal in document: ${filename || 'text content'}`);

    try {
      const systemMessage = `You are an expert document analyst specializing in business proposal identification and analysis.

Your task is to analyze documents and determine if they are business proposals, along with extracting key metadata.

A business proposal is a document that:
- Presents a solution to a specific business need or problem
- Contains service/product offerings with descriptions
- Includes pricing, timelines, or deliverables
- Is structured to persuade a client to accept an offer
- Contains client or project-specific information

NOT a proposal:
- General marketing materials or brochures
- Internal company documents
- Reports or research papers
- Invoices or contracts (unless proposal-based)
- Knowledge base articles or documentation

Analyze the document and extract:
1. Whether it's a proposal (high confidence required)
2. Confidence level (0-1)
3. Type of proposal if applicable
4. Client organization if mentioned
5. Project title or subject
6. Estimated value if present
7. Reasoning for your decision

Be conservative in proposal identification - when in doubt, mark as not a proposal.`;

      // If we have a file buffer, process it with OpenAI file upload
      if (fileBuffer && filename && organizationId && entityId) {
        try {
          const fileId = await this.processFile(
            fileBuffer,
            filename,
            organizationId,
            'proposal',
            entityId
          );
          
          this.log(`Using OpenAI file processing with file ID: ${fileId}`);
          
          // Use the new file-based AI call
          const result = await this.callAIWithFiles(
            MODELS.reasoning,
            systemMessage,
            [
              this.createFileInput(fileId),
              this.createTextInput('Please analyze this document and determine if it\'s a business proposal.')
            ],
            proposalDetectionSchema,
            `detectProposal(${filename})`,
            'proposalDetection'
          );

          this.log(`Proposal detection completed: ${result.isProposal ? 'IS' : 'NOT'} a proposal (confidence: ${result.confidence})`);
          return result;

        } catch (fileError) {
          this.log(`File processing failed, falling back to text content: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
          // Fall back to text content processing
        }
      }

      // Fallback to text-based processing
      this.log(`Using text-based processing (${documentContent.length} characters)`);
      
      const result = await this.callAI(
        MODELS.reasoning,
        [
          {
            role: 'system',
            content: systemMessage,
          },
          {
            role: 'user',
            content: `Please analyze this document and determine if it's a business proposal:

${documentContent.substring(0, 8000)}${documentContent.length > 8000 ? '\n\n[Document continues...]' : ''}`,
          },
        ],
        proposalDetectionSchema,
        `detectProposal(${filename || 'text'})`,
        'proposalDetection'
      );

      this.log(`Proposal detection completed: ${result.isProposal ? 'IS' : 'NOT'} a proposal (confidence: ${result.confidence})`);
      return result;

    } catch (error) {
      this.log(`Error in proposal detection: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(`Failed to detect proposal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find matching existing proposals or opportunities
   */
  async findMatchingEntities(
    proposalContent: string,
    proposalMetadata: ProposalDetectionResult,
    userId: string
  ): Promise<ProposalMatchingResult> {
    this.log('Searching for matching proposals and opportunities');

    try {
      // Get existing proposals and opportunities for comparison
      const { getOpportunitiesByContactId, getProposalsByContactId } = await import('../database');
      
      const opportunities = await getOpportunitiesByContactId(userId);
      const proposals = await getProposalsByContactId(userId);

      // Prepare context for AI matching - simplified approach
      const existingEntities = [
        ...opportunities.slice(0, 20).map((opp: { id: string; title?: string; organization?: { name?: string }; description?: string; value?: number }) => ({
          type: 'opportunity' as const,
          id: String(opp.id),
          title: String(opp.title || ''),
          organization: String(opp.organization?.name || 'Unknown'),
          description: String(opp.description || ''),
          value: Number(opp.value || 0)
        })),
        ...proposals.slice(0, 20).map((prop: { id: string; title?: string; forOrganization?: { name?: string } }) => ({
          type: 'proposal' as const,
          id: String(prop.id),
          title: String(prop.title || ''),
          organization: String(prop.forOrganization?.name || 'Unknown'),
          description: '',
          value: 0
        }))
      ];

      const result = await this.callAI(
        MODELS.reasoning,
        [
          {
            role: 'system',
            content: `You are an expert at matching business proposals with existing opportunities and proposals.

Your task is to:
1. Compare the uploaded proposal against existing proposals and opportunities
2. Identify potential matches based on client, project type, content similarity
3. Recommend whether to create new entities or link to existing ones

Matching criteria:
- 'exact': Same client and very similar project scope
- 'similar': Same client or very similar project type/scope  
- 'related': Related client, industry, or project characteristics

For createNewRecommendation:
- 'proposal': If this is a new proposal for existing opportunity
- 'opportunity': If this represents a new business opportunity  
- 'both': If both new opportunity and proposal should be created
- shouldCreate: false only if exact matches exist`
          },
          {
            role: 'user',
            content: `Find matches for this proposal:

Proposal Metadata:
- Is Proposal: ${proposalMetadata.isProposal}
- Type: ${proposalMetadata.proposalType || 'unknown'}
- Client: ${proposalMetadata.clientOrganization || 'unknown'}
- Project: ${proposalMetadata.projectTitle || 'unknown'}
- Value: ${proposalMetadata.estimatedValue || 'unknown'}

Proposal Content Summary:
${proposalContent.slice(0, 4000)} ${proposalContent.length > 4000 ? '...[truncated]' : ''}

Existing Entities:
${existingEntities.map(entity => 
  `${entity.type.toUpperCase()}: ${entity.title} | ${entity.organization}`
).join('\n')}

Analyze for matches and provide recommendations.`
          }
        ],
        proposalMatchingSchema,
        'findMatchingEntities',
        'proposalMatching'
      );

      return {
        matches: result.matches.map(match => ({
          entityType: match.entityType,
          entityId: match.entityId,
          matchType: match.matchType,
          confidence: match.confidence,
          matchingFactors: match.matchingFactors,
          reasoning: match.reasoning
        })),
        createNewRecommendation: result.createNewRecommendation
      };

    } catch (error) {
      this.log(`Entity matching failed: ${error}`, 'warn');
      return {
        matches: [],
        createNewRecommendation: {
          shouldCreate: true,
          recommendedType: 'both',
          reasoning: 'Matching analysis failed, recommend manual review and creation of new entities'
        }
      };
    }
  }

  /**
   * Extract specific elements from a proposal
   */
  async extractProposalElements(
    proposalContent: string,
    options: ProposalProcessingOptions,
    filename?: string
  ): Promise<ProposalExtractionResult> {
    this.log(`Extracting proposal elements from: ${filename || 'unknown'}`);

    const extractionPrompt = this.buildExtractionPrompt(options);

    try {
      const result = await this.callAI(
        MODELS.reasoning,
        [
          {
            role: 'system',
            content: `You are an expert at extracting structured business information from proposals.

${extractionPrompt}

For each extracted item, assign a confidence score (0-1) based on:
- 1.0: Explicitly stated with complete details
- 0.8: Clearly stated with good details
- 0.6: Mentioned with some details
- 0.4: Implied or referenced indirectly
- 0.2: Uncertain or ambiguous

Focus on extracting actual content, not placeholder text or generic statements.
If a section is requested but not found, return an empty array for that section.`
          },
          {
            role: 'user',
            content: `Extract the requested elements from this proposal:

Filename: ${filename || 'Document'}

Content:
${proposalContent.slice(0, 12000)} ${proposalContent.length > 12000 ? '...[truncated]' : ''}`
          }
        ],
        proposalExtractionSchema,
        `extractProposalElements(${filename})`,
        'proposalExtraction'
      );

      // Convert contacts to use ExtractedContactData interface
      const contacts: ExtractedContactData[] = result.contacts.map(contact => ({
        name: contact.name,
        email: contact.email || undefined,
        title: contact.title || undefined,
        phone: contact.phone || undefined,
        isPrimary: contact.role === 'client',
        confidence: contact.confidence
      }));

      return {
        services: result.services,
        methodology: result.methodology,
        testimonials: result.testimonials,
        caseStudies: result.caseStudies,
        contacts
      };

    } catch (error) {
      this.log(`Proposal extraction failed: ${error}`, 'warn');
      return {
        services: [],
        methodology: [],
        testimonials: [],
        caseStudies: [],
        contacts: []
      };
    }
  }

  /**
   * Store extracted proposal elements in the knowledge base
   * This is a simplified implementation that returns counts and links
   */
  async storeProposalElements(
    extractionResult: ProposalExtractionResult
  ): Promise<{
    stored: {
      services: number;
      methodology: number;
      testimonials: number;
      caseStudies: number;
      contacts: number;
    };
    links: {
      services: string;
      methodology: string;
      testimonials: string;
      caseStudies: string;
      contacts: string;
    };
  }> {
    this.log('Processing extracted proposal elements');

    // For now, just count the extracted elements
    // In a full implementation, these would be stored in the appropriate knowledge base tables
    const storedCounts = {
      services: extractionResult.services.length,
      methodology: extractionResult.methodology.length,
      testimonials: extractionResult.testimonials.length,
      caseStudies: extractionResult.caseStudies.length,
      contacts: extractionResult.contacts.length
    };

    // Generate links to knowledge base sections
    const baseUrl = `/manage/knowledge`;
    const links = {
      services: `${baseUrl}?tab=services`,
      methodology: `${baseUrl}?tab=methodology`, 
      testimonials: `${baseUrl}?tab=testimonials`,
      caseStudies: `${baseUrl}?tab=case-studies`,
      contacts: `/manage/organizations` // Contacts managed at org level
    };

    this.log(`Processed proposal elements: ${JSON.stringify(storedCounts)}`);
    
    return { stored: storedCounts, links };
  }

  /**
   * Build the extraction prompt based on options
   */
  private buildExtractionPrompt(options: ProposalProcessingOptions): string {
    const sections = [];

    if (options.extractServices) {
      sections.push(`SERVICES: Extract all services, products, or solutions offered. Include:
- Service name and description
- Category or type of service
- Technologies or tools used
- Key deliverables or outcomes`);
    }

    if (options.extractMethodology) {
      sections.push(`METHODOLOGY: Extract methodologies, processes, or approaches. Include:
- Methodology name and description
- Process steps or phases
- Frameworks or standards used
- Tools or techniques applied`);
    }

    if (options.extractTestimonials) {
      sections.push(`TESTIMONIALS: Extract client testimonials, quotes, or feedback. Include:
- Client name, title, and organization
- Testimonial quote or feedback
- Project type or context
- Outcomes or results mentioned
- Star rating if mentioned (1-5)`);
    }

    if (options.extractCaseStudies) {
      sections.push(`CASE STUDIES: Extract case studies or project examples. Include:
- Project title and client
- Industry or domain
- Challenge or problem statement
- Solution or approach taken
- Results or outcomes achieved
- Technologies used, duration, team size`);
    }

    if (options.extractContacts) {
      sections.push(`CONTACTS: Extract all people mentioned. Include:
- Name, title, and organization
- Contact information (email, phone)
- Role in the project (client, team, stakeholder, reference)`);
    }

    return `Extract the following types of information from the proposal:\n\n${sections.join('\n\n')}`;
  }
}

// Create singleton instance
const proposalProcessingService = new ProposalProcessingService();

// Create instance with debug logging enabled
export function createDebugEnabledProposalService(organizationId?: string, sessionId?: string): ProposalProcessingService {
  return new (class extends ProposalProcessingService {
    constructor() {
      super();
      this.config = {
        ...this.config,
        enableDebugLogging: true,
        organizationId,
        sessionId,
      };
    }
  })();
}

// Export the service and types
export { proposalProcessingService };
export default proposalProcessingService; 
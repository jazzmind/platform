import { AIService } from './aiService';
import { MODELS } from './models';
import { z } from 'zod';

// Feature flag for gradual rollout
const USE_UNIFIED_ORGANIZATION_EXTRACTION = process.env.USE_UNIFIED_ORGANIZATION_EXTRACTION === 'true';

// Unified organization schema combining all extraction needs
const unifiedOrganizationSchema = z.object({
  name: z.string(),
  website: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  address: z.object({
    street: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    zip: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
  }).nullable().optional(),
  
  // Basic business info
  sector: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  
  // Company culture & positioning
  mission: z.string().nullable().optional(),
  vision: z.string().nullable().optional(),
  values: z.array(z.string()).nullable().optional(),
  
  // Historical & operational
  foundedYear: z.number().nullable().optional(),
  headquarters: z.string().nullable().optional(),
  specialties: z.array(z.string()).nullable().optional(),
  awards: z.array(z.string()).nullable().optional(),
  clients: z.array(z.string()).nullable().optional(),
  
  // Brand identity
  primaryColor: z.string().nullable().optional(),
  secondaryColor: z.string().nullable().optional(),
  
  // Metadata
  confidence: z.number().min(0).max(1),
  isPrimary: z.boolean().nullable(),
});

const multipleOrganizationsSchema = z.object({
  organizations: z.array(unifiedOrganizationSchema),
  primaryOrganization: z.string().nullable().optional(), // Name of primary org
});

export interface UnifiedOrganizationData {
  name: string;
  website?: string | null;
  logoUrl?: string | null;
  address?: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    country?: string | null;
  } | null;
  
  // Basic business info
  sector?: string | null;
  industry?: string | null;
  size?: string | null;
  description?: string | null;
  
  // Company culture & positioning  
  mission?: string | null;
  vision?: string | null;
  values?: string[] | null;
  
  // Historical & operational
  foundedYear?: number | null;
  headquarters?: string | null;
  specialties?: string[] | null;
  awards?: string[] | null;
  clients?: string[] | null;
  
  // Brand identity
  primaryColor?: string | null;
  secondaryColor?: string | null;
  
  // Metadata
  confidence: number;
  isPrimary?: boolean | null;
}

export interface MultipleOrganizationsResult {
  organizations: UnifiedOrganizationData[];
  primaryOrganization?: UnifiedOrganizationData;
}

export interface OrganizationExtractionOptions {
  context: 'search' | 'document' | 'website' | 'chat';
  includeColors?: boolean;
  includeCulture?: boolean;
  includeHistory?: boolean;
  maxOrganizations?: number;
  confidenceThreshold?: number;
}

/**
 * Unified Organization Extraction Service
 * Consolidates all organization extraction functionality from across the codebase
 */
class UnifiedOrganizationExtractor extends AIService {
  constructor() {
    super({
      maxRetries: 3,
      timeoutMs: 60000,
      enableLogging: true,
      enableDebugLogging: true,
      logPrefix: 'OrgExtractor',
    });
  }

  /**
   * Extract organization information from text - master method
   * Replaces extractOrganizationInfo from searchExtraction.ts
   * Replaces extractOrganizationsFromDocumentNew from documentExtraction.ts 
   * Replaces extractOrganization from crawlerService.ts
   */
  async extractOrganizations(
    content: string,
    options: OrganizationExtractionOptions = { context: 'document' }
  ): Promise<MultipleOrganizationsResult> {
    this.log(`Extracting organizations from ${options.context} content (${content.length} chars)`);

    try {
      const systemPrompt = this.buildSystemPrompt(options);
      const userPrompt = this.buildUserPrompt(content, options);

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
        multipleOrganizationsSchema,
        `extractOrganizations(${options.context})`,
        'organizations'
      );

      const organizations = result.organizations || [];
      let primaryOrganization: UnifiedOrganizationData | undefined;

      // Find primary organization
      if (result.primaryOrganization) {
        primaryOrganization = organizations.find(org => org.name === result.primaryOrganization);
      }
      
      // If no primary specified, use the one with highest confidence
      if (!primaryOrganization && organizations.length > 0) {
        primaryOrganization = organizations.reduce((prev, current) => 
          current.confidence > prev.confidence ? current : prev
        );
      }

      // Filter by confidence threshold
      const filteredOrganizations = options.confidenceThreshold 
        ? organizations.filter(org => org.confidence >= options.confidenceThreshold!)
        : organizations;

      // Limit results if specified
      const finalOrganizations = options.maxOrganizations
        ? filteredOrganizations.slice(0, options.maxOrganizations)
        : filteredOrganizations;

      this.log(`Extracted ${finalOrganizations.length} organizations, primary: ${primaryOrganization?.name || 'none'}`);
      
      return {
        organizations: finalOrganizations,
        primaryOrganization,
      };

    } catch (error) {
      this.log(`Organization extraction failed: ${error}`, 'warn');
      return { organizations: [] };
    }
  }

  /**
   * Extract single organization (backward compatibility)
   * Replaces extractOrganizationInfo from searchExtraction.ts
   */
  async extractSingleOrganization(
    content: string,
    options: Omit<OrganizationExtractionOptions, 'maxOrganizations'> = { context: 'search' }
  ): Promise<UnifiedOrganizationData | null> {
    const result = await this.extractOrganizations(content, { ...options, maxOrganizations: 1 });
    return result.organizations[0] || null;
  }

  /**
   * Extract organizations from document content (RFPs, requirements, etc.)
   * Replaces extractOrganizationsFromDocumentNew from documentExtraction.ts
   */
  async extractFromDocument(
    documentContent: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _filename?: string
  ): Promise<MultipleOrganizationsResult> {
    return this.extractOrganizations(documentContent, {
      context: 'document',
      includeColors: false,
      includeCulture: false,
      includeHistory: false,
      confidenceThreshold: 0.4,
    });
  }

  /**
   * Extract organization from website content
   * Replaces extractOrganization from crawlerService.ts
   */
  async extractFromWebsite(
    webContent: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: { includeFullProfile?: boolean } = {}
  ): Promise<UnifiedOrganizationData | null> {
    const result = await this.extractOrganizations(webContent, {
      context: 'website',
      includeColors: true,
      includeCulture: true,
      includeHistory: true,
      maxOrganizations: 1,
      confidenceThreshold: 0.3,
    });

    return result.organizations[0] || null;
  }

  /**
   * Extract organization for search/chat contexts
   * Replaces extractOrganizationInfo from searchExtraction.ts
   */
  async extractForSearch(message: string): Promise<UnifiedOrganizationData | null> {
    return this.extractSingleOrganization(message, {
      context: 'search',
      includeColors: true,
      includeCulture: false,
      includeHistory: false,
    });
  }

  /**
   * Build context-specific system prompt
   */
  private buildSystemPrompt(options: OrganizationExtractionOptions): string {
    const basePrompt = `You are an expert at extracting organization information from business content.`;

    const contextPrompts = {
      search: `Your task is to extract organization information from search queries or messages for business research purposes.

Focus on finding:
- Organization names and basic details
- Brand identity elements (colors, positioning)
- Key business information (sector, size, description)`,

      document: `Your task is to identify ALL organizations mentioned in business documents, especially RFPs, requirements documents, and proposals.

Focus on finding:
- Organization names (companies, government agencies, non-profits, etc.)
- Contact information (websites, addresses, phone numbers)
- Organization details (sector/industry, size indicators, descriptions)
- Organizational relationships (who is the client vs vendors vs partners)

Prioritize the PRIMARY organization as the one that:
1. Is issuing the RFP or requirement
2. Is the main client or customer
3. Has the most detailed contact information
4. Is mentioned most prominently in the document`,

      website: `Your task is to extract comprehensive organization information from website content.

Focus on finding:
- Company details and positioning
- Mission, vision, and values
- Historical information (founding, milestones)
- Business specialties and client base
- Brand identity elements`,

      chat: `Your task is to extract organization information from conversational content for CRM and business intelligence purposes.

Focus on finding:
- Organization names mentioned in context
- Business relationships and connections
- Key details for followup and relationship building`
    };

    let prompt = `${basePrompt}\n\n${contextPrompts[options.context]}`;

    // Add confidence scoring guidelines
    prompt += `\n\nFor each organization, assign a confidence score:
- 1.0: Clearly stated organization with complete details
- 0.8: Clearly stated organization with good details
- 0.6: Organization mentioned with some details
- 0.4: Organization implied or referenced with minimal details
- 0.2: Uncertain or ambiguous organization reference`;

    // Add optional field guidelines
    if (options.includeColors) {
      prompt += `\n\nFor brand colors: Analyze the organization's brand identity and return appropriate hex color codes. Use null if uncertain.`;
    }

    if (options.includeCulture) {
      prompt += `\n\nFor mission/vision/values: Extract these elements if explicitly mentioned. Use null for missing information.`;
    }

    if (options.includeHistory) {
      prompt += `\n\nFor historical information: Include founding dates, milestones, awards if mentioned. foundedYear should be a number or null.`;
    }

    return prompt;
  }

  /**
   * Build context-specific user prompt
   */
  private buildUserPrompt(content: string, options: OrganizationExtractionOptions): string {
    const truncatedContent = content.length > 8000 
      ? content.slice(0, 8000) + '\n\n[Content continues...]'
      : content;

    let prompt = `Extract organization information from this ${options.context} content:\n\n${truncatedContent}`;

    if (options.maxOrganizations && options.maxOrganizations > 1) {
      prompt += `\n\nFind up to ${options.maxOrganizations} organizations mentioned.`;
    }

    if (options.confidenceThreshold) {
      prompt += `\n\nOnly include organizations with confidence >= ${options.confidenceThreshold}.`;
    }

    return prompt;
  }

  /**
   * Generate fallback organization using heuristics
   */
  generateFallbackOrganization(content: string): UnifiedOrganizationData | null {
    // Simple pattern matching for organization names
    const orgPatterns = [
      /(?:Inc\.|LLC|Corp\.|Corporation|Company|Ltd\.|Limited)/gi,
      /(?:University|College|Institute)/gi,
      /(?:Department of|Agency|Government)/gi,
    ];

    const sentences = content.split(/[.!?]+/);
    for (const sentence of sentences) {
      for (const pattern of orgPatterns) {
        const matches = sentence.match(pattern);
        if (matches) {
          // Extract likely organization name from sentence
          const words = sentence.split(/\s+/);
          const orgIndex = words.findIndex(word => pattern.test(word));
          if (orgIndex >= 0) {
            const orgName = words.slice(Math.max(0, orgIndex - 3), orgIndex + 1).join(' ').trim();
            if (orgName.length > 3) {
              return {
                name: orgName,
                confidence: 0.3,
                description: 'Extracted using pattern matching fallback',
              };
            }
          }
        }
      }
    }

    return null;
  }
}

// Create singleton instance
const unifiedOrganizationExtractor = new UnifiedOrganizationExtractor();

// Export unified interface (replaces all previous organization extraction functions)
export async function extractOrganizations(
  content: string,
  options: OrganizationExtractionOptions = { context: 'document' }
): Promise<MultipleOrganizationsResult> {
  if (USE_UNIFIED_ORGANIZATION_EXTRACTION) {
    return unifiedOrganizationExtractor.extractOrganizations(content, options);
  } else {
    // Fallback to legacy implementations during migration
    if (options.context === 'search') {
      const { extractOrganizationInfo } = await import('./searchExtraction');
      const legacyResult = await extractOrganizationInfo(content);
      
      return {
        organizations: [{
          name: legacyResult.name,
          website: legacyResult.website,
          logoUrl: legacyResult.logoUrl,
          sector: legacyResult.sector,
          size: legacyResult.size,
          description: legacyResult.background,
          primaryColor: legacyResult.primaryColor,
          secondaryColor: legacyResult.secondaryColor,
          confidence: 0.8, // Legacy doesn't provide confidence
        }],
      };
    } else {
      const { extractOrganizationsFromDocument } = await import('./documentExtraction');
      const legacyResult = await extractOrganizationsFromDocument(content);
      
      const organizations: UnifiedOrganizationData[] = legacyResult.organizations.map(org => ({
        name: org.name,
        website: org.website,
        address: org.address ? {
          street: org.address.street,
          city: org.address.city,
          state: org.address.state,
          zip: org.address.zip,
          country: org.address.country,
        } : undefined,
        sector: org.sector,
        size: org.size,
        description: org.description,
        confidence: org.confidence,
      }));

      return {
        organizations,
        primaryOrganization: legacyResult.primaryOrganization ? {
          name: legacyResult.primaryOrganization.name,
          website: legacyResult.primaryOrganization.website,
          address: legacyResult.primaryOrganization.address ? {
            street: legacyResult.primaryOrganization.address.street,
            city: legacyResult.primaryOrganization.address.city,
            state: legacyResult.primaryOrganization.address.state,
            zip: legacyResult.primaryOrganization.address.zip,
            country: legacyResult.primaryOrganization.address.country,
          } : undefined,
          sector: legacyResult.primaryOrganization.sector,
          size: legacyResult.primaryOrganization.size,
          description: legacyResult.primaryOrganization.description,
          confidence: legacyResult.primaryOrganization.confidence,
        } : undefined,
      };
    }
  }
}

export async function extractSingleOrganization(
  content: string,
  options: Omit<OrganizationExtractionOptions, 'maxOrganizations'> = { context: 'search' }
): Promise<UnifiedOrganizationData | null> {
  return unifiedOrganizationExtractor.extractSingleOrganization(content, options);
}

export async function extractFromDocument(
  documentContent: string,
  filename?: string
): Promise<MultipleOrganizationsResult> {
  return unifiedOrganizationExtractor.extractFromDocument(documentContent, filename);
}

export async function extractFromWebsite(
  webContent: string,
  options: { includeFullProfile?: boolean } = {}
): Promise<UnifiedOrganizationData | null> {
  return unifiedOrganizationExtractor.extractFromWebsite(webContent, options);
}

export async function extractForSearch(message: string): Promise<UnifiedOrganizationData | null> {
  return unifiedOrganizationExtractor.extractForSearch(message);
}

// Legacy compatibility functions
export async function extractOrganizationInfo(message: string): Promise<UnifiedOrganizationData | null> {
  return extractForSearch(message);
}

export async function extractOrganizationsFromDocument(
  documentContent: string,
  filename?: string
): Promise<MultipleOrganizationsResult> {
  return extractFromDocument(documentContent, filename);
}

// Export the service instance for advanced usage
export { unifiedOrganizationExtractor, UnifiedOrganizationExtractor };
export default unifiedOrganizationExtractor; 
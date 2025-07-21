import { AIService } from './aiService';
import { MODELS } from './models';
import { z } from 'zod';

// Contact information schema
const contactSchema = z.object({
  name: z.string(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  linkedIn: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
  isPrimary: z.boolean().nullable().optional(),
});

// Organization with embedded contacts schema
const organizationWithContactsSchema = z.object({
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
  
  // Associated contacts - ALWAYS included
  contacts: z.array(contactSchema),
  
  // Metadata
  confidence: z.number().min(0).max(1),
  isPrimary: z.boolean().nullable().optional(),
});

const multipleOrganizationsWithContactsSchema = z.object({
  organizations: z.array(organizationWithContactsSchema),
  primaryOrganization: z.string().nullable().optional(), // Name of primary org
});

export interface ContactData {
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedIn?: string | null;
  title?: string | null;
  department?: string | null;
  bio?: string | null;
  confidence: number;
  isPrimary?: boolean | null;
}

export interface OrganizationWithContactsData {
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
  
  // Associated contacts - ALWAYS included
  contacts: ContactData[];
  
  // Metadata
  confidence: number;
  isPrimary?: boolean | null;
}

export interface OrganizationContactExtractionResult {
  organizations: OrganizationWithContactsData[];
  primaryOrganization?: OrganizationWithContactsData;
}

export interface OrganizationContactExtractionOptions {
  context: 'search' | 'document' | 'website' | 'chat' | 'rfp' | 'proposal';
  truncateContent?: boolean | false;
  includeColors?: boolean;
  includeCulture?: boolean;
  includeHistory?: boolean;
  includeDetailedContacts?: boolean;
  maxOrganizations?: number;
  confidenceThreshold?: number;
}

/**
 * Unified Organization + Contact Extraction Service
 * Extracts organizations WITH their associated contacts in a single call
 * Replaces separate organization and contact extraction services
 */
class UnifiedOrganizationContactExtractor extends AIService {
  constructor() {
    super({
      maxRetries: 3,
      timeoutMs: 60000,
      enableLogging: true,
      enableDebugLogging: true,
      logPrefix: 'OrgContactExtractor',
    });
  }

  /**
   * Extract organizations with their associated contacts - master method
   * This replaces all previous separate extraction methods
   */
  async extractOrganizationsWithContacts(
    content: string,
    options: OrganizationContactExtractionOptions = { context: 'document' }
  ): Promise<OrganizationContactExtractionResult> {
    this.log(`Extracting organizations with contacts from ${options.context} content (${content.length} chars)`);

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
        multipleOrganizationsWithContactsSchema,
        `extractOrganizationsWithContacts(${options.context})`,
        'organizations_contacts'
      );

      const organizations = result.organizations || [];
      let primaryOrganization: OrganizationWithContactsData | undefined;

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

      // Ensure every organization has at least basic contact info if none extracted
      const organizationsWithContacts = finalOrganizations.map(org => {
        if (org.contacts.length === 0) {
          // Create a basic contact entry from organization info
          org.contacts = [{
            name: 'General Contact',
            title: 'General Inquiries',
            confidence: 0.3,
            isPrimary: true
          }];
        }
        return org;
      });

      const totalContacts = organizationsWithContacts.reduce((sum, org) => sum + org.contacts.length, 0);
      
      this.log(`Extracted ${organizationsWithContacts.length} organizations with ${totalContacts} contacts, primary: ${primaryOrganization?.name || 'none'}`);
      
      return {
        organizations: organizationsWithContacts,
        primaryOrganization,
      };

    } catch (error) {
      this.log(`Organization+Contact extraction failed: ${error}`, 'warn');
      return { organizations: [] };
    }
  }

  /**
   * Extract single organization with contacts (for simple use cases)
   */
  async extractSingleOrganizationWithContacts(
    content: string,
    options: Omit<OrganizationContactExtractionOptions, 'maxOrganizations'> = { context: 'search' }
  ): Promise<OrganizationWithContactsData | null> {
    const result = await this.extractOrganizationsWithContacts(content, { ...options, maxOrganizations: 1 });
    return result.organizations[0] || null;
  }

  /**
   * Extract from RFP/document content (primary use case)
   */
  async extractFromDocument(
    documentContent: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _filename?: string 
  ): Promise<OrganizationContactExtractionResult> {
    return this.extractOrganizationsWithContacts(documentContent, {
      context: 'document',
      includeColors: false,
      includeCulture: false,
      includeHistory: false,
      includeDetailedContacts: true,
      confidenceThreshold: 0.4,
    });
  }

  /**
   * Extract from website content
   */
  async extractFromWebsite(
    webContent: string,
    options: { includeFullProfile?: boolean } = {}
  ): Promise<OrganizationWithContactsData | null> {
    const result = await this.extractOrganizationsWithContacts(webContent, {
      context: 'website',
      includeColors: true,
      includeCulture: true,
      includeHistory: true,
      includeDetailedContacts: !!options.includeFullProfile,
      maxOrganizations: 1,
      confidenceThreshold: 0.3,
    });

    return result.organizations[0] || null;
  }

  /**
   * Extract for search/chat contexts
   */
  async extractForSearch(message: string): Promise<OrganizationWithContactsData | null> {
    return this.extractSingleOrganizationWithContacts(message, {
      context: 'search',
      includeColors: true,
      includeCulture: false,
      includeHistory: false,
      includeDetailedContacts: false,
    });
  }

  /**
   * Extract from RFP context (specialized for RFP documents)
   */
  async extractFromRFP(
    rfpContent: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _filename?: string
  ): Promise<OrganizationContactExtractionResult> {
    return this.extractOrganizationsWithContacts(rfpContent, {
      context: 'rfp',
      includeColors: false,
      includeCulture: false,
      includeHistory: false,
      includeDetailedContacts: true,
      confidenceThreshold: 0.3,
    });
  }

  /**
   * Build context-specific system prompt
   */
  private buildSystemPrompt(options: OrganizationContactExtractionOptions): string {
    const basePrompt = `You are an expert at extracting organization information WITH their associated contacts from business content.

CRITICAL: For EVERY organization you identify, you MUST also extract any associated contact information. 
If no specific contacts are mentioned, create at least one general contact entry with basic information.`;

    const contextPrompts = {
      search: `Extract organization and contact info from search queries or messages for business research.

Focus on:
- Organization names and basic details
- Any contact information mentioned (names, titles, emails, phones)
- Brand identity elements if available`,

      document: `Extract ALL organizations and their contacts from business documents, especially RFPs and proposals.

Focus on:
- Organization names (companies, agencies, non-profits, etc.)
- ALL contact persons mentioned (names, titles, departments, contact info)
- Point of contact information (emails, phones, addresses)
- Decision makers and key stakeholders
- Organizational relationships (client vs vendors vs partners)

Prioritize the PRIMARY organization as the one that:
1. Is issuing the RFP or requirement
2. Is the main client or customer
3. Has the most detailed contact information`,

      website: `Extract comprehensive organization and contact information from website content.

Focus on:
- Company details and positioning
- Leadership team and key personnel
- Contact information (emails, phones, addresses)
- Team members and their roles
- Customer service contacts
- Sales and support contacts`,

      chat: `Extract organization and contact info from conversational content for CRM purposes.

Focus on:
- Organization names mentioned in context
- People names and their roles/titles
- Contact details shared in conversation
- Business relationships and connections`,

      rfp: `Extract organization and contact information from RFP documents with special attention to procurement context.

Focus on:
- Issuing organization (government agency, company, etc.)
- Procurement contacts and contracting officers
- Technical points of contact
- Administrative contacts
- Submission contacts and deadlines
- Vendor registration contacts`,

      proposal: `Extract client organization and contact information from proposal documents.

Focus on:
- Client organization details
- Key stakeholders and decision makers
- Project managers and technical contacts
- Contract administrators
- Implementation team contacts`
    };

    let prompt = `${basePrompt}\n\n${contextPrompts[options.context]}`;

    // Add confidence scoring guidelines
    prompt += `\n\nFor each organization and contact, assign confidence scores:
- 1.0: Clearly stated with complete details
- 0.8: Clearly stated with good details
- 0.6: Mentioned with some details
- 0.4: Implied or referenced with minimal details
- 0.2: Uncertain or ambiguous reference

CONTACT REQUIREMENTS:
- Extract ALL named individuals associated with each organization
- Include titles, departments, and contact information when available
- If no specific contacts are mentioned for an organization, create a "General Contact" entry
- Mark the most important contact as isPrimary: true`;

    // Add optional field guidelines
    if (options.includeColors) {
      prompt += `\n\nFor brand colors: Analyze brand identity and return hex color codes. Use null if uncertain.`;
    }

    if (options.includeCulture) {
      prompt += `\n\nFor mission/vision/values: Extract these elements if explicitly mentioned.`;
    }

    if (options.includeHistory) {
      prompt += `\n\nFor historical information: Include founding dates, milestones, awards if mentioned.`;
    }

    if (options.includeDetailedContacts) {
      prompt += `\n\nFor detailed contacts: Include LinkedIn profiles, bios, backgrounds, and detailed professional information when available.`;
    }

    return prompt;
  }

  /**
   * Build context-specific user prompt
   */
  private buildUserPrompt(content: string, options: OrganizationContactExtractionOptions): string {
    let truncatedContent = content;
    if (options.truncateContent) {
        truncatedContent = content.length > 8000 
        ? content.slice(0, 8000) + '\n\n[Content continues...]'
        : content;
    }

    let prompt = `Extract organization and contact information from this ${options.context} content:\n\n${truncatedContent}`;

    if (options.maxOrganizations && options.maxOrganizations > 1) {
      prompt += `\n\nFind up to ${options.maxOrganizations} organizations with their contacts.`;
    }

    if (options.confidenceThreshold) {
      prompt += `\n\nOnly include organizations and contacts with confidence >= ${options.confidenceThreshold}.`;
    }

    prompt += `\n\nREMEMBER: Every organization MUST have at least one contact. If no specific contacts are mentioned, create a general contact entry.`;

    return prompt;
  }
}

// Create singleton instance
const unifiedOrganizationContactExtractor = new UnifiedOrganizationContactExtractor();

// Export unified interface
export async function extractOrganizationsWithContacts(
  content: string,
  options: OrganizationContactExtractionOptions = { context: 'document' }
): Promise<OrganizationContactExtractionResult> {
  return unifiedOrganizationContactExtractor.extractOrganizationsWithContacts(content, options);
}

export async function extractSingleOrganizationWithContacts(
  content: string,
  options: Omit<OrganizationContactExtractionOptions, 'maxOrganizations'> = { context: 'search' }
): Promise<OrganizationWithContactsData | null> {
  return unifiedOrganizationContactExtractor.extractSingleOrganizationWithContacts(content, options);
}

export async function extractFromDocument(
  documentContent: string,
  filename?: string
): Promise<OrganizationContactExtractionResult> {
  return unifiedOrganizationContactExtractor.extractFromDocument(documentContent, filename);
}

export async function extractFromWebsite(
  webContent: string,
  options: { includeFullProfile?: boolean } = {}
): Promise<OrganizationWithContactsData | null> {
  return unifiedOrganizationContactExtractor.extractFromWebsite(webContent, options);
}

export async function extractForSearch(message: string): Promise<OrganizationWithContactsData | null> {
  return unifiedOrganizationContactExtractor.extractForSearch(message);
}

export async function extractFromRFP(
  rfpContent: string,
  filename?: string
): Promise<OrganizationContactExtractionResult> {
  return unifiedOrganizationContactExtractor.extractFromRFP(rfpContent, filename);
}

// Backward compatibility exports (map to new unified service)
export async function extractOrganizationInfo(message: string): Promise<OrganizationWithContactsData | null> {
  return extractForSearch(message);
}

export async function extractOrganizationsFromDocument(
  documentContent: string,
  filename?: string
): Promise<OrganizationContactExtractionResult> {
  return extractFromDocument(documentContent, filename);
}

export { unifiedOrganizationContactExtractor }; 
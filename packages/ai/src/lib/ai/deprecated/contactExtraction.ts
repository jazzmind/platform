import { AIService } from '../aiService';
import { MODELS } from '../models';
import { z } from 'zod';

// Feature flag for gradual rollout
const USE_UNIFIED_CONTACT_EXTRACTION = process.env.USE_UNIFIED_CONTACT_EXTRACTION === 'true';

// Unified contact schema combining all extraction needs
const unifiedContactSchema = z.object({
  name: z.string(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  
  // Contact information
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  linkedIn: z.string().nullable().optional(),
  profilePicture: z.string().nullable().optional(),
  
  // Professional information
  title: z.string().nullable().optional(),
  organization: z.string().nullable().optional(),
  organizationId: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  
  // Background & experience
  background: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  skills: z.array(z.string()).nullable().optional(),
  
  // Education & credentials
  degrees: z.array(z.string()).nullable().optional(),
  certifications: z.array(z.string()).nullable().optional(),
  
  // Work history
  pastRoles: z.array(z.object({
    company: z.string(),
    role: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  })).nullable().optional(),
  
  // Metadata
  confidence: z.number().min(0).max(1),
  isPrimary: z.boolean().nullable(),
});

const multipleContactsSchema = z.object({
  contacts: z.array(unifiedContactSchema),
  primaryContactName: z.string().nullable().optional(), // Name of primary contact
});

export interface UnifiedContactData {
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  
  // Contact information
  email?: string | null;
  phone?: string | null;
  linkedIn?: string | null;
  profilePicture?: string | null;
  
  // Professional information
  title?: string | null;
  organization?: string | null;
  organizationId?: string | null;
  department?: string | null;
  
  // Background & experience
  background?: string | null;
  bio?: string | null;
  skills?: string[] | null;
  
  // Education & credentials
  degrees?: string[] | null;
  certifications?: string[] | null;
  
  // Work history
  pastRoles?: Array<{
    company: string;
    role: string;
    startDate: string;
    endDate: string;
  }> | null;
  
  // Metadata
  confidence: number;
  isPrimary?: boolean | null;
}

export interface MultipleContactsResult {
  contacts: UnifiedContactData[];
  primaryContact?: UnifiedContactData;
}

export interface ContactExtractionOptions {
  context: 'search' | 'document' | 'website' | 'chat' | 'csv';
  includeBackground?: boolean;
  includeEducation?: boolean;
  includeWorkHistory?: boolean;
  maxContacts?: number;
  confidenceThreshold?: number;
  identifyPrimary?: boolean;
}

/**
 * Unified Contact Extraction Service
 * Consolidates all contact extraction functionality from across the codebase
 */
class UnifiedContactExtractor extends AIService {
  constructor() {
    super({
      maxRetries: 3,
      timeoutMs: 60000,
      enableLogging: true,
      enableDebugLogging: true,
      logPrefix: 'ContactExtractor',
    });
  }

  /**
   * Extract contact information from text - master method
   * Replaces extractContactInfo from searchExtraction.ts
   * Replaces extractContactsFromDocument from documentExtraction.ts 
   * Replaces extractContacts from crawlerService.ts
   */
  async extractContacts(
    content: string,
    options: ContactExtractionOptions = { context: 'document' }
  ): Promise<MultipleContactsResult> {
    this.log(`Extracting contacts from ${options.context} content (${content.length} chars)`);

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
        multipleContactsSchema,
        `extractContacts(${options.context})`,
        'contacts'
      );

      const contacts = result.contacts || [];
      let primaryContact: UnifiedContactData | undefined;

      // Find primary contact
      if (result.primaryContactName) {
        primaryContact = contacts.find(contact => contact.name === result.primaryContactName);
      }
      
      // If no primary specified but we should identify one, use highest confidence with primary role
      if (!primaryContact && options.identifyPrimary && contacts.length > 0) {
        const primaryCandidates = contacts.filter(contact => contact.isPrimary);
        if (primaryCandidates.length > 0) {
          primaryContact = primaryCandidates.reduce((prev, current) => 
            current.confidence > prev.confidence ? current : prev
          );
        } else {
          // If no isPrimary set, use highest confidence
          primaryContact = contacts.reduce((prev, current) => 
            current.confidence > prev.confidence ? current : prev
          );
        }
      }

      // Filter by confidence threshold
      const filteredContacts = options.confidenceThreshold 
        ? contacts.filter(contact => contact.confidence >= options.confidenceThreshold!)
        : contacts;

      // Limit results if specified
      const finalContacts = options.maxContacts
        ? filteredContacts.slice(0, options.maxContacts)
        : filteredContacts;

      this.log(`Extracted ${finalContacts.length} contacts, primary: ${primaryContact?.name || 'none'}`);
      
      return {
        contacts: finalContacts,
        primaryContact,
      };

    } catch (error) {
      this.log(`Contact extraction failed: ${error}`, 'warn');
      return { contacts: [] };
    }
  }

  /**
   * Extract single contact (backward compatibility)
   * Replaces extractContactInfo from searchExtraction.ts
   */
  async extractSingleContact(
    content: string,
    options: Omit<ContactExtractionOptions, 'maxContacts'> = { context: 'search' }
  ): Promise<UnifiedContactData | null> {
    const result = await this.extractContacts(content, { ...options, maxContacts: 1 });
    return result.contacts[0] || null;
  }

  /**
   * Extract contacts from document content (RFPs, requirements, etc.)
   * Replaces extractContactsFromDocument from documentExtraction.ts
   */
  async extractFromDocument(
    documentContent: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    filename?: string
  ): Promise<MultipleContactsResult> {
    return this.extractContacts(documentContent, {
      context: 'document',
      includeBackground: false,
      includeEducation: false,
      includeWorkHistory: false,
      identifyPrimary: true,
      confidenceThreshold: 0.4,
    });
  }

  /**
   * Extract contacts from website content
   * Replaces extractContacts from crawlerService.ts
   */
  async extractFromWebsite(
    webContent: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: { includeFullProfile?: boolean } = {}
  ): Promise<UnifiedContactData[]> {
    const result = await this.extractContacts(webContent, {
      context: 'website',
      includeBackground: true,
      includeEducation: false,
      includeWorkHistory: false,
      confidenceThreshold: 0.3,
    });

    return result.contacts;
  }

  /**
   * Extract contact for search/chat contexts
   * Replaces extractContactInfo from searchExtraction.ts
   */
  async extractForSearch(message: string): Promise<UnifiedContactData | null> {
    return this.extractSingleContact(message, {
      context: 'search',
      includeBackground: true,
      includeEducation: true,
      includeWorkHistory: true,
    });
  }

  /**
   * Extract contacts from CSV data
   */
  async extractFromCSV(
    headers: string[],
    rows: string[][]
  ): Promise<UnifiedContactData[]> {
    // Convert CSV to text format for AI processing
    const csvText = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    const result = await this.extractContacts(csvText, {
      context: 'csv',
      includeBackground: false,
      includeEducation: false,
      includeWorkHistory: false,
      confidenceThreshold: 0.6,
    });

    return result.contacts;
  }

  /**
   * Build context-specific system prompt
   */
  private buildSystemPrompt(options: ContactExtractionOptions): string {
    const basePrompt = `You are an expert at extracting contact information from business content.`;

    const contextPrompts = {
      search: `Your task is to extract contact information from search queries or messages for professional networking and CRM purposes.

Focus on finding:
- Full names and professional titles
- Contact information (email, phone, LinkedIn)
- Professional background and expertise
- Educational and career history if mentioned`,

      document: `Your task is to identify ALL people/contacts mentioned in business documents, especially RFPs, requirements documents, and proposals.

Focus on finding:
- Full names of people
- Email addresses and phone numbers
- Job titles and roles
- Department or organization affiliations
- Primary contact indicators (project manager, main contact, etc.)

Mark isPrimary as true for contacts that are explicitly identified as:
- Project managers
- Main points of contact
- Decision makers
- Contract administrators`,

      website: `Your task is to extract contact information from website content, especially team pages, about pages, and contact sections.

Focus on finding:
- Real people (not company names)
- Professional titles and roles
- Contact information if clearly stated
- Brief professional descriptions or bios
- Department or team affiliations`,

      chat: `Your task is to extract contact information from conversational content for CRM and relationship building purposes.

Focus on finding:
- Names of people mentioned in conversation
- Professional context and relationships
- Contact details if shared
- Professional roles and organizations`,

      csv: `Your task is to extract and structure contact information from CSV data for import into a CRM system.

Focus on finding:
- Names in various column formats
- Email addresses and phone numbers
- Job titles and company affiliations
- Any additional professional information available`
    };

    let prompt = `${basePrompt}\n\n${contextPrompts[options.context]}`;

    // Add confidence scoring guidelines
    prompt += `\n\nFor each contact, assign a confidence score:
- 1.0: Complete contact details with name, email, and role
- 0.8: Name and either email or clear professional title
- 0.6: Name with some additional professional detail
- 0.4: Name mentioned in context but minimal details
- 0.2: Unclear or ambiguous person reference`;

    // Add optional field guidelines
    if (options.includeBackground) {
      prompt += `\n\nFor background/bio: Include professional summary or key expertise areas. Keep concise (1-2 sentences).`;
    }

    if (options.includeEducation) {
      prompt += `\n\nFor education: Include degrees and certifications if mentioned. List in array format.`;
    }

    if (options.includeWorkHistory) {
      prompt += `\n\nFor work history: Include previous roles with company, position, and dates if available.`;
    }

    if (options.identifyPrimary) {
      prompt += `\n\nFor primary contact identification: Mark isPrimary=true for main decision makers, project managers, or key points of contact.`;
    }

    return prompt;
  }

  /**
   * Build context-specific user prompt
   */
  private buildUserPrompt(content: string, options: ContactExtractionOptions): string {
    const truncatedContent = content.length > 8000 
      ? content.slice(0, 8000) + '\n\n[Content continues...]'
      : content;

    let prompt = `Extract contact information from this ${options.context} content:\n\n${truncatedContent}`;

    if (options.maxContacts && options.maxContacts > 1) {
      prompt += `\n\nFind up to ${options.maxContacts} contacts mentioned.`;
    }

    if (options.confidenceThreshold) {
      prompt += `\n\nOnly include contacts with confidence >= ${options.confidenceThreshold}.`;
    }

    if (options.identifyPrimary) {
      prompt += `\n\nIdentify the primary contact if possible (main point of contact, decision maker, project manager).`;
    }

    return prompt;
  }

  /**
   * Generate fallback contact using heuristics
   */
  generateFallbackContact(content: string): UnifiedContactData | null {
    // Simple pattern matching for email addresses
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = content.match(emailRegex);
    
    if (emails && emails.length > 0) {
      const email = emails[0];
      // Try to extract name from email
      const namePart = email.split('@')[0];
      const name = namePart.replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      return {
        name,
        email,
        confidence: 0.3,
        background: 'Extracted using pattern matching fallback',
      };
    }

    return null;
  }
}

// Create singleton instance
const unifiedContactExtractor = new UnifiedContactExtractor();

// Export unified interface (replaces all previous contact extraction functions)
export async function extractContacts(
  content: string,
  options: ContactExtractionOptions = { context: 'document' }
): Promise<MultipleContactsResult> {
  if (USE_UNIFIED_CONTACT_EXTRACTION) {
    return unifiedContactExtractor.extractContacts(content, options);
  } else {
    // Fallback to legacy implementations during migration
    if (options.context === 'search') {
      const { extractContactInfo } = await import('../searchExtraction');
      const legacyResult = await extractContactInfo(content);
      
      return {
        contacts: [{
          name: legacyResult.name,
          organization: legacyResult.organization,
          title: legacyResult.title,
          linkedIn: legacyResult.linkedIn,
          profilePicture: legacyResult.profilePicture,
          email: legacyResult.email,
          phone: legacyResult.phone,
          background: legacyResult.background,
          skills: legacyResult.skills,
          degrees: legacyResult.degrees,
          certifications: legacyResult.certifications,
          pastRoles: legacyResult.pastRoles,
          confidence: 0.8, // Legacy doesn't provide confidence
        }],
      };
    } else if (options.context === 'document') {
      const { extractContactsFromDocument } = await import('../documentExtraction');
      const legacyResults = await extractContactsFromDocument(content);
      
      const contacts: UnifiedContactData[] = legacyResults.map(contact => ({
        name: contact.name,
        email: contact.email,
        title: contact.title,
        phone: contact.phone,
        department: contact.department,
        isPrimary: contact.isPrimary,
        confidence: contact.confidence,
      }));

      const primaryContact = contacts.find(c => c.isPrimary);

      return {
        contacts,
        primaryContact,
      };
    } else {
      // For website and other contexts, use document extraction as fallback
      const { extractContactsFromDocument } = await import('../documentExtraction');
      const legacyResults = await extractContactsFromDocument(content);
      
      const contacts: UnifiedContactData[] = legacyResults.map(contact => ({
        name: contact.name,
        email: contact.email,
        title: contact.title,
        phone: contact.phone,
        department: contact.department,
        confidence: contact.confidence,
      }));

      return { contacts };
    }
  }
}

export async function extractSingleContact(
  content: string,
  options: Omit<ContactExtractionOptions, 'maxContacts'> = { context: 'search' }
): Promise<UnifiedContactData | null> {
  return unifiedContactExtractor.extractSingleContact(content, options);
}

export async function extractFromDocument(
  documentContent: string,
  filename?: string
): Promise<MultipleContactsResult> {
  return unifiedContactExtractor.extractFromDocument(documentContent, filename);
}

export async function extractFromWebsite(
  webContent: string,
  options: { includeFullProfile?: boolean } = {}
): Promise<UnifiedContactData[]> {
  return unifiedContactExtractor.extractFromWebsite(webContent, options);
}

export async function extractForSearch(message: string): Promise<UnifiedContactData | null> {
  return unifiedContactExtractor.extractForSearch(message);
}

export async function extractFromCSV(
  headers: string[],
  rows: string[][]
): Promise<UnifiedContactData[]> {
  return unifiedContactExtractor.extractFromCSV(headers, rows);
}

// Legacy compatibility functions
export async function extractContactInfo(message: string): Promise<UnifiedContactData | null> {
  return extractForSearch(message);
}

export async function extractContactsFromDocument(
  documentContent: string,
  filename?: string
): Promise<UnifiedContactData[]> {
  const result = await extractFromDocument(documentContent, filename);
  return result.contacts;
}

// Export the service instance for advanced usage
export { unifiedContactExtractor, UnifiedContactExtractor };
export default unifiedContactExtractor; 
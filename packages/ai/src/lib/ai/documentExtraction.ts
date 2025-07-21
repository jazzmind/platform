import { MODELS } from './models';
import { z } from 'zod';
import { AIService } from './aiService';

// Interface for extracted organization data
export interface ExtractedOrganizationData {
  name: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  sector?: string;
  size?: string;
  description?: string;
  confidence: number;
}

// Interface for extracted contact data
export interface ExtractedContactData {
  name: string;
  email?: string;
  title?: string;
  phone?: string;
  department?: string;
  isPrimary?: boolean;
  confidence: number;
}

// Response schema for organization extraction
const organizationExtractionSchema = z.object({
  organizations: z.array(z.object({
    name: z.string(),
    website: z.string().nullable(),
    address: z.object({
      street: z.string().nullable(),
      city: z.string().nullable(),
      state: z.string().nullable(),
      zip: z.string().nullable(),
      country: z.string().nullable(),
    }).nullable(),
    sector: z.string().nullable(),
    size: z.string().nullable(),
    description: z.string().nullable(),
    confidence: z.number().min(0).max(1),
  })),
  primaryOrganization: z.string().nullable(), // Name of the primary organization
});

// Response schema for contact extraction
const contactExtractionSchema = z.object({
  contacts: z.array(z.object({
    name: z.string(),
    email: z.string().nullable(),
    title: z.string().nullable(),
    phone: z.string().nullable(),
    department: z.string().nullable(),
    isPrimary: z.boolean(),
    confidence: z.number().min(0).max(1),
  })),
});

// Response schema for document type analysis
// const documentTypeSchema = z.object({
//   documentType: z.enum(['rfp', 'requirements', 'proposal', 'other']),
//   confidence: z.number().min(0).max(1),
//   suggestions: z.array(z.string()),
// });

// Response schema for pricing information extraction
const pricingExtractionSchema = z.object({
  estimatedBudget: z.number().nullable(),
  pricingBasis: z.enum(['capped_budget', 'value_priced', 'quality_priced', 'speed_priced']).nullable(),
  procurementType: z.enum(['sole_sourced', 'invitation_bid', 'open_bid_rfp']).nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

/**
 * Enhanced DocumentExtractionService extending AIService base class
 * Provides document content extraction and analysis capabilities
 */
class DocumentExtractionService extends AIService {
  constructor() {
    super({
      maxRetries: 3,
      timeoutMs: 60000, // 60 seconds for complex document extraction
      enableLogging: true,
      enableDebugLogging: true,
      logPrefix: 'DocumentExtraction',
    });
  }

  /**
   * Extract organization data from document content
   */
  async extractOrganizationsFromDocumentNew(
    documentContent: string,
    filename?: string
  ): Promise<{
    organizations: ExtractedOrganizationData[];
    primaryOrganization?: ExtractedOrganizationData;
  }> {
    this.log(`Extracting organizations from document: ${filename || 'unknown'}`);
    
    try {
      const result = await this.callAI(
        MODELS.reasoning,
        [
          {
            role: 'system',
            content: `You are an expert at extracting organization information from business documents, especially RFPs, requirements documents, and proposals.

Your task is to identify ALL organizations mentioned in the document and determine which is the PRIMARY organization (the one issuing the RFP or the main client).

Focus on finding:
- Organization names (companies, government agencies, non-profits, etc.)
- Contact information (websites, addresses, phone numbers)
- Organization details (sector/industry, size indicators, descriptions)
- Organizational relationships (who is the client vs vendors vs partners)

For each organization, assign a confidence score:
- 1.0: Clearly stated organization with complete details
- 0.8: Clearly stated organization with some details
- 0.6: Organization mentioned with minimal details
- 0.4: Organization implied or referenced indirectly
- 0.2: Uncertain or ambiguous organization reference

Prioritize the PRIMARY organization as the one that:
1. Is issuing the RFP or requirement
2. Is the main client or customer
3. Has the most detailed contact information
4. Is mentioned most prominently in the document`
          },
          {
            role: 'user',
            content: `Extract organization information from this document:

Filename: ${filename || 'Document'}

Content:
${documentContent.slice(0, 8000)} ${documentContent.length > 8000 ? '...' : ''}`
          }
        ],
        organizationExtractionSchema,
        `extractOrganizationsFromDocument(${filename})`,
        'organizations'
      );
      
      if (!result || !result.organizations) {
        return { organizations: [] };
      }

      // Transform to our interface format
      const organizations: ExtractedOrganizationData[] = result.organizations.map(org => ({
        name: org.name,
        website: org.website || undefined,
        address: org.address ? {
          street: org.address.street || undefined,
          city: org.address.city || undefined,
          state: org.address.state || undefined,
          zip: org.address.zip || undefined,
          country: org.address.country || undefined,
        } : undefined,
        sector: org.sector || undefined,
        size: org.size || undefined,
        description: org.description || undefined,
        confidence: org.confidence,
      }));

      // Find primary organization
      let primaryOrganization: ExtractedOrganizationData | undefined;
      if (result.primaryOrganization) {
        primaryOrganization = organizations.find(org => org.name === result.primaryOrganization);
      }
      
      // If no primary specified, use the one with highest confidence
      if (!primaryOrganization && organizations.length > 0) {
        primaryOrganization = organizations.reduce((prev, current) => 
          current.confidence > prev.confidence ? current : prev
        );
      }

      this.log(`Extracted ${organizations.length} organizations, primary: ${primaryOrganization?.name || 'none'}`);
      
      return {
        organizations,
        primaryOrganization,
      };

    } catch (error) {
      this.log(`Organization extraction failed: ${error}`, 'warn');
      return { organizations: [] };
    }
  }

  /**
   * Extract contact data from document content
   */
  async extractContactsFromDocument(
    documentContent: string,
    filename?: string
  ): Promise<ExtractedContactData[]> {
    this.log(`Extracting contacts from document: ${filename || 'unknown'}`);
    
    try {
      const result = await this.callAI(
        MODELS.reasoning,
        [
          {
            role: 'system',
            content: `You are an expert at extracting contact information from business documents, especially RFPs, requirements documents, and proposals.

Your task is to identify ALL people/contacts mentioned in the document.

Focus on finding:
- Full names of people
- Email addresses
- Job titles and roles
- Phone numbers
- Department or organization affiliations
- Primary contact indicators (project manager, main contact, etc.)

For each contact, assign a confidence score:
- 1.0: Complete contact details with name, email, and role
- 0.8: Name and either email or title
- 0.6: Name with some additional detail
- 0.4: Name mentioned in context but minimal details
- 0.2: Unclear or ambiguous person reference

Mark isPrimary as true for contacts that are explicitly identified as:
- Project managers
- Main points of contact
- Decision makers
- Contract administrators`
          },
          {
            role: 'user',
            content: `Extract contact information from this document:

Filename: ${filename || 'Document'}

Content:
${documentContent.slice(0, 8000)} ${documentContent.length > 8000 ? '...' : ''}`
          }
        ],
        contactExtractionSchema,
        `extractContactsFromDocument(${filename})`,
        'contacts'
      );

      if (!result || !result.contacts) {
        return [];
      }

      // Transform to our interface format
      const contacts: ExtractedContactData[] = result.contacts.map(contact => ({
        name: contact.name,
        email: contact.email || undefined,
        title: contact.title || undefined,
        phone: contact.phone || undefined,
        department: contact.department || undefined,
        isPrimary: contact.isPrimary || false,
        confidence: contact.confidence,
      }));

      this.log(`Extracted ${contacts.length} contacts`);
      
      return contacts;

    } catch (error) {
      this.log(`Contact extraction failed: ${error}`, 'warn');
      return [];
    }
  }

  /**
   * Analyze document type
   */
//   async analyzeDocumentType(
//     documentContent: string,
//     filename?: string
//   ): Promise<{
//     documentType: 'rfp' | 'requirements' | 'proposal' | 'other';
//     confidence: number;
//     suggestions: string[];
//   }> {
//     this.log(`Analyzing document type: ${filename || 'unknown'}`);

//     try {
//       const result = await this.callAI(
//         MODELS.reasoning,
//         [
//           {
//             role: 'system',
//             content: `You are an expert at analyzing business documents to determine their type and purpose.

// Document Types:
// - 'rfp': Request for Proposal - formal documents soliciting bids for projects
// - 'requirements': Requirements documents - detailed specifications and needs
// - 'proposal': Proposal documents - responses to RFPs or unsolicited proposals
// - 'other': Any other type of business document

// Analyze the document structure, language, and content to determine the type.
// Provide confidence score (0-1) and actionable suggestions for next steps.`
//           },
//           {
//             role: 'user',
//             content: `Analyze this document type:

// Filename: ${filename || 'Document'}

// Content:
// ${documentContent.slice(0, 4000)} ${documentContent.length > 4000 ? '...' : ''}`
//           }
//         ],
//         documentTypeSchema,
//         `analyzeDocumentType(${filename})`,
//         'documentType'
//       );

//       return {
//         documentType: result.documentType,
//         confidence: result.confidence,
//         suggestions: result.suggestions || []
//       };

//     } catch (error) {
//       this.log(`Document type analysis failed: ${error}`, 'warn');
//       return {
//         documentType: 'other',
//         confidence: 0.5,
//         suggestions: ['Manual review recommended due to analysis error']
//       };
//     }
//   }

  /**
   * Extract pricing information from document content
   */
  async extractPricingInformation(
    documentContent: string,
    filename?: string
  ): Promise<{
    estimatedBudget?: number;
    pricingBasis?: 'capped_budget' | 'value_priced' | 'quality_priced' | 'speed_priced';
    procurementType?: 'sole_sourced' | 'invitation_bid' | 'open_bid_rfp';
    confidence: number;
    reasoning: string;
  }> {
    this.log(`Extracting pricing information from document: ${filename || 'unknown'}`);
    
    try {
      const result = await this.callAI(
        MODELS.reasoning,
        [
          {
            role: 'system',
            content: `You are an expert at extracting pricing and procurement information from business documents, especially RFPs, requirements documents, and proposals.

Your task is to identify:
1. Budget information (specific dollar amounts mentioned)
2. Pricing basis indicators
3. Procurement type indicators

PRICING BASIS (choose ONE that best fits):
- 'capped_budget': Fixed budget constraints, "not to exceed", budget ceiling mentioned
- 'value_priced': Value-based pricing, ROI-focused, outcomes-based pricing
- 'quality_priced': Premium pricing for high quality, "best in class", quality-focused
- 'speed_priced': Premium for faster delivery, urgent timelines, expedited delivery

PROCUREMENT TYPE (choose ONE that best fits):
- 'sole_sourced': Direct award, single vendor, no competition mentioned
- 'invitation_bid': Invitation only, limited vendor pool, selected vendors only
- 'open_bid_rfp': Open competition, public RFP, competitive bidding process

Look for language patterns like:
- Budget: "budget of $X", "not to exceed $Y", "estimated cost"
- Basis: "fixed price", "value-based", "premium quality", "expedited delivery"
- Procurement: "sole source", "invitation only", "competitive bid", "public RFP"

Assign confidence based on how explicitly these are stated in the document.`
          },
          {
            role: 'user',
            content: `Extract pricing information from this document:

Filename: ${filename || 'Document'}

Content:
${documentContent.slice(0, 8000)} ${documentContent.length > 8000 ? '...' : ''}`
          }
        ],
        pricingExtractionSchema,
        `extractPricingInformation(${filename})`,
        'pricingInfo'
      );

      return {
        estimatedBudget: result.estimatedBudget || undefined,
        pricingBasis: result.pricingBasis || undefined,
        procurementType: result.procurementType || undefined,
        confidence: result.confidence,
        reasoning: result.reasoning
      };

    } catch (error) {
      this.log(`Pricing extraction failed: ${error}`, 'warn');
      return {
        confidence: 0.3,
        reasoning: 'Pricing extraction failed, manual review required'
      };
    }
  }

  /**
   * Extract both organization and contact data in one comprehensive analysis
   */
  async extractOrganizationAndContactData(
    documentContent: string,
    filename?: string
  ): Promise<{
    organizations: ExtractedOrganizationData[];
    primaryOrganization?: ExtractedOrganizationData;
    contacts: ExtractedContactData[];
    // extractionSummary: {
    //   documentType: 'rfp' | 'requirements' | 'proposal' | 'other';
    //   confidence: number;
    //   suggestions: string[];
    // };
  }> {
    this.log(`Starting comprehensive extraction for: ${filename || 'unknown'}`);

    try {
      // Run all extractions in parallel for efficiency
      const [orgData, contacts] = await Promise.all([
        this.extractOrganizationsFromDocumentNew(documentContent, filename),
        this.extractContactsFromDocument(documentContent, filename),
        // this.analyzeDocumentType(documentContent, filename)
      ]);

      return {
        organizations: orgData.organizations,
        primaryOrganization: orgData.primaryOrganization,
        contacts,
        //extractionSummary: docTypeAnalysis
      };

    } catch (error) {
      this.log(`Comprehensive extraction failed: ${error}`, 'warn');
      return {
        organizations: [],
        contacts: [],
        // extractionSummary: {
        //   documentType: 'other',
        //   confidence: 0.3,
        //   suggestions: ['Extraction failed, manual review required']
        // }
      };
    }
  }

  /**
   * Extract entities from CSV data using AI analysis
   */
  async extractEntitiesFromCSV(
    headers: string[], 
    rows: string[][]
  ): Promise<{
    opportunities: CSVOpportunityData[];
    contacts: CSVContactData[];
    organizations: CSVOrganizationData[];
  }> {
    if (!rows.length) {
      return { opportunities: [], contacts: [], organizations: [] };
    }

    this.log(`Extracting entities from CSV with ${headers.length} columns and ${rows.length} rows`);

    // Enhanced AI prompt for CSV field mapping and entity extraction
    const analysisPrompt = `You are a data analysis expert specializing in business relationship mapping. Analyze this CSV data to extract opportunities, contacts, and organizations.

CSV Headers: ${headers.join(', ')}

Sample data rows (first 3):
${rows.slice(0, 3).map((row, i) => `Row ${i + 1}: ${row.join(' | ')}`).join('\n')}

Your task:
1. Map CSV columns to entity fields based on semantic meaning
2. Extract and structure the data into opportunities, contacts, and organizations
3. Create proper relationships between entities

Expected output structure:
- Each opportunity should have: title, value (numeric), status, description, organizationId, contactId
- Each contact should have: name, firstName, lastName, email, title, organizationId  
- Each organization should have: name, and should be deduplicated by name

Special instructions:
- Parse currency values (e.g., "$10,000" -> 10000)
- Split full names into firstName/lastName where possible
- Link contacts to organizations by company name
- Link opportunities to both organizations and contacts
- Deduplicate organizations by name (case-insensitive)
- If multiple opportunities share the same contact/org, reuse the same IDs

Return a JSON object with the exact structure specified in the schema.`;

    try {
      const result = await this.callAI(
        MODELS.reasoning,
        [
          {
            role: 'system',
            content: 'You are a CSV data analysis expert. Extract and structure data according to the user\'s requirements.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        csvExtractionSchema,
        'extractEntitiesFromCSV',
        'csv_extraction'
      );

      if (result?.extractedData) {
        this.log(`Successfully extracted ${result.extractedData.opportunities?.length || 0} opportunities, ${result.extractedData.contacts?.length || 0} contacts, ${result.extractedData.organizations?.length || 0} organizations`);
        return {
          opportunities: result.extractedData.opportunities || [],
          contacts: result.extractedData.contacts || [],
          organizations: result.extractedData.organizations || []
        };
      }

      // Fallback extraction if AI doesn't provide extractedData
      this.log('AI extraction incomplete, using fallback');
      return fallbackCSVExtraction(headers, rows);

    } catch (error) {
      this.log(`CSV extraction failed: ${error}`, 'warn');
      return fallbackCSVExtraction(headers, rows);
    }
  }
}

// Create singleton instance
const documentExtractionService = new DocumentExtractionService();

// Export legacy functions for backward compatibility
export async function extractOrganizationsFromDocument(
  documentContent: string,
  filename?: string
): Promise<{
  organizations: ExtractedOrganizationData[];
  primaryOrganization?: ExtractedOrganizationData;
}> {
  return documentExtractionService.extractOrganizationsFromDocumentNew(documentContent, filename);
}

export async function extractContactsFromDocument(
  documentContent: string,
  filename?: string
): Promise<ExtractedContactData[]> {
  return documentExtractionService.extractContactsFromDocument(documentContent, filename);
}

export async function extractOrganizationAndContactData(
  documentContent: string,
  filename?: string
): Promise<{
  organizations: ExtractedOrganizationData[];
  primaryOrganization?: ExtractedOrganizationData;
  contacts: ExtractedContactData[];
  // extractionSummary: {
  //   documentType: 'rfp' | 'requirements' | 'proposal' | 'other';
  //   confidence: number;
  //   suggestions: string[];
  // };
}> {
  return documentExtractionService.extractOrganizationAndContactData(documentContent, filename);
}

export async function extractPricingInformation(
  documentContent: string,
  filename?: string
): Promise<{
  estimatedBudget?: number;
  pricingBasis?: 'capped_budget' | 'value_priced' | 'quality_priced' | 'speed_priced';
  procurementType?: 'sole_sourced' | 'invitation_bid' | 'open_bid_rfp';
  confidence: number;
  reasoning: string;
}> {
  return documentExtractionService.extractPricingInformation(documentContent, filename);
}

// Response schema for CSV extraction
const csvExtractionSchema = z.object({
  fieldMapping: z.object({
    opportunityFields: z.array(z.object({
      column: z.string(),
      field: z.string(),
      confidence: z.number().min(0).max(1)
    })),
    contactFields: z.array(z.object({
      column: z.string(),
      field: z.string(),
      confidence: z.number().min(0).max(1)
    })),
    organizationFields: z.array(z.object({
      column: z.string(),
      field: z.string(),
      confidence: z.number().min(0).max(1)
    }))
  }),
  entityStructure: z.object({
    hasOpportunities: z.boolean(),
    hasContacts: z.boolean(),
    hasOrganizations: z.boolean(),
    linkingStrategy: z.string()
  }),
  extractedData: z.object({
    opportunities: z.array(z.object({
      id: z.string().optional(),
      title: z.string(),
      value: z.number().nullable().optional(),
      status: z.string().optional(),
      description: z.string().nullable().optional(),
      contactId: z.string().optional(),
      organizationId: z.string().optional(),
      notes: z.string().nullable().optional(),
      actionItem: z.string().nullable().optional(),
      lastContact: z.string().nullable().optional(),
      stage: z.string().nullable().optional()
    })),
    contacts: z.array(z.object({
      id: z.string().optional(),
      name: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      title: z.string().nullable().optional(),
      organization: z.string().nullable().optional(),
      organizationId: z.string().optional(),
      linkedin: z.string().nullable().optional(),
      skills: z.array(z.string()).optional()
    })),
    organizations: z.array(z.object({
      id: z.string().optional(),
      name: z.string(),
      website: z.string().nullable().optional(),
      sector: z.string().nullable().optional(),
      size: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      address: z.object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        country: z.string().optional()
      }).nullable().optional()
    }))
  })
});

// Interfaces for CSV extraction data
export interface CSVOpportunityData {
  id?: string;
  title: string;
  value?: number | null;
  status?: string;
  description?: string | null;
  contactId?: string;
  organizationId?: string;
  notes?: string | null;
  actionItem?: string | null;
  lastContact?: string | null;
  stage?: string | null;
}

export interface CSVContactData {
  id?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  organization?: string | null;
  organizationId?: string;
  linkedin?: string | null;
  skills?: string[];
}

export interface CSVOrganizationData {
  id?: string;
  name: string;
  website?: string | null;
  sector?: string | null;
  size?: string | null;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;
  description?: string | null;
}

/**
 * Fallback CSV extraction using pattern matching
 */
function fallbackCSVExtraction(headers: string[], rows: string[][]): {
  opportunities: CSVOpportunityData[];
  contacts: CSVContactData[];
  organizations: CSVOrganizationData[];
} {
  const opportunities: CSVOpportunityData[] = [];
  const contacts: CSVContactData[] = [];
  const organizations: CSVOrganizationData[] = [];
  
  // Known header mappings for this specific CSV
  const titleIndex = headers.findIndex(h => h.includes('opportunity') || h.includes('description'));
  const valueIndex = headers.findIndex(h => h.includes('size') || h.includes('project'));
  const contactIndex = headers.findIndex(h => h.includes('contact') || h.includes('person'));
  const companyIndex = headers.findIndex(h => h.includes('company') || h.includes('name'));
  const titleFieldIndex = headers.findIndex(h => h === 'title');
  const emailIndex = headers.findIndex(h => h.includes('email'));
  const stageIndex = headers.findIndex(h => h.includes('stage'));
  const notesIndex = headers.findIndex(h => h.includes('notes'));
  const actionItemIndex = headers.findIndex(h => h.includes('action item'));
  const lastContactIndex = headers.findIndex(h => h.includes('last contact'));

  const orgMap = new Map<string, CSVOrganizationData>();
  let orgCounter = 1;
  let contactCounter = 1;
  let oppCounter = 1;

  for (const row of rows) {
    if (!row[titleIndex]?.trim()) continue;

    // Extract organization
    let organization: CSVOrganizationData | undefined;
    if (companyIndex !== -1 && row[companyIndex]?.trim()) {
      const orgName = row[companyIndex].trim();
      const orgKey = orgName.toLowerCase();
      
      if (!orgMap.has(orgKey)) {
        organization = {
          id: `org_${orgCounter++}`,
          name: orgName
        };
        organizations.push(organization);
        orgMap.set(orgKey, organization);
      } else {
        organization = orgMap.get(orgKey);
      }
    }

    // Extract contact
    let contact: CSVContactData | undefined;
    if (contactIndex !== -1 && row[contactIndex]?.trim()) {
      const fullName = row[contactIndex].trim();
      const nameParts = fullName.split(' ');
      
      contact = {
        id: `contact_${contactCounter++}`,
        name: fullName,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: emailIndex !== -1 ? row[emailIndex]?.trim() || null : null,
        title: titleFieldIndex !== -1 ? row[titleFieldIndex]?.trim() || null : null,
        organizationId: organization?.id || undefined,
        organization: organization?.name || null
      };
      contacts.push(contact);
    }

    // Extract opportunity
    const title = row[titleIndex].trim();
    
    // Parse value
    let value: number | null = null;
    if (valueIndex !== -1 && row[valueIndex]?.trim()) {
      const valueStr = row[valueIndex].trim();
      const cleaned = valueStr.replace(/[$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) {
        value = parsed;
      }
    }

    const opportunity: CSVOpportunityData = {
      id: `opp_${oppCounter++}`,
      title,
      value,
      status: stageIndex !== -1 ? row[stageIndex]?.trim() || 'unknown' : 'unknown',
      organizationId: organization?.id || undefined,
      contactId: contact?.id || undefined,
      notes: notesIndex !== -1 ? row[notesIndex]?.trim() || null : null,
      actionItem: actionItemIndex !== -1 ? row[actionItemIndex]?.trim() || null : null,
      lastContact: lastContactIndex !== -1 ? row[lastContactIndex]?.trim() || null : null,
      stage: stageIndex !== -1 ? row[stageIndex]?.trim() || null : null
    };
    
    opportunities.push(opportunity);
  }

  return { opportunities, contacts, organizations };
}

/**
 * Extract entities from CSV data using AI analysis
 */
async function extractEntitiesFromCSV(
  headers: string[], 
  rows: string[][]
): Promise<{
  opportunities: CSVOpportunityData[];
  contacts: CSVContactData[];
  organizations: CSVOrganizationData[];
}> {
  return documentExtractionService.extractEntitiesFromCSV(headers, rows);
}

// Export the service instance for new standardized usage
export { documentExtractionService, extractEntitiesFromCSV };
export default documentExtractionService; 
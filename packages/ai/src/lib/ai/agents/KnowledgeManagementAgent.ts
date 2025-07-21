/**
 * Knowledge Management Agent
 * 
 * Unifies organization and contact extraction methods from documentExtraction.ts and searchExtraction.ts.
 * Handles knowledge base operations, entity extraction, and information enrichment.
 */

import { z } from 'zod';
import { MODELS } from '../models';
import { 
  BaseAgent, 
  AgentInput, 
  AgentOutput, 
  ValidationResult, 
  AgentCapability,
  WorkflowContext 
} from './BaseAgent';

// Organization Schema
const OrganizationSchema = z.object({
  name: z.string(),
  type: z.enum(['company', 'government', 'nonprofit', 'other']),
  industry: z.string().nullable().optional(),
  size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).nullable().optional(),
  website: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  locations: z.array(z.object({
    address: z.string(),
    city: z.string(),
    state: z.string().nullable().optional(),
    country: z.string(),
    isPrimary: z.boolean()
  })).nullable().optional(),
  confidence: z.number().min(0).max(1)
});

// Contact Schema
const ContactSchema = z.object({
  name: z.string(),
  title: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  organization: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  role: z.enum(['primary', 'secondary', 'technical', 'decision_maker', 'stakeholder']).nullable().optional(),
  confidence: z.number().min(0).max(1)
});

// Knowledge Extraction Schema
const KnowledgeExtractionSchema = z.object({
  organizations: z.array(OrganizationSchema),
  contacts: z.array(ContactSchema),
  relationships: z.array(z.object({
    type: z.enum(['works_at', 'partner_with', 'client_of', 'vendor_to', 'competitor_of']),
    from: z.string(),
    to: z.string(),
    confidence: z.number().min(0).max(1)
  })),
  keyTopics: z.array(z.object({
    topic: z.string(),
    relevance: z.number().min(0).max(1),
    category: z.string()
  })),
  extractedFacts: z.array(z.object({
    fact: z.string(),
    source: z.string(),
    confidence: z.number().min(0).max(1)
  }))
});

// Knowledge Enrichment Schema
const KnowledgeEnrichmentSchema = z.object({
  enrichedOrganizations: z.array(OrganizationSchema.extend({
    additionalInfo: z.object({
      revenueEstimate: z.string().optional(),
      employeeCount: z.string().optional(),
      foundedYear: z.number().optional(),
      stockSymbol: z.string().optional(),
      parentCompany: z.string().optional()
    }).optional()
  })),
  enrichedContacts: z.array(ContactSchema.extend({
    additionalInfo: z.object({
      linkedin: z.string().optional(),
      yearsInRole: z.number().optional(),
      previousRoles: z.array(z.string()).optional(),
      education: z.string().optional()
    }).optional()
  })),
  suggestedConnections: z.array(z.object({
    type: z.string(),
    description: z.string(),
    entities: z.array(z.string())
  }))
});

interface KnowledgeManagementInput {
  type: 'extract_knowledge' | 'enrich_knowledge' | 'search_knowledge' | 'analyze_relationships';
  content?: string;
  document?: {
    text: string;
    metadata: {
      filename?: string;
      source?: string;
      contentType?: string;
    };
  };
  entities?: {
    organizations?: unknown[];
    contacts?: unknown[];
  };
  searchQuery?: string;
  enrichmentContext?: {
    source: string;
    includePublicData: boolean;
    depth: 'basic' | 'detailed' | 'comprehensive';
  };
}

export class KnowledgeManagementAgent extends BaseAgent {
  constructor() {
    const capabilities: AgentCapability[] = [
      {
        name: 'knowledge_extraction',
        description: 'Extract organizations, contacts, and relationships from documents',
        inputTypes: ['text/plain', 'application/pdf', 'application/json'],
        outputTypes: ['knowledge_extraction'],
        requirements: ['content', 'document'],
      },
      {
        name: 'knowledge_enrichment',
        description: 'Enrich extracted entities with additional information',
        inputTypes: ['application/json'],
        outputTypes: ['knowledge_enrichment'],
        requirements: ['entities'],
      },
      {
        name: 'knowledge_search',
        description: 'Search existing knowledge base for relevant information',
        inputTypes: ['text/plain'],
        outputTypes: ['search_results'],
        requirements: ['searchQuery'],
      },
      {
        name: 'relationship_analysis',
        description: 'Analyze relationships between entities',
        inputTypes: ['application/json'],
        outputTypes: ['relationship_analysis'],
        requirements: ['entities'],
      },
    ];

    super('knowledge_management', {
      enabled: true,
      maxRetries: 3,
      timeoutMs: 60000,
      enableLogging: true,
      enableDebugLogging: true,
      logPrefix: 'KNOWLEDGE_MGMT',
      capabilities,
    });
  }

  validate(input: AgentInput): ValidationResult {
    const data = input.data as unknown as KnowledgeManagementInput;
    
    if (!data.type) {
      return {
        isValid: false,
        errors: ['Operation type is required'],
        warnings: [],
      };
    }

    switch (data.type) {
      case 'extract_knowledge':
        if (!data.content && !data.document) {
          return {
            isValid: false,
            errors: ['Either content or document is required for knowledge extraction'],
            warnings: [],
          };
        }
        break;
      
      case 'enrich_knowledge':
        if (!data.entities) {
          return {
            isValid: false,
            errors: ['entities are required for knowledge enrichment'],
            warnings: [],
          };
        }
        break;
      
      case 'search_knowledge':
        if (!data.searchQuery) {
          return {
            isValid: false,
            errors: ['searchQuery is required for knowledge search'],
            warnings: [],
          };
        }
        break;
      
      case 'analyze_relationships':
        if (!data.entities) {
          return {
            isValid: false,
            errors: ['entities are required for relationship analysis'],
            warnings: [],
          };
        }
        break;
    }

    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const data = input.data as unknown as KnowledgeManagementInput;
    
    try {
      this.log(`Executing ${data.type} operation`);
      
      switch (data.type) {
        case 'extract_knowledge':
          return await this.extractKnowledge(data);
        
        case 'enrich_knowledge':
          return await this.enrichKnowledge(data);
        
        case 'search_knowledge':
          return await this.searchKnowledge(data);
        
        case 'analyze_relationships':
          return await this.analyzeRelationships(data);
        
        default:
          throw new Error(`Unknown operation type: ${data.type}`);
      }
    } catch (error) {
      this.log(`Error in ${data.type}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return this.createErrorOutput(
        error instanceof Error ? error : new Error('Unknown error occurred'),
        { operationType: data.type }
      );
    }
  }

  private async extractKnowledge(
    data: KnowledgeManagementInput,
    _?: WorkflowContext
  ): Promise<AgentOutput> {
    const content = data.content || data.document?.text || '';
    const documentContext = data.document?.metadata || {};
    
    const systemPrompt = `You are an expert knowledge extractor for ProposalHub.
    
    Extract the following information from the provided content:
    1. Organizations mentioned (companies, government agencies, nonprofits)
    2. Contacts and their details (name, title, email, phone, organization)
    3. Relationships between entities
    4. Key topics and themes
    5. Important facts and insights
    
    Focus on:
    - Business entities and their characteristics
    - Decision makers and stakeholders
    - Contact information and organizational hierarchy
    - Industry context and market information
    - Partnership and vendor relationships
    
    Document context: ${JSON.stringify(documentContext)}`;

    const userPrompt = `Extract knowledge from the following content:
    
    ${content}
    
    Please provide comprehensive extraction with high confidence scores for clear entities and lower scores for ambiguous ones.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt }
    ];

    const result = await this.callAI(
      MODELS.default,
      messages,
      KnowledgeExtractionSchema,
      'extractKnowledge',
      'knowledge_extraction'
    );

    this.log(`Knowledge extracted: ${result.organizations.length} organizations, ${result.contacts.length} contacts`);

    return {
      success: true,
      data: {
        knowledgeExtraction: result,
        summary: {
          organizationCount: result.organizations.length,
          contactCount: result.contacts.length,
          relationshipCount: result.relationships.length,
          topicCount: result.keyTopics.length,
        },
      },
    };
  }

  private async enrichKnowledge(
    data: KnowledgeManagementInput,
    _context?: WorkflowContext
  ): Promise<AgentOutput> {
    const entities = data.entities || { organizations: [], contacts: [] };
    const enrichmentContext = data.enrichmentContext || {
      source: 'internal',
      includePublicData: false,
      depth: 'basic'
    };
    
    const systemPrompt = `You are a knowledge enrichment specialist for ProposalHub.
    
    Enrich the provided organizations and contacts with additional information:
    1. For organizations: industry details, size estimates, financial information
    2. For contacts: role context, experience level, decision-making authority
    3. Suggest potential connections and relationships
    4. Provide context about market position and competitive landscape
    
    Enrichment context: ${JSON.stringify(enrichmentContext)}
    
    Use your knowledge to fill in missing details and provide strategic insights.`;

    const userPrompt = `Enrich the following entities:
    
    Organizations: ${JSON.stringify(entities.organizations)}
    Contacts: ${JSON.stringify(entities.contacts)}
    
    Provide enriched information that would be valuable for business development and proposal creation.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt }
    ];

    const result = await this.callAI(
      MODELS.default,
      messages,
      KnowledgeEnrichmentSchema,
      'enrichKnowledge',
      'knowledge_enrichment'
    );

    this.log(`Knowledge enriched: ${result.enrichedOrganizations.length} organizations, ${result.enrichedContacts.length} contacts`);

    return {
      success: true,
      data: {
        knowledgeEnrichment: result,
        enrichmentMetrics: {
          organizationsEnriched: result.enrichedOrganizations.length,
          contactsEnriched: result.enrichedContacts.length,
          suggestedConnections: result.suggestedConnections.length,
        },
      },
    };
  }

  private async searchKnowledge(
    data: KnowledgeManagementInput,
    _context?: WorkflowContext
  ): Promise<AgentOutput> {
    const searchQuery = data.searchQuery || '';
    
    // This would typically integrate with the actual knowledge base
    // For now, providing a structured approach to knowledge search
    
    const searchResults = await this.performKnowledgeSearch(searchQuery);
    
    this.log(`Knowledge search completed: ${searchResults.length} results for "${searchQuery}"`);

    return {
      success: true,
      data: {
        searchResults,
        searchQuery,
        searchMetrics: {
          resultCount: searchResults.length,
          searchTime: Date.now(),
        },
      },
    };
  }

  private async analyzeRelationships(
    data: KnowledgeManagementInput,
    _context?: WorkflowContext
  ): Promise<AgentOutput> {
    const entities = data.entities || { organizations: [], contacts: [] };
    
    const systemPrompt = `You are a relationship analyzer for ProposalHub.
    
    Analyze the relationships between the provided entities:
    1. Identify direct relationships (employment, partnerships, etc.)
    2. Infer potential relationships based on context
    3. Assess relationship strength and importance
    4. Suggest strategic relationship opportunities
    
    Focus on business-relevant relationships that could impact:
    - Decision-making processes
    - Influence networks
    - Partnership opportunities
    - Competitive dynamics`;

    const userPrompt = `Analyze relationships between these entities:
    
    Organizations: ${JSON.stringify(entities.organizations)}
    Contacts: ${JSON.stringify(entities.contacts)}
    
    Provide comprehensive relationship analysis with confidence scores.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt }
    ];

    const relationshipAnalysis = await this.callAI(
      MODELS.default,
      messages,
      z.object({
        relationships: z.array(z.object({
          type: z.string(),
          from: z.string(),
          to: z.string(),
          strength: z.number().min(0).max(1),
          confidence: z.number().min(0).max(1),
          description: z.string()
        })),
        networkInsights: z.object({
          keyInfluencers: z.array(z.string()),
          decisionMakers: z.array(z.string()),
          strategicOpportunities: z.array(z.string())
        }),
        recommendations: z.array(z.object({
          type: z.string(),
          description: z.string(),
          priority: z.number().min(1).max(5)
        }))
      }),
      'analyzeRelationships',
      'relationship_analysis'
    );

    this.log(`Relationship analysis completed: ${relationshipAnalysis.relationships.length} relationships identified`);

    return {
      success: true,
      data: {
        relationshipAnalysis,
        networkMetrics: {
          relationshipCount: relationshipAnalysis.relationships.length,
          keyInfluencers: relationshipAnalysis.networkInsights.keyInfluencers.length,
          opportunities: relationshipAnalysis.recommendations.length,
        },
      },
    };
  }

  private async performKnowledgeSearch(query: string): Promise<unknown[]> {
    // This would integrate with the actual knowledge base
    // For now, returning a structured placeholder
    return [
      {
        id: 'search-result-1',
        type: 'organization',
        title: 'Search Result 1',
        content: `Knowledge base entry related to: ${query}`,
        relevance: 0.8,
        source: 'knowledge_base',
        lastUpdated: new Date().toISOString(),
      },
    ];
  }

  // Convenience methods for common operations
  async quickExtraction(content: string, documentType?: string): Promise<unknown> {
    const input: AgentInput = {
      data: {
        type: 'extract_knowledge',
        content,
        document: {
          text: content,
          metadata: {
            contentType: documentType || 'text/plain',
          },
        },
      },
    };

    const result = await this.execute(input);
    return result.success ? result.data.knowledgeExtraction : null;
  }

  async quickEnrichment(organizations: unknown[], contacts: unknown[]): Promise<unknown> {
    const input: AgentInput = {
      data: {
        type: 'enrich_knowledge',
        entities: {
          organizations,
          contacts,
        },
        enrichmentContext: {
          source: 'public',
          includePublicData: true,
          depth: 'detailed',
        },
      },
    };

    const result = await this.execute(input);
    return result.success ? result.data.knowledgeEnrichment : null;
  }

  async quickSearch(query: string): Promise<unknown[]> {
    const input: AgentInput = {
      data: {
        type: 'search_knowledge',
        searchQuery: query,
      },
    };

    const result = await this.execute(input);
    return result.success ? (result.data.searchResults as unknown[]) : [];
  }
} 
import { embeddingService } from './embeddingService';
import { VectorDatabase } from '../database/prisma/vectorDatabase';
import { 
  getOpportunitiesByContactId, 
  getContactsByOrganizationId, 
  getOrganizationsByContactId,
  getProposalsByContactId
} from '../database';
import type { OpportunityRecord } from '../../types/opportunity';
import type { ContactRecord } from '../../types/contact';
import type { OrganizationRecord } from '../../types/organization';
import type { ProposalRecord } from '../../types/proposal';
import type { VectorSearchResult } from '../database/prisma/vectorDatabase';

export interface EntityIndexResult {
  indexed: number;
  skipped: number;
  errors: string[];
}

export interface SemanticMatch {
  entityType: 'opportunity' | 'proposal' | 'contact' | 'organization' | 'knowledge';
  entityId: string;
  title: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

/**
 * Create searchable content for an opportunity
 */
function createOpportunitySearchContent(opportunity: OpportunityRecord): string {
  const estimateValue = (opportunity.estimate as { value?: number })?.value || 0;
  
  const parts = [
    opportunity.title || '',
    opportunity.status || '',
    opportunity.team?.map(t => t.email).join(' ') || '',
    opportunity.tasks?.map(t => `${t.title} ${t.description || ''}`).join(' ') || '',
    estimateValue ? `$${estimateValue.toLocaleString()} value` : '',
    opportunity.organizationId || '',
    opportunity.forContactId || '',
  ].filter(Boolean);

  return parts.join(' ').trim();
}

/**
 * Create searchable content for a proposal
 */
function createProposalSearchContent(proposal: ProposalRecord): string {
  const parts = [
    proposal.title || '',
    proposal.status || '',
    proposal.ownerOrganizationId || '',
    proposal.forOrganizationId || '',
    proposal.forContactId || '',
    proposal.opportunityId || '',
    // Add any other relevant proposal fields
  ].filter(Boolean);

  return parts.join(' ').trim();
}

/**
 * Create searchable content for a contact
 */
function createContactSearchContent(contact: ContactRecord): string {
  const parts = [
    contact.firstName || '',
    contact.lastName || '',
    contact.email || '',
    contact.title || '',
    contact.organizationId || '',
    contact.background || '',
    contact.phone || '',
    contact.linkedIn || '',
  ].filter(Boolean);

  return parts.join(' ').trim();
}

/**
 * Create searchable content for an organization
 */
function createOrganizationSearchContent(organization: OrganizationRecord): string {
  const parts = [
    organization.name || '',
    organization.website || '',
    organization.sector || '',
    organization.size || '',
    organization.background || '',
    organization.address?.street || '',
    organization.address?.city || '',
    organization.address?.state || '',
  ].filter(Boolean);

  return parts.join(' ').trim();
}

/**
 * Index a single opportunity in the vector database
 */
export async function indexOpportunity(
  opportunity: OpportunityRecord,
  organizationId: string
): Promise<void> {
  const vectorDb = new VectorDatabase();
  
  // Create searchable content
  const searchContent = createOpportunitySearchContent(opportunity);
  
  if (!searchContent.trim()) {
    console.log(`Skipping opportunity ${opportunity.id} - no content to index`);
    return;
  }

  try {
    // Generate embedding
    const embedding = await embeddingService.generateEmbedding(searchContent);
    
    // Store in vector database
    await vectorDb.createVector({
      entityType: 'opportunity' as const,
      entityId: opportunity.id,
      sourceEntityType: 'entity_index',
      sourceEntityId: `opportunity-${opportunity.id}`,
      content: searchContent,
      vector: embedding,
      metadata: {
        title: opportunity.title || '',
        status: opportunity.status || '',
        estimatedValue: (opportunity.estimate as { value?: number })?.value || 0,
        organizationId,
        entityType: 'opportunity',
        extractedAt: new Date().toISOString(),
      }
    });
    
    console.log(`✅ Indexed opportunity: ${opportunity.title} (${opportunity.id})`);
  } catch (error) {
    console.error(`❌ Error indexing opportunity ${opportunity.id}:`, error);
    throw error;
  }
}

/**
 * Index a single proposal in the vector database
 */
export async function indexProposal(
  proposal: ProposalRecord,
  organizationId: string
): Promise<void> {
  const vectorDb = new VectorDatabase();
  
  // Create searchable content
  const searchContent = createProposalSearchContent(proposal);
  
  if (!searchContent.trim()) {
    console.log(`Skipping proposal ${proposal.id} - no content to index`);
    return;
  }

  try {
    // Generate embedding
    const embedding = await embeddingService.generateEmbedding(searchContent);
    
    // Store in vector database
    await vectorDb.createVector({
      entityType: 'proposal' as const,
      entityId: proposal.id,
      sourceEntityType: 'entity_index',
      sourceEntityId: `proposal-${proposal.id}`,
      content: searchContent,
      vector: embedding,
      metadata: {
        title: proposal.title || '',
        status: proposal.status || '',
        organizationId,
        entityType: 'proposal',
        extractedAt: new Date().toISOString(),
      }
    });
    
    console.log(`✅ Indexed proposal: ${proposal.title} (${proposal.id})`);
  } catch (error) {
    console.error(`❌ Error indexing proposal ${proposal.id}:`, error);
    throw error;
  }
}

/**
 * Index a single contact in the vector database
 */
export async function indexContact(
  contact: ContactRecord,
  organizationId: string
): Promise<void> {
  const vectorDb = new VectorDatabase();
  
  // Create searchable content
  const searchContent = createContactSearchContent(contact);
  
  if (!searchContent.trim()) {
    console.log(`Skipping contact ${contact.id} - no content to index`);
    return;
  }

  try {
    // Generate embedding
    const embedding = await embeddingService.generateEmbedding(searchContent);
    
    // Store in vector database - use 'organization' as entityType since contact isn't in the allowed types
    await vectorDb.createVector({
      entityType: 'organization' as const,
      entityId: contact.id,
      sourceEntityType: 'entity_index',
      sourceEntityId: `contact-${contact.id}`,
      content: searchContent,
      vector: embedding,
      metadata: {
        title: `${contact.firstName} ${contact.lastName}`.trim(),
        email: contact.email || '',
        jobTitle: contact.title || '',
        organizationId,
        entityType: 'contact',
        extractedAt: new Date().toISOString(),
      }
    });
    
    console.log(`✅ Indexed contact: ${contact.firstName} ${contact.lastName} (${contact.id})`);
  } catch (error) {
    console.error(`❌ Error indexing contact ${contact.id}:`, error);
    throw error;
  }
}

/**
 * Index a single organization in the vector database
 */
export async function indexOrganization(
  organization: OrganizationRecord,
  organizationId: string
): Promise<void> {
  const vectorDb = new VectorDatabase();
  
  // Create searchable content
  const searchContent = createOrganizationSearchContent(organization);
  
  if (!searchContent.trim()) {
    console.log(`Skipping organization ${organization.id} - no content to index`);
    return;
  }

  try {
    // Generate embedding
    const embedding = await embeddingService.generateEmbedding(searchContent);
    
    // Store in vector database
    await vectorDb.createVector({
      entityType: 'organization' as const,
      entityId: organization.id,
      sourceEntityType: 'entity_index',
      sourceEntityId: `organization-${organization.id}`,
      content: searchContent,
      vector: embedding,
      metadata: {
        title: organization.name || '',
        website: organization.website || '',
        sector: organization.sector || '',
        size: organization.size || '',
        organizationId,
        entityType: 'organization',
        extractedAt: new Date().toISOString(),
      }
    });
    
    console.log(`✅ Indexed organization: ${organization.name} (${organization.id})`);
  } catch (error) {
    console.error(`❌ Error indexing organization ${organization.id}:`, error);
    throw error;
  }
}

/**
 * Index all entities for a contact
 */
export async function indexAllEntitiesForContact(contactId: string): Promise<EntityIndexResult> {
  console.log(`🔄 Starting comprehensive entity indexing for contact: ${contactId}`);
  
  const result: EntityIndexResult = {
    indexed: 0,
    skipped: 0,
    errors: []
  };

  try {
    // Get user's organizations for context
    const organizations = await getOrganizationsByContactId(contactId);
    const primaryOrgId = organizations[0]?.id || contactId;

    // Index opportunities
    console.log(`🔍 Indexing opportunities...`);
    const opportunities = await getOpportunitiesByContactId(contactId);
    
    if (opportunities && opportunities.length > 0) {
      for (const opportunity of opportunities) {
        try {
          await indexOpportunity(opportunity as OpportunityRecord, primaryOrgId);
          result.indexed++;
        } catch (error) {
          result.errors.push(`Opportunity ${opportunity.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Index proposals
    console.log(`🔍 Indexing proposals...`);
    const proposals = await getProposalsByContactId(contactId);
    
    if (proposals && proposals.length > 0) {
      for (const proposal of proposals) {
        try {
          await indexProposal(proposal as ProposalRecord, primaryOrgId);
          result.indexed++;
        } catch (error) {
          result.errors.push(`Proposal ${proposal.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Index contacts and organizations for each organization
    for (const org of organizations) {
      console.log(`🔍 Indexing contacts for organization: ${org.name}`);
      const contacts = await getContactsByOrganizationId(org.id);
      
      if (contacts && contacts.length > 0) {
        for (const contact of contacts) {
          try {
            await indexContact(contact as ContactRecord, org.id);
            result.indexed++;
          } catch (error) {
            result.errors.push(`Contact ${contact.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Index the organization itself
      try {
        await indexOrganization(org as OrganizationRecord, org.id);
        result.indexed++;
      } catch (error) {
        result.errors.push(`Organization ${org.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`✅ Entity indexing complete for contact: ${contactId}`);
    console.log(`   Indexed: ${result.indexed}, Skipped: ${result.skipped}, Errors: ${result.errors.length}`);
    
    return result;
  } catch (error) {
    console.error(`❌ Critical error during entity indexing for contact ${contactId}:`, error);
    result.errors.push(`Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Clear all entity index vectors for a contact
 */
export async function clearEntityIndex(contactId: string): Promise<void> {
  console.log(`🧹 Clearing entity index for contact: ${contactId}`);
  
  const vectorDb = new VectorDatabase();
  
  try {
    // Delete all vectors with sourceEntityType 'entity_index'
    // Use specific method for deleting by source if available
    if ('deleteVectorsBySource' in vectorDb && typeof vectorDb.deleteVectorsBySource === 'function') {
      await (vectorDb as any).deleteVectorsBySource('entity_index', contactId);
      console.log(`✅ Cleared entity index vectors for contact ${contactId}`);
    } else {
      // Fallback: search and delete individually
      const existingVectors = await vectorDb.searchSimilar(
        new Array(1536).fill(0), // Dummy embedding for search
        undefined, // entityType
        undefined, // entityId
        'entity_index', // sourceEntityType
        1000, // limit
        0 // threshold
      );

      let deletedCount = 0;
      for (const vector of existingVectors) {
        if (vector.sourceEntityType === 'entity_index' && 'deleteVectorsBySource' in vectorDb) {
          await (vectorDb as any).deleteVectorsBySource('entity_index', vector.sourceEntityId);
          deletedCount++;
        }
      }
      console.log(`✅ Cleared ${deletedCount} entity index vectors`);
    }
  } catch (error) {
    console.error(`❌ Error clearing entity index:`, error);
    throw error;
  }
}

/**
 * Search for entities using semantic similarity
 */
export async function searchEntitiesVector(
  query: string,
  entityTypes?: string[],
  limit: number = 10
): Promise<SemanticMatch[]> {
  const vectorDb = new VectorDatabase();
  
  try {
    // Generate embedding for search query
    const queryEmbedding = await embeddingService.generateEmbedding(query);
    
    // Search similar vectors
    const results = await vectorDb.searchSimilar(
      queryEmbedding,
      undefined, // entityType (search all)
      undefined, // entityId (search all)
      'entity_index', // sourceEntityType
      limit,
      0.3 // similarity threshold
    );

    return results.map((result: VectorSearchResult) => ({
      entityType: (result.metadata.entityType as string) || result.entityType || 'unknown',
      entityId: result.entityId,
      title: (result.metadata.title as string) || '',
      similarity: result.similarity,
      metadata: result.metadata
    })).filter(match => {
      // Filter by entityTypes if specified
      if (entityTypes && entityTypes.length > 0) {
        return entityTypes.includes(match.entityType);
      }
      return true;
    }) as SemanticMatch[];
  } catch (error) {
    console.error(`❌ Error searching entities:`, error);
    return [];
  }
}

/**
 * Determine user intent based on semantic matches
 */
export async function determineIntentFromContext(
  query: string,
  limit: number = 5
): Promise<{
  intent: 'analyze_opportunity' | 'analyze_proposal' | 'search_contacts' | 'search_organizations' | 'search_opportunities' | 'search_proposals' | 'general_chat';
  confidence: number;
  matches: SemanticMatch[];
  suggestedAction: {
    action: string;
    parameters: Record<string, unknown>;
  };
}> {
  // Search for relevant entities
  const matches = await searchEntitiesVector(query, undefined, limit);
  
  if (matches.length === 0) {
    return {
      intent: 'general_chat',
      confidence: 0.5,
      matches,
      suggestedAction: {
        action: 'general_chat',
        parameters: { query }
      }
    };
  }

  // Analyze matches to determine intent
  const topMatch = matches[0];
  
  // If we have a high-confidence match for a specific entity
  if (topMatch.similarity > 0.7) {
    switch (topMatch.entityType) {
      case 'opportunity':
        return {
          intent: 'analyze_opportunity',
          confidence: topMatch.similarity,
          matches,
          suggestedAction: {
            action: 'analyze_opportunity',
            parameters: {
              opportunityId: topMatch.entityId,
              opportunityTitle: topMatch.title
            }
          }
        };
      
      case 'proposal':
        return {
          intent: 'analyze_proposal',
          confidence: topMatch.similarity,
          matches,
          suggestedAction: {
            action: 'analyze_proposal',
            parameters: {
              proposalId: topMatch.entityId,
              proposalTitle: topMatch.title
            }
          }
        };
      
      case 'contact':
        return {
          intent: 'search_contacts',
          confidence: topMatch.similarity,
          matches,
          suggestedAction: {
            action: 'search_contacts',
            parameters: {
              query: topMatch.title
            }
          }
        };
      
      case 'organization':
        return {
          intent: 'search_organizations',
          confidence: topMatch.similarity,
          matches,
          suggestedAction: {
            action: 'search_organizations',
            parameters: {
              query: topMatch.title
            }
          }
        };
    }
  }

  // If we have multiple matches, suggest search based on most common entity type
  const entityCounts = matches.reduce((acc, match) => {
    acc[match.entityType] = (acc[match.entityType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostCommonEntityType = Object.entries(entityCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0];

  const averageConfidence = matches.reduce((sum, match) => sum + match.similarity, 0) / matches.length;

  switch (mostCommonEntityType) {
    case 'opportunity':
      return {
        intent: 'search_opportunities',
        confidence: averageConfidence,
        matches,
        suggestedAction: {
          action: 'search_opportunities',
          parameters: { query }
        }
      };
    
    case 'proposal':
      return {
        intent: 'search_proposals',
        confidence: averageConfidence,
        matches,
        suggestedAction: {
          action: 'search_proposals',
          parameters: { query }
        }
      };
    
    case 'contact':
      return {
        intent: 'search_contacts',
        confidence: averageConfidence,
        matches,
        suggestedAction: {
          action: 'search_contacts',
          parameters: { query }
        }
      };
    
    case 'organization':
      return {
        intent: 'search_organizations',
        confidence: averageConfidence,
        matches,
        suggestedAction: {
          action: 'search_organizations',
          parameters: { query }
        }
      };
    
    default:
      return {
        intent: 'general_chat',
        confidence: 0.5,
        matches,
        suggestedAction: {
          action: 'general_chat',
          parameters: { query }
        }
      };
  }
} 
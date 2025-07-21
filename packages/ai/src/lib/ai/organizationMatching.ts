import type { Organization } from '@/src/types/organization';
import type { Contact } from '@/src/types/contact';
import { searchOrganizations } from '@/src/lib/database';
import { searchContacts } from '@/src/lib/database';
import type { ExtractedOrganizationData, ExtractedContactData } from './documentExtraction';

// Interfaces for matching results
export interface OrganizationMatch {
  extractedData: ExtractedOrganizationData;
  existingOrganization?: Organization;
  matchConfidence: number;
  matchType: 'exact' | 'fuzzy' | 'new';
  suggestedAction: 'use_existing' | 'update_existing' | 'create_new';
  matchedFields: string[];
}

export interface ContactMatch {
  extractedData: ExtractedContactData;
  existingContact?: Contact;
  matchConfidence: number;
  matchType: 'exact' | 'fuzzy' | 'new';
  suggestedAction: 'use_existing' | 'update_existing' | 'create_new';
  matchedFields: string[];
  suggestedOrganizationId?: string;
}

export interface MatchingResult {
  organizationMatches: OrganizationMatch[];
  contactMatches: ContactMatch[];
  recommendedPrimary: {
    organizationId?: string;
    contactId?: string;
  };
  processingNotes: string[];
}

/**
 * Main function to match extracted data with existing database records
 */
export async function matchExtractedData(
  extractedOrganizations: ExtractedOrganizationData[],
  extractedContacts: ExtractedContactData[],
  primaryOrganization?: ExtractedOrganizationData,
  userOrganizationId?: string
): Promise<MatchingResult> {
  console.log('Starting matching process...');
  console.log(`Processing ${extractedOrganizations.length} organizations and ${extractedContacts.length} contacts`);

  const processingNotes: string[] = [];
  
  // Match organizations first
  const organizationMatches = await Promise.all(
    extractedOrganizations.map(org => matchOrganization(org))
  );

  // Match contacts, using organization matches for context
  const contactMatches = await Promise.all(
    extractedContacts.map(contact => matchContact(contact, organizationMatches, userOrganizationId))
  );

  // Determine recommended primary records
  const recommendedPrimary = determineRecommendedPrimary(
    organizationMatches,
    contactMatches,
    primaryOrganization
  );

  // Generate processing notes
  if (organizationMatches.some(m => m.matchType === 'new')) {
    processingNotes.push('New organizations will be created');
  }
  if (organizationMatches.some(m => m.suggestedAction === 'update_existing')) {
    processingNotes.push('Some existing organizations may be updated with new information');
  }
  if (contactMatches.some(m => m.matchType === 'new')) {
    processingNotes.push('New contacts will be created');
  }
  if (primaryOrganization) {
    processingNotes.push(`Primary organization identified: ${primaryOrganization.name}`);
  }

  return {
    organizationMatches,
    contactMatches,
    recommendedPrimary,
    processingNotes,
  };
}

/**
 * Match a single extracted organization with existing database records
 */
async function matchOrganization(
  extractedOrg: ExtractedOrganizationData
): Promise<OrganizationMatch> {
  try {
    // Search for existing organizations by name
    const searchResults = await searchOrganizations(extractedOrg.name);
    
    if (searchResults.length === 0) {
      return {
        extractedData: extractedOrg,
        matchConfidence: 0,
        matchType: 'new',
        suggestedAction: 'create_new',
        matchedFields: [],
      };
    }

    // Find the best match
    let bestMatch: Organization | undefined;
    let bestScore = 0;
    let matchedFields: string[] = [];

    for (const org of searchResults) {
      const { score, fields } = calculateOrganizationMatchScore(extractedOrg, org);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = org;
        matchedFields = fields;
      }
    }

    if (!bestMatch) {
      return {
        extractedData: extractedOrg,
        matchConfidence: 0,
        matchType: 'new',
        suggestedAction: 'create_new',
        matchedFields: [],
      };
    }

    // Determine match type and suggested action
    let matchType: 'exact' | 'fuzzy' | 'new';
    let suggestedAction: 'use_existing' | 'update_existing' | 'create_new';

    if (bestScore >= 0.9) {
      matchType = 'exact';
      suggestedAction = hasNewInformation(extractedOrg, bestMatch) ? 'update_existing' : 'use_existing';
    } else if (bestScore >= 0.7) {
      matchType = 'fuzzy';
      suggestedAction = 'update_existing';
    } else {
      matchType = 'new';
      suggestedAction = 'create_new';
    }

    return {
      extractedData: extractedOrg,
      existingOrganization: bestMatch,
      matchConfidence: bestScore,
      matchType,
      suggestedAction,
      matchedFields,
    };

  } catch (error) {
    console.error('Error matching organization:', error);
    return {
      extractedData: extractedOrg,
      matchConfidence: 0,
      matchType: 'new',
      suggestedAction: 'create_new',
      matchedFields: [],
    };
  }
}

/**
 * Match a single extracted contact with existing database records
 */
async function matchContact(
  extractedContact: ExtractedContactData,
  organizationMatches: OrganizationMatch[],
  userOrganizationId?: string
): Promise<ContactMatch> {
  try {
    // Enhanced contact matching - try multiple strategies
    let searchResults: Contact[] = [];
    
    // Strategy 1: Exact email match (highest priority)
    if (extractedContact.email) {
      searchResults = await searchContacts(extractedContact.email, userOrganizationId);
      console.log(`[ContactMatching] Email search for "${extractedContact.email}" found ${searchResults.length} results`);
    }
    
    // Strategy 2: If no email matches, try exact name match
    if (searchResults.length === 0) {
      searchResults = await searchContacts(extractedContact.name, userOrganizationId);
      console.log(`[ContactMatching] Name search for "${extractedContact.name}" found ${searchResults.length} results`);
    }
    
    // Strategy 3: If still no matches and we have both email and name, try broader search
    if (searchResults.length === 0 && extractedContact.email) {
      // Try searching without organization filter to find contacts across all orgs
      const globalResults = await searchContacts(extractedContact.email);
      console.log(`[ContactMatching] Global email search for "${extractedContact.email}" found ${globalResults.length} results`);
      
      // Filter for same organization if we have one
      if (userOrganizationId) {
        searchResults = globalResults.filter(contact => contact.organizationId === userOrganizationId);
      } else {
        searchResults = globalResults;
      }
    }

    if (searchResults.length === 0) {
      // Suggest organization based on matching results
      const suggestedOrganizationId = findSuggestedOrganizationForContact(
        extractedContact,
        organizationMatches
      );

      return {
        extractedData: extractedContact,
        matchConfidence: 0,
        matchType: 'new',
        suggestedAction: 'create_new',
        matchedFields: [],
        suggestedOrganizationId,
      };
    }

    // Find the best match
    let bestMatch: Contact | undefined;
    let bestScore = 0;
    let matchedFields: string[] = [];

    for (const contact of searchResults) {
      const { score, fields } = calculateContactMatchScore(extractedContact, contact);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = contact;
        matchedFields = fields;
      }
    }

    if (!bestMatch) {
      const suggestedOrganizationId = findSuggestedOrganizationForContact(
        extractedContact,
        organizationMatches
      );

      return {
        extractedData: extractedContact,
        matchConfidence: 0,
        matchType: 'new',
        suggestedAction: 'create_new',
        matchedFields: [],
        suggestedOrganizationId,
      };
    }

    // Determine match type and suggested action with stricter thresholds for better matching
    let matchType: 'exact' | 'fuzzy' | 'new';
    let suggestedAction: 'use_existing' | 'update_existing' | 'create_new';

    // For email matches, be more confident about existing contacts
    const hasEmailMatch = matchedFields.includes('email');
    const hasNameMatch = matchedFields.includes('name');

    if (hasEmailMatch && bestScore >= 0.8) {
      // Strong email match - very likely the same person
      matchType = 'exact';
      suggestedAction = hasNewContactInformation(extractedContact, bestMatch) ? 'update_existing' : 'use_existing';
      console.log(`[ContactMatching] Strong email match for ${extractedContact.name} (score: ${bestScore})`);
    } else if (hasNameMatch && bestScore >= 0.9) {
      // Very high name match - likely the same person
      matchType = 'exact';
      suggestedAction = hasNewContactInformation(extractedContact, bestMatch) ? 'update_existing' : 'use_existing';
      console.log(`[ContactMatching] Strong name match for ${extractedContact.name} (score: ${bestScore})`);
    } else if (bestScore >= 0.7) {
      // Moderate match - treat as fuzzy but still use existing
      matchType = 'fuzzy';
      suggestedAction = hasNewContactInformation(extractedContact, bestMatch) ? 'update_existing' : 'use_existing';
      console.log(`[ContactMatching] Fuzzy match for ${extractedContact.name} (score: ${bestScore})`);
    } else {
      // Low confidence - create new contact
      console.log(`[ContactMatching] Low confidence match for ${extractedContact.name} (score: ${bestScore}), creating new`);
      matchType = 'new';
      suggestedAction = 'create_new';
    }

    return {
      extractedData: extractedContact,
      existingContact: bestMatch,
      matchConfidence: bestScore,
      matchType,
      suggestedAction,
      matchedFields,
    };

  } catch (error) {
    console.error('Error matching contact:', error);
    const suggestedOrganizationId = findSuggestedOrganizationForContact(
      extractedContact,
      organizationMatches
    );

    return {
      extractedData: extractedContact,
      matchConfidence: 0,
      matchType: 'new',
      suggestedAction: 'create_new',
      matchedFields: [],
      suggestedOrganizationId,
    };
  }
}

/**
 * Calculate match score between extracted and existing organization
 */
function calculateOrganizationMatchScore(
  extracted: ExtractedOrganizationData,
  existing: Organization
): { score: number; fields: string[] } {
  let score = 0;
  const matchedFields: string[] = [];
  let totalWeight = 0;

  // Name matching (highest weight)
  const nameWeight = 0.5;
  totalWeight += nameWeight;
  
  const nameScore = calculateStringMatch(extracted.name, existing.name);
  score += nameScore * nameWeight;
  if (nameScore > 0.7) matchedFields.push('name');

  // Website matching (high weight)
  if (extracted.website && existing.website) {
    const websiteWeight = 0.3;
    totalWeight += websiteWeight;
    
    const websiteScore = calculateStringMatch(extracted.website, existing.website);
    score += websiteScore * websiteWeight;
    if (websiteScore > 0.8) matchedFields.push('website');
  }

  // Sector matching (medium weight)
  if (extracted.sector && existing.sector) {
    const sectorWeight = 0.1;
    totalWeight += sectorWeight;
    
    const sectorScore = calculateStringMatch(extracted.sector, existing.sector);
    score += sectorScore * sectorWeight;
    if (sectorScore > 0.8) matchedFields.push('sector');
  }

  // Address matching (lower weight)
  if (extracted.address && existing.address) {
    const addressWeight = 0.1;
    totalWeight += addressWeight;
    
    let addressScore = 0;
    let addressComponents = 0;

    if (extracted.address.city && existing.address.city) {
      addressScore += calculateStringMatch(extracted.address.city, existing.address.city);
      addressComponents++;
    }
    if (extracted.address.state && existing.address.state) {
      addressScore += calculateStringMatch(extracted.address.state, existing.address.state);
      addressComponents++;
    }

    if (addressComponents > 0) {
      addressScore /= addressComponents;
      score += addressScore * addressWeight;
      if (addressScore > 0.8) matchedFields.push('address');
    }
  }

  // Normalize score by total weight
  return {
    score: totalWeight > 0 ? score / totalWeight : 0,
    fields: matchedFields,
  };
}

/**
 * Calculate match score between extracted and existing contact
 */
function calculateContactMatchScore(
  extracted: ExtractedContactData,
  existing: Contact
): { score: number; fields: string[] } {
  let score = 0;
  const matchedFields: string[] = [];
  let totalWeight = 0;

  // Email matching (highest weight if both present)
  if (extracted.email && existing.email) {
    const emailWeight = 0.5;
    totalWeight += emailWeight;
    
    const emailScore = calculateStringMatch(extracted.email.toLowerCase(), existing.email.toLowerCase());
    score += emailScore * emailWeight;
    if (emailScore > 0.9) matchedFields.push('email');
  }

  // Name matching (high weight)
  const nameWeight = 0.3;
  totalWeight += nameWeight;
  
  const existingName = existing.name || `${existing.firstName} ${existing.lastName}`.trim();
  const nameScore = calculateStringMatch(extracted.name, existingName);
  score += nameScore * nameWeight;
  if (nameScore > 0.7) matchedFields.push('name');

  // Title matching (medium weight)
  if (extracted.title && existing.title) {
    const titleWeight = 0.1;
    totalWeight += titleWeight;
    
    const titleScore = calculateStringMatch(extracted.title, existing.title);
    score += titleScore * titleWeight;
    if (titleScore > 0.8) matchedFields.push('title');
  }

  // Phone matching (medium weight)
  if (extracted.phone && existing.phone) {
    const phoneWeight = 0.1;
    totalWeight += phoneWeight;
    
    const phoneScore = calculatePhoneMatch(extracted.phone, existing.phone);
    score += phoneScore * phoneWeight;
    if (phoneScore > 0.9) matchedFields.push('phone');
  }

  // Normalize score by total weight
  return {
    score: totalWeight > 0 ? score / totalWeight : 0,
    fields: matchedFields,
  };
}

/**
 * Calculate string similarity using basic fuzzy matching
 */
function calculateStringMatch(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8;
  }
  
  // Basic Levenshtein distance approximation
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return 1 - editDistance / longer.length;
}

/**
 * Calculate phone number match (handles different formats)
 */
function calculatePhoneMatch(phone1: string, phone2: string): number {
  // Extract digits only
  const digits1 = phone1.replace(/\D/g, '');
  const digits2 = phone2.replace(/\D/g, '');
  
  if (digits1 === digits2) return 1.0;
  
  // Check if one is a subset of the other (e.g., +1 prefix)
  if (digits1.includes(digits2) || digits2.includes(digits1)) {
    return 0.9;
  }
  
  return 0;
}

/**
 * Basic Levenshtein distance calculation
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Check if extracted organization has new information not in existing record
 */
function hasNewInformation(
  extracted: ExtractedOrganizationData,
  existing: Organization
): boolean {
  // Check if extracted data has fields that existing record lacks
  if (extracted.website && !existing.website) return true;
  if (extracted.sector && !existing.sector) return true;
  if (extracted.size && !existing.size) return true;
  if (extracted.description && !existing.background) return true;
  
  // Check address fields
  if (extracted.address && !existing.address) return true;
  if (extracted.address && existing.address) {
    if (extracted.address.street && !existing.address.street) return true;
    if (extracted.address.city && !existing.address.city) return true;
    if (extracted.address.state && !existing.address.state) return true;
    if (extracted.address.zip && !existing.address.zip) return true;
    if (extracted.address.country && !existing.address.country) return true;
  }
  
  return false;
}

/**
 * Check if extracted contact has new information not in existing record
 */
function hasNewContactInformation(
  extracted: ExtractedContactData,
  existing: Contact
): boolean {
  if (extracted.email && !existing.email) return true;
  if (extracted.title && !existing.title) return true;
  if (extracted.phone && !existing.phone) return true;
  
  return false;
}

/**
 * Find suggested organization for a contact based on organization matches
 */
function findSuggestedOrganizationForContact(
  extractedContact: ExtractedContactData,
  organizationMatches: OrganizationMatch[]
): string | undefined {
  // If there's a primary organization match, use that
  const primaryMatch = organizationMatches.find(match => 
    match.extractedData.confidence > 0.8 && match.matchType !== 'new'
  );
  
  if (primaryMatch?.existingOrganization?.id) {
    return primaryMatch.existingOrganization.id;
  }
  
  // Otherwise, use the first organization match that exists
  const firstExistingMatch = organizationMatches.find(match => match.existingOrganization?.id);
  return firstExistingMatch?.existingOrganization?.id;
}

/**
 * Determine recommended primary organization and contact
 */
function determineRecommendedPrimary(
  organizationMatches: OrganizationMatch[],
  contactMatches: ContactMatch[],
  primaryOrganization?: ExtractedOrganizationData
): { organizationId?: string; contactId?: string } {
  let recommendedOrgId: string | undefined;
  let recommendedContactId: string | undefined;
  
  // Find primary organization
  if (primaryOrganization) {
    const primaryMatch = organizationMatches.find(match => 
      match.extractedData.name === primaryOrganization.name
    );
    recommendedOrgId = primaryMatch?.existingOrganization?.id;
  }
  
  // If no primary specified, use highest confidence existing organization
  if (!recommendedOrgId) {
    const bestOrgMatch = organizationMatches
      .filter(match => match.existingOrganization?.id)
      .sort((a, b) => b.matchConfidence - a.matchConfidence)[0];
    recommendedOrgId = bestOrgMatch?.existingOrganization?.id;
  }
  
  // Find primary contact (marked as primary or highest confidence)
  const primaryContact = contactMatches.find(match => 
    match.extractedData.isPrimary && match.existingContact?.id
  );
  
  if (primaryContact?.existingContact?.id) {
    recommendedContactId = primaryContact.existingContact.id;
  } else {
    // Use highest confidence existing contact
    const bestContactMatch = contactMatches
      .filter(match => match.existingContact?.id)
      .sort((a, b) => b.matchConfidence - a.matchConfidence)[0];
    recommendedContactId = bestContactMatch?.existingContact?.id;
  }
  
  return {
    organizationId: recommendedOrgId,
    contactId: recommendedContactId,
  };
} 
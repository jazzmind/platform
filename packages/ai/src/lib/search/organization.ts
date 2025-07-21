import { searchPerplexity } from './base';
import { OrganizationSearchResult } from '@/src/types/organization';
import { Organization } from '@/src/types/organization';
import { isUrlAccessible } from './base';
import { MODELS } from '@/src/lib/ai/models';

/**
 * Searches for organizations using both database and AI
 * @param {string} query - The search query
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<OrganizationSearchResult[]>} Array of organization results
 */
export async function searchOrganizations(query: string, limit: number = 5): Promise<OrganizationSearchResult[]> {
  // Don't search if query is too short
  if (query.trim().length < 4) {
    return [];
  }

  // Call Perplexity API to get organization details
  const model = MODELS.perplexity;
  const system = `You are a business intelligence assistant. Given an organization name, provide up to ${limit} possible organizations that match the name. Focus on real, verifiable organizations.`;
  const user = `Please provide information about organizations that match the query "${query}" in the following JSON format. Only return the JSON array, no other text or comments:
    [{
      "name": "organization name",
      "website": "organization website",
      "logoUrl": "organization logo URL",
      "sector": "industry sector",
      "size": "approximate employee count or range",
      "background": "brief one-line description",
      "primaryColor": "primary brand color hex code",
      "secondaryColor": "secondary brand color hex code"
    }...]`;
  const response = await searchPerplexity(model, system, user);

  try {
    // Strip markdown code blocks if present
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Check if response looks like JSON (starts with [ or {)
    if (!cleanResponse.startsWith('[') && !cleanResponse.startsWith('{')) {
      console.log('AI returned text instead of JSON, skipping:', cleanResponse.substring(0, 100));
      return [];
    }
    
    const organizations = JSON.parse(cleanResponse) as OrganizationSearchResult[];
    
    // Validate all logo URLs in parallel
    const validatedOrgs = await Promise.all(
      organizations.map(async (org) => {
        if (org.logoUrl) {
          const isValid = await isUrlAccessible(org.logoUrl, "image/");
          return {
            ...org,
            logoUrl: isValid ? org.logoUrl : null
          };
        }
        return org;
      })
    );

    return validatedOrgs;
  } catch (error) {
    console.error('Error parsing organization data:', error, response);
    throw new Error('Failed to parse organization data');
  }
}

export async function enrichOrganization(organization: Organization): Promise<Organization> {
  const model = MODELS.perplexity;
  const system = 'You are a business intelligence assistant. Given an organization name, provide detailed information about the organization.';
  const user = `Please provide information about the organization ${organization.name} with website ${organization.website} in the following JSON format. Only return the JSON object, no other text or comments, with null values if you don't have information:
  {
    "name": "organization name",
    "website": "organization website",
    "logoUrl": "organization logo URL",
    "sector": "industry sector",
    "size": "organization size range",
    "background": "brief organization description",
    "primaryColor": "primary brand color hex code",
    "secondaryColor": "secondary brand color hex code"
  }`;
  const response = await searchPerplexity(model, system, user);
  if (!response.ok) {
    throw new Error('Failed to get organization data');
  }
  const enrichedOrganization = JSON.parse(response);
  if (!enrichedOrganization) {
      throw new Error('No organization data returned from AI');
  }
  // map the organization to the Organization type
  return {
    ...organization,
    ...enrichedOrganization,
    updatedAt: new Date()
  } as Organization;
} 

/**
 * Extracts organization information from text using OpenAI
 */
export { extractOrganizationInfo } from '@/src/lib/ai/searchExtraction';

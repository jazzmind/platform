// lib/imageSearch.js
import { searchPerplexity } from './base';
import { Contact, ContactSearchResult } from '@/src/types/contact';
import { MODELS } from '@/src/lib/ai/models';

export async function searchContact(query: string, numResults?: number): Promise<ContactSearchResult[]> {
  const model = MODELS.perplexity;
  const system = `You are a professional networking expert. Search for information about up to ${numResults ? numResults : 5} professionals given a name and/or email. 
  Return the information in JSON format. If you don't have information about a field, return null.`;
  const user = `Please provide information about professionals who match the query "${query}" in the following JSON format. Only return the JSON array, no other text or comments, with null values if you don't have information:
    [{
      "name": "Name",
      "email": "Email",
      "organization": "Company / Organization",
      "title": "Title",
      "linkedIn": "LinkedIn URL",
      "profilePicture": "Professional headshot URL",
      "phone": "Phone number",
      "background": "Brief professional summary",
      "skills": ["skill1", "skill2"]
    }...]`;
  
  try {
    const response = await searchPerplexity(model, system, user);
    
    // Clean the response - remove markdown code blocks and extra text
    let cleanedResponse = response.trim();
    
    // Remove markdown code blocks
    cleanedResponse = cleanedResponse.replace(/```json\s*/g, '');
    cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
    
    // Remove any trailing text after the JSON array
    cleanedResponse = cleanedResponse.replace(/\]\s*[\s\S]*$/, ']');
    
    // Find the JSON array in the response
    const jsonMatch = cleanedResponse.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      console.warn('No valid JSON array found in response:', cleanedResponse);
      return [];
    }
    
    let jsonString = jsonMatch[0];
    
    // Fix common JSON issues
    jsonString = jsonString
      // Fix trailing commas
      .replace(/,(\s*[\]}])/g, '$1')
      // Fix unescaped quotes in strings
      .replace(/("(?:[^"\\]|\\.)*")\s*:\s*"([^"]*)"([^",\]\}]*?)"/g, (match: string, key: string, value: string, extra: string) => {
        if (extra.trim()) {
          return `${key}: "${value.replace(/"/g, '\\"')}${extra.replace(/"/g, '\\"')}"`;
        }
        return match;
      })
      // Remove any non-JSON characters at the end
      .replace(/[^\]\}]*$/, '');
    
    let parsedResults: ContactSearchResult[];
    
    try {
      parsedResults = JSON.parse(jsonString) as ContactSearchResult[];
    } catch (parseError) {
      console.warn('JSON parsing failed, trying to clean further:', parseError);
      console.warn('Problematic JSON:', jsonString.substring(0, 500));
      
      // Try more aggressive cleanup for malformed JSON
      try {
        // Find the opening bracket and try to properly close the JSON
        const openBracketIndex = jsonString.indexOf('[');
        if (openBracketIndex === -1) {
          console.warn('No opening bracket found');
          return [];
        }
        
        // Extract just the JSON array part
        let arrayContent = jsonString.substring(openBracketIndex);
        
        // Try to fix common issues
        arrayContent = arrayContent
          // Fix unescaped quotes in values
          .replace(/"([^"]*)":\s*"([^"]*?)"\s*([^",\]\}]+)/g, '"$1": "$2$3"')
          // Ensure proper closure for incomplete arrays
          .replace(/\s*$/, '')
          // Add closing bracket if missing
          .replace(/([^}\]]\s*)$/, '$1}]');
        
        // If still no closing bracket, add one
        if (!arrayContent.endsWith(']')) {
          // Find the last complete object
          const lastCompleteObjectMatch = arrayContent.match(/.*\}/);
          if (lastCompleteObjectMatch) {
            arrayContent = lastCompleteObjectMatch[0] + ']';
          }
        }
        
        parsedResults = JSON.parse(arrayContent) as ContactSearchResult[];
        console.log('Successfully parsed with cleanup:', parsedResults.length, 'results');
        
      } catch (finalError) {
        console.warn('Final JSON cleanup failed:', finalError);
        console.warn('Final cleaned JSON:', jsonString.substring(0, 200));
        return [];
      }
    }
    
    // Filter out invalid entries with undefined/null names
    return parsedResults.filter(contact => 
      contact && 
      contact.name && 
      contact.name.trim() !== '' && 
      contact.name !== 'undefined' &&
      contact.name !== 'null' &&
      !contact.name.includes('undefined')
    );
  } catch (error) {
    console.error('Error in searchContact:', error);
    return [];
  }
}

export async function enrichContact(contact: Contact): Promise<Contact> {
  const model = MODELS.perplexity;
  const systemPrompt = `
  You are a professional data enrichment assistant. 
  Given a person's name and optionally email, company, title, and LinkedIn URL, provide enriched professional information about them.
  `;
  console.log('contact', contact);
  // Handle case where name might be undefined - construct from firstName/lastName or use fallback
  const contactName = contact.name ? contact.name : 
    (contact.firstName && contact.lastName ? `${contact.firstName} ${contact.lastName}` : '') ||
    'Unknown';
  
  const userPrompt = `
  Please provide enriched professional information for:
  Name: ${contactName}
  ${contact.email ? `Email: ${contact.email}` : ''}
  ${contact.organization ? `Company: ${contact.organization}` : ''}
  ${contact.title ? `Title: ${contact.title}` : ''}
  ${contact.linkedIn ? `LinkedIn: ${contact.linkedIn}` : ''}
  
  Format the response as JSON object with the following structure. Only return the JSON object, no other text or comments, with null values if you don't have information:
  {
    "name": "Name",
    "organization": "Company / Organization",
    "title": "Title",
    "linkedIn": "LinkedIn URL",
    "profilePicture": "URL",
    "email": "Email",
    "phone": "Phone",
    "background": "Professional summary...",
    "skills": ["skill1", "skill2", ...],
    "degrees": ["Degree 1 from University 1", "Degree 2 from University 2", ...],
    "certifications": ["Certification 1", "Certification 2", ...],
    "pastRoles": [
      {
        "company": "Company Name",
        "role": "Job Title",
        "startDate": "Start Date (e.g., Jan 2020)",
        "endDate": "End Date (e.g., Present)"
      }
    ]
  }`;

  const response = await searchPerplexity(model, systemPrompt, userPrompt);

  try {
    // Clean the response - remove markdown code blocks
    let cleanedResponse = response.trim();
    cleanedResponse = cleanedResponse.replace(/```json\s*/g, '');
    cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
    
    // Find the JSON object in the response
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('No valid JSON object found in enrichContact response:', cleanedResponse);
      return contact;
    }
    
    const enrichedContact = JSON.parse(jsonMatch[0]) as ContactSearchResult;

    // Validate that we have a proper name
    if (!enrichedContact || 
        !enrichedContact.name || 
        enrichedContact.name === 'undefined' || 
        enrichedContact.name === 'null' ||
        enrichedContact.name.includes('undefined')) {
      return contact;
    }

    // Map the enriched contact to the Contact type
    return {
      ...contact,
      ...enrichedContact
    } as Contact;
  } catch (error) {
    console.error('Error parsing enrichContact response:', error);
    return contact;
  }
}

/**
 * Extracts contact information from text using OpenAI
 */
export { extractContactInfo } from '@/src/lib/ai/searchExtraction';
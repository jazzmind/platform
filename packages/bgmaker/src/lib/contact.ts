// lib/imageSearch.js
import { searchPerplexity } from './base';
import OpenAI from 'openai';
import { Contact, ContactSearchResult } from '@/app/types/contact';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function searchContact(query: string, numResults?: number): Promise<ContactSearchResult[]> {
  const model = 'sonar-pro';
  const system = `You are a professional networking expert. Search for information about up to ${numResults ? numResults : 5} professionals given a name and/or email. 
  Return the information in JSON format. If you don't have information about a field, return null.`;
  const user = `Please provide information about professionals who match the query "${query}" in the following JSON format. Only return the JSON array, no other text or comments, with null values if you don't have information:
    [{
      "name": "Name",
      "email": "Email",
      "organization": "Company / Organization",
      "title": "Title",
    }...]`;
  const response = await searchPerplexity(model, system, user);
  return JSON.parse(response) as ContactSearchResult[];
}

export async function enrichContact(contact: Contact): Promise<Contact> {
  const model = 'sonar-pro';
  const systemPrompt = `
  You are a professional data enrichment assistant. 
  Given a person's name and optionally email, company, title, and LinkedIn URL, provide enriched professional information about them.
  `;
  const userPrompt = `
  Please provide enriched professional information for:
  Name: ${contact.name}
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

  // gracefully handle the case where only partial contact information is returned
  const enrichedContact = JSON.parse(response) as ContactSearchResult;

  // map the contact to the Contact type
  if (!enrichedContact) {
    return contact;
  }
  // map the enriched contact to the Contact type
  return {
    ...contact,
    ...enrichedContact
  } as Contact;
}
/**
 * Extracts contact information from text using OpenAI
 */
export async function extractContactInfo(message: string): Promise<ContactSearchResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional networking expert. Extract and summarize key information about professionals. Keep the background concise but informative.
          Format the response as JSON with the following structure. Only return the JSON object, no other text or comments, with null values if you don't have information:
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
          }`
        },
        {
          role: "user",
          content: message
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from AI');
    }

    return JSON.parse(content) as ContactSearchResult;
  } catch (error) {
    console.error('Error extracting contact info:', error);
    throw error;
  }
}
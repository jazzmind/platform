import OpenAI from 'openai';
import { MODELS } from './models';
import { z } from 'zod';
import { zodTextFormat } from 'openai/helpers/zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schema definitions
const organizationResponseFormat = z.object({
  name: z.string(),
  website: z.string().nullable(),
  logoUrl: z.string().nullable(),
  sector: z.string().nullable(),
  size: z.string().nullable(),
  background: z.string().nullable(),
  primaryColor: z.string().nullable(),
  secondaryColor: z.string().nullable(),
});

const contactResponseFormat = z.object({
  name: z.string(),
  organization: z.string().nullable(),
  title: z.string().nullable(),
  linkedIn: z.string().nullable(),
  profilePicture: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  background: z.string().nullable(),
  skills: z.array(z.string()).nullable(),
  degrees: z.array(z.string()).nullable(),
  certifications: z.array(z.string()).nullable(),
  pastRoles: z.array(z.object({
    company: z.string(),
    role: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  })).nullable(),
});

const linkedInProfileResponseFormat = z.object({
  headline: z.string().nullable(),
  summary: z.string().nullable(),
  positions: z.array(z.object({
    title: z.string(),
    company: z.string(),
    description: z.string().nullable(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
  })).nullable(),
  skills: z.array(z.string()).nullable(),
  certifications: z.array(z.object({
    name: z.string(),
    authority: z.string().nullable(),
    url: z.string().nullable(),
  })).nullable(),
  education: z.array(z.object({
    school: z.string(),
    degree: z.string().nullable(),
    field: z.string().nullable(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
  })).nullable(),
});

// Export types
export type OrganizationExtraction = z.infer<typeof organizationResponseFormat>;
export type ContactExtraction = z.infer<typeof contactResponseFormat>;
export type LinkedInProfileData = z.infer<typeof linkedInProfileResponseFormat>;

/**
 * Extracts organization information from text using OpenAI responses API
 */
export async function extractOrganizationInfo(message: string): Promise<OrganizationExtraction> {
  try {
    const response = await openai.responses.parse({
      model: MODELS.default,
      input: [
        {
          role: "system",
          content: "You are a business research expert. Extract and summarize key information about organizations. Keep the background concise but informative. For colors, analyze the organization's brand and return appropriate hex color codes that match their brand identity. If unsure about colors, return null for both color fields."
        },
        {
          role: "user",
          content: message
        }
      ],
      text: { format: zodTextFormat(organizationResponseFormat, 'json_object') }
    });

    const content = response.output_parsed as z.infer<typeof organizationResponseFormat>;
    if (!content) {
      throw new Error('No content returned from AI');
    }

    return content;
  } catch (error) {
    console.error('Error extracting organization info:', error);
    throw error;
  }
}

/**
 * Extracts contact information from text using OpenAI responses API
 */
export async function extractContactInfo(message: string): Promise<ContactExtraction> {
  try {
    const response = await openai.responses.parse({
      model: MODELS.default,
      input: [
        {
          role: "system",
          content: `You are a professional networking expert. Extract and summarize key information about professionals. Keep the background concise but informative.`
        },
        {
          role: "user",
          content: message
        }
      ],
      text: { format: zodTextFormat(contactResponseFormat, 'json_object') }
    });

    const content = response.output_parsed as z.infer<typeof contactResponseFormat>;
    if (!content) {
      throw new Error('No content returned from AI');
    }

    return content;
  } catch (error) {
    console.error('Error extracting contact info:', error);
    throw error;
  }
}

/**
 * Enhances LinkedIn profile data using OpenAI responses API
 */
export async function enhanceLinkedInProfile(profileData: LinkedInProfileData): Promise<LinkedInProfileData> {
  try {
    const response = await openai.responses.parse({
      model: MODELS.default,
      input: [
        {
          role: "system",
          content: "You are a professional data curator. Clean and enhance professional profile information, maintaining the same structure but improving descriptions and standardizing formats. Return enhanced data in the same format as provided."
        },
        {
          role: "user",
          content: `Clean and enhance this professional profile data, maintaining the same structure but improving descriptions and standardizing formats:
          ${JSON.stringify(profileData, null, 2)}`
        }
      ],
      text: { format: zodTextFormat(linkedInProfileResponseFormat, 'json_object') }
    });

    const content = response.output_parsed as z.infer<typeof linkedInProfileResponseFormat>;
    if (!content) {
      throw new Error('No content returned from AI');
    }

    return content;
  } catch (error) {
    console.error('Error enhancing LinkedIn profile:', error);
    // Return original data if AI enhancement fails
    return profileData;
  }
} 
import OpenAI from 'openai';
import { MODELS } from './models';
import { z } from 'zod';
import { zodTextFormat } from 'openai/helpers/zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Section {
  id: string;
  title: string;
  content: string | Record<string, string>;
  type: 'text' | 'fields';
  images?: {
    background?: string[];
    content?: string[];
  };
}

const slideResponseFormat = z.object({
  markdown: z.string().describe("RevealJS markdown formatted slides")
});

/**
 * Generate RevealJS slides from proposal sections
 */
export async function generateSlides(sections: Section[]): Promise<string> {
  // Filter out non-text sections and organization/contact info
  const contentSections = sections.filter((s: Section) => 
    s.type === 'text' && s.id !== 'organizationInfo' && s.id !== 'contactInfo'
  );

  const response = await openai.responses.parse({
    model: MODELS.default,
    input: [
      {
        role: "system",
        content: `You are an expert at creating presentation slides. Convert the given sections into RevealJS markdown format.

Rules:
1. Use horizontal slides (---) for main sections
2. Use vertical slides (--) for subsections when content is too long
3. Keep text concise and scannable
4. Use bullet points for lists
5. Add <!-- .element: class="fragment" --> after elements that should animate in
6. Break long sections into multiple slides
7. Add presenter notes using Note: syntax
8. Use markdown formatting for emphasis
9. Each slide should have a clear heading
10. Limit content per slide (max 6 bullet points)
11. Use consistent formatting throughout
12. Include transition hints where appropriate

The output should be in RevealJS markdown format.`
      },
      {
        role: "user",
        content: JSON.stringify(contentSections.map(s => ({
          title: s.title,
          content: s.content
        })))
      }
    ],
    text: { format: zodTextFormat(slideResponseFormat, 'slides') }
  });

  const content = response.output_parsed as z.infer<typeof slideResponseFormat>;
  if (!content) {
    throw new Error('No content returned from AI');
  }

  return content.markdown;
}

/**
 * Format sections for presentation display
 */
export async function formatForPresentation(sections: Section[]): Promise<Section[]> {
  try {
    const response = await openai.responses.parse({
      model: MODELS.default,
      input: [
        {
          role: "system",
          content: `You are an expert at formatting content for presentations. Format the given sections for RevealJS slides.
Rules:
- Use horizontal slides (---) for main sections
- Use vertical slides (--) for subsections
- Keep text concise and scannable
- Use bullet points for lists
- Add <!-- .element: class="fragment" --> after elements that should animate in
- Break long sections into multiple slides
- Add presenter notes using Note: syntax
- Use markdown formatting for emphasis
Output should be in markdown format compatible with RevealJS.`
        },
        {
          role: "user",
          content: JSON.stringify(sections.map(s => ({
            title: s.title,
            content: s.content
          })))
        }
      ],
      text: { format: zodTextFormat(slideResponseFormat, 'presentation_format') }
    });

    const content = response.output_parsed as z.infer<typeof slideResponseFormat>;
    if (!content) {
      throw new Error('No content returned from AI');
    }

    const formattedContent = content.markdown;

    // Parse the AI response and update the sections
    const formattedSections = sections.map(section => {
      if (section.type === 'text') {
        return {
          ...section,
          content: formattedContent.split('---').find((s: string) => 
            s.toLowerCase().includes(section.title.toLowerCase())
          )?.trim() || section.content
        };
      }
      return section;
    });

    return formattedSections;
  } catch (error) {
    console.error('Error formatting for presentation:', error);
    return sections;
  }
} 
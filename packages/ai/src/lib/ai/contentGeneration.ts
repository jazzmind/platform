import { MODELS } from './models';
import { z } from 'zod';
import { zodTextFormat } from 'openai/helpers/zod';
import { AIService } from './aiService';
import { 
  ContentGenerator, 
  GenerationContext, 
  ContentGenerationResult,
  ValidationSchemas 
} from './interfaces';

// Available GPT models in order of preference
const GPT_MODELS = [
  MODELS.default,
  MODELS.best,
  MODELS.reasoning,
  MODELS.smartest,
];

interface ContentResult {
  content: string;
  modelUsed: string;
}

interface Section {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'contact' | 'organization';
  images?: {
    background?: string[];
    content?: string[];
  };
}

interface ImprovementResult {
  content: string;
  modelUsed: string;
  context?: string[];
}

/**
 * Enhanced ContentGenerationService extending AIService base class
 * Provides content generation capabilities with standardized error handling
 */
class ContentGenerationService extends AIService implements ContentGenerator {
  constructor() {
    super({
      maxRetries: 3,
      timeoutMs: 90000, // 1.5 minutes for content generation
      enableLogging: true,
      enableDebugLogging: true,
      logPrefix: 'ContentGeneration',
    });
  }

  /**
   * Generate content based on prompt and context
   */
  async generateContent(prompt: string, context: GenerationContext): Promise<ContentGenerationResult> {
    // Validate inputs
    const validatedPrompt = this.validateInput(prompt, ValidationSchemas.nonEmptyString, 'generateContent');
    const validatedContext = this.validateInput(context, ValidationSchemas.generationContext, 'generateContent');

    const responseFormat = z.object({
      content: z.string()
    });

    const result = await this.callAI(
      MODELS.best,
      [
        {
          role: 'system',
          content: 'You are an expert content writer. Generate high-quality, specific content based on the provided context and requirements.',
        },
        {
          role: 'user',
          content: `Context: ${JSON.stringify(validatedContext)}\n\nPrompt: ${validatedPrompt}`,
        },
      ],
      responseFormat,
      'generateContent',
      'content'
    );

    return {
      content: result.content,
      metadata: {
        model: MODELS.best,
        tokensUsed: 0, // Token usage not available from callAI wrapper
        confidence: 0.8, // Placeholder confidence score
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Generate section-specific content
   */
  async generateSectionContent(sectionType: string, context: GenerationContext): Promise<ContentGenerationResult> {
    const prompt = `Generate content for the "${sectionType}" section of a business proposal.`;
    return this.generateContent(prompt, context);
  }

  /**
   * Improve existing content
   */
  async improveContent(
    existingContent: string, 
    requirements: string, 
    context: GenerationContext
  ): Promise<ContentGenerationResult> {
    const prompt = `Improve the following content based on these requirements: ${requirements}\n\nExisting Content:\n${existingContent}`;
    return this.generateContent(prompt, context);
  }

  /**
   * Generate section content with fallback models (legacy method for backward compatibility)
   */
  async generateSectionContentLegacy(message: string, section: string, modelIndex: number = 0): Promise<ContentResult> {
    if (modelIndex >= GPT_MODELS.length) {
      throw new Error('All models failed to generate section content');
    }

    const responseFormat = z.object({
      content: z.string()
    });

    const operation = async () => {
      const response = await this.client.responses.parse({
        model: GPT_MODELS[modelIndex],
        input: [
          {
            role: "system",
            content: `You are a proposal writing expert. The user wants to generate content for the ${section} section of their proposal.
IMPORTANT: 
- Format your response in Markdown
- Use appropriate markdown syntax for headings (##, ###), lists (-, *), emphasis (**bold**, *italic*), etc.
- Do not include any meta-commentary about the changes
- Do not include section titles or headers
- Do not include any explanatory text at the end
- Focus purely on the content itself
- Be specific and avoid generic or placeholder content
- Base your content only on the provided context and information`
          },
          {
            role: "user",
            content: message
          }
        ],
        text: { format: zodTextFormat(responseFormat, "content") }
      });

      const content = response.output_parsed as z.infer<typeof responseFormat>;
      if (!content || content.content.length < 50) {
        throw new Error('Generated content too short');
      }

      // Clean up the content
      const cleanContent = content.content
        .replace(new RegExp(`^#+ .*${section}.*$`, 'gmi'), '')
        .replace(/^(?:revised|updated|improved|new)\s+/i, '')
        .replace(/\n---+\n[\s\S]*$/, '')
        .replace(/^```(?:markdown)?\n([\s\S]*)\n```$/m, '$1')
        .trim();

      return {
        content: cleanContent,
        modelUsed: GPT_MODELS[modelIndex]
      };
    };

    try {
      const result = await this.executeWithRetry(operation, `generateSectionContent(${section}, model:${modelIndex})`);
      return result.data;
    } catch (error) {
      console.error('Error generating section content:', error);
      this.log(`Model ${GPT_MODELS[modelIndex]} failed, trying next model`, 'warn');
      return this.generateSectionContentLegacy(message, section, modelIndex + 1);
    }
  }

  /**
   * Generate improvement with context (legacy method for backward compatibility)
   */
  async generateImprovementLegacy(
    section: Section,
    contextSections?: Section[],
    modelIndex: number = 0
  ): Promise<ImprovementResult> {
    if (modelIndex >= GPT_MODELS.length) {
      throw new Error('All models failed to generate improvement');
    }

    const operation = async () => {
      // Create context from other sections
      const context = contextSections
        ?.filter(s => s.id !== section.id && s.content && typeof s.content === 'string' && s.content.trim() !== '')
        ?.map(s => `${s.title}:\n${s.content}`)
        ?.join('\n\n');

      // Prepare message based on whether there's existing content
      const message = section.content 
        ? `Please improve the following ${section.title.toLowerCase()} section.\n\n` +
          `Current content:\n${section.content}\n\n` +
          (context ? `Context from other sections:\n${context}` : '')
        : `Please generate content for the ${section.title.toLowerCase()} section based on the following context and requirements:\n\n` +
          `Requirements:\n` +
          `- The content should be specific and detailed\n` +
          `- Avoid generic or placeholder content\n` +
          `- Focus on creating value-driven, persuasive content\n` +
          `- Ensure the content aligns with the overall proposal narrative\n\n` +
          (context ? `Context from other sections:\n${context}` : '');

      const responseFormat = z.object({
        content: z.string()
      });

      const response = await this.client.responses.parse({
        model: GPT_MODELS[modelIndex],
        input: [
          {
            role: "system",
            content: `You are a proposal writing expert. ${section.content ? 'Improve the provided content while maintaining its core message and adding value.' : 'Generate specific, valuable content based on the provided context and requirements.'}\n\n` +
            `IMPORTANT:\n` +
            `- Format your response in Markdown\n` +
            `- Use appropriate markdown syntax for headings (##, ###), lists (-, *), emphasis (**bold**, *italic*), etc.\n` +
            `- Do not include any meta-commentary about the changes\n` +
            `- Do not include section titles or headers\n` +
            `- Do not include any explanatory text\n` +
            `- Focus purely on the content itself\n` +
            `- Be specific and avoid generic content\n` +
            `- Base your content only on the provided context and information`
          },
          {
            role: "user",
            content: message
          }
        ],
        text: { format: zodTextFormat(responseFormat, "content") }
      });

      const content = response.output_parsed as z.infer<typeof responseFormat>;
      if (!content || content.content.length < 50) {
        throw new Error('Generated improvement too short');
      }

      // Clean up the content
      const cleanContent = content.content
        .replace(new RegExp(`^#+ .*${section.title}.*$`, 'gmi'), '')
        .replace(/^(?:revised|updated|improved|new)\s+/i, '')
        .replace(/\n---+\n[\s\S]*$/, '')
        .replace(/^```(?:markdown)?\n([\s\S]*)\n```$/m, '$1')
        .trim();

      return {
        content: cleanContent,
        modelUsed: GPT_MODELS[modelIndex],
        context: context ? [context] : undefined
      };
    };

    try {
      const result = await this.executeWithRetry(operation, `generateImprovement(${section.title}, model:${modelIndex})`);
      return result.data;
    } catch (error) {
      console.error('Error generating improvement:', error);
      this.log(`Model ${GPT_MODELS[modelIndex]} failed for improvement, trying next model`, 'warn');
      return this.generateImprovementLegacy(section, contextSections, modelIndex + 1);
    }
  }

  /**
   * Generate draft content (legacy method for backward compatibility)
   */
  async generateDraftContentLegacy(message: string, section: string): Promise<string> {
    const operation = async () => {
      const responseFormat = z.object({
        content: z.string()
      });

      const response = await this.client.responses.parse({
        model: MODELS.best,
        input: [
          {
            role: "system",
            content: `You are a proposal writing expert. Generate draft content for the ${section} section based on the user's request.`
          },
          {
            role: "user",
            content: message
          }
        ],
        text: { format: zodTextFormat(responseFormat, "content") }
      });

      const content = response.output_parsed as z.infer<typeof responseFormat>;
      return content.content || '';
    };

    const result = await this.executeWithRetry(operation, `generateDraftContent(${section})`);
    return result.data;
  }

  /**
   * Generate document summary (legacy method for backward compatibility)
   */
  async generateDocumentSummaryLegacy(content: string, fileName?: string): Promise<string> {
    const responseFormat = z.object({
      summary: z.string()
    });

    const result = await this.callAI(
      MODELS.best,
      [
        {
          role: 'system',
          content: 'You are a document analysis expert. Create a concise, informative summary of the provided document.',
        },
        {
          role: 'user',
          content: `Please summarize the following document${fileName ? ` (${fileName})` : ''}:\n\n${content}`,
        },
      ],
      responseFormat,
      `generateDocumentSummary(${fileName || 'unnamed'})`,
      'summary'
    );

    return result.summary || '';
  }

  /**
   * Process chat message (legacy method for backward compatibility)
   */
  async processChatMessageLegacy(message: string): Promise<string> {
    const responseFormat = z.object({
      response: z.string()
    });

    const result = await this.callAI(
      MODELS.best,
      [
        {
          role: 'system',
          content: 'You are a helpful assistant for proposal management. Provide clear, actionable responses.',
        },
        {
          role: 'user',
          content: message,
        },
      ],
      responseFormat,
      'processChatMessage',
      'response'
    );

    return result.response || '';
  }

   /**
   * Generate proposal section content
   */
  async generateProposalSection(
    sectionType: string,
    opportunityContext: string[],
    organizationContext: string[],
    requirements?: string
  ): Promise<string> {
    const contextArray = [
      'Opportunity Context:',
      ...opportunityContext,
      '',
      'Organization Context:',
      ...organizationContext,
    ];

    if (requirements) {
      contextArray.push('', 'Requirements:', requirements);
    }

    const responseFormat = z.object({
      content: z.string()
    });

    const result = await this.callAI(
      MODELS.best,
      [
        {
          role: 'system',
          content: `You are an expert proposal writer. Generate compelling, professional content for the "${sectionType}" section of a business proposal based on the provided context.`,
        },
        {
          role: 'user',
          content: contextArray.join('\n'),
        },
      ],
      responseFormat,
      `generateProposalSection(${sectionType})`,
      'content'
    );

    return result.content || '';
  }

}

// Create singleton instance
const contentGenerationService = new ContentGenerationService();

// Export legacy functions for backward compatibility
export async function generateSectionContent(message: string, section: string, modelIndex: number = 0): Promise<ContentResult> {
  return contentGenerationService.generateSectionContentLegacy(message, section, modelIndex);
}

export async function generateImprovement(
  section: Section,
  contextSections?: Section[],
  modelIndex: number = 0
): Promise<ImprovementResult> {
  return contentGenerationService.generateImprovementLegacy(section, contextSections, modelIndex);
}

export async function generateDraftContent(message: string, section: string): Promise<string> {
  return contentGenerationService.generateDraftContentLegacy(message, section);
}

export async function generateDocumentSummary(content: string, fileName?: string): Promise<string> {
  return contentGenerationService.generateDocumentSummaryLegacy(content, fileName);
}

export async function processChatMessage(message: string): Promise<string> {
  return contentGenerationService.processChatMessageLegacy(message);
}


// Export the service instance for new standardized usage
export { contentGenerationService };
export default contentGenerationService; 
import OpenAI from 'openai';
import { MODELS } from '@/src/lib/ai/models';
import { z } from 'zod';
import { zodTextFormat } from 'openai/helpers/zod';
import { marked } from 'marked';
import { convertToMarkdown } from '@/src/lib/utils/fileConversion';
import { ResponseInputItem } from 'openai/resources/responses/responses.mjs';
import { VectorDatabase } from '@/src/lib/database/prisma/vectorDatabase';
import { EmbeddingService } from '@/src/lib/ai/embeddingService';
import { AIService } from './aiService';
import { 
  DocumentAnalyzer, 
  DocumentType, 
  SemanticSection as ISemanticSection,
  ProgressCallback as IProgressCallback
} from './interfaces';
if (!process.env.OPENAI_API_KEY) {
  console.error('Warning: OPENAI_API_KEY is not set in environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  // Add a default timeout
  timeout: 30000,
});

const TIMEOUT = 30000; // 30 seconds timeout

interface Section {
  id: string;
  title: string;
  content: string | Record<string, string>;
  keywords: string[];
  type: 'text' | 'fields';
  images?: {
    background?: string[];
    content?: string[];
  };
}

interface AnalyzedSection {
  id: string;
  title: string;
  keywords: string[];
  content: string;
  confidence: number;
  sourceSection?: string;
  mergeType?: 'direct' | 'partial' | 'enhancement';
}

interface ProgressCallback {
  (progress: {
    stage: 'chunking' | 'processing' | 'merging' | 'matching' | 'analyzing';
    current: number;
    total: number;
    message: string;
  }): void;
}

export interface DocumentAnalysisResult {
  sections: AnalyzedSection[];
  unmatched: {
    content: string;
    potentialSections: Array<{
      sectionId: string;
      relevance: number;
    }>;
  }[];
  progress?: {
    stage: 'chunking' | 'processing' | 'merging' | 'matching' | 'analyzing';
    current: number;
    total: number;
    message: string;
  };
}

export interface SemanticSection {
  title: string;
  keywords: string[];
  content: string;
}

export interface SectionMatch {
  sectionId: string;
  confidence: number;
}

export interface SectionAnalysisResult {
  sectionTitle: string;
  extractedContent: string;
  summary: string;
  relevanceScore: number;
  addedToSection: boolean;
}

/**
 * Enhanced DocumentAnalysisService extending AIService base class
 * Provides document analysis capabilities with standardized error handling
 */
class DocumentAnalysisService extends AIService implements DocumentAnalyzer {
  private embeddingService: EmbeddingService;

  constructor() {
    super({
      maxRetries: 3,
      timeoutMs: 60000, // 1 minute for document analysis
      enableLogging: true,
      enableDebugLogging: true,
      logPrefix: 'DocumentAnalysis',
    });
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Analyze document content and extract semantic sections
   */
  async analyzeDocument(
    content: string, 
    existingSections: ISemanticSection[], 
    onProgress?: IProgressCallback
  ): Promise<ISemanticSection[]> {
    this.log('Starting document analysis');
    
    // Split content into manageable chunks
    const chunks = this.embeddingService.chunkText(content);
    onProgress?.({
      stage: 'chunking',
      current: 0,
      total: chunks.length,
      message: `Splitting document into ${chunks.length} chunks`
    });

    // Process each chunk
    const allSections: SemanticSection[] = [];
    for (const [index, chunk] of chunks.entries()) {
      this.log(`Processing chunk ${index + 1}/${chunks.length}`);
      const chunkSections = await this.identifySections(chunk.content);
      allSections.push(...chunkSections);
      
      onProgress?.({
        stage: 'processing',
        current: index + 1,
        total: chunks.length,
        message: `Processing document chunk ${index + 1} of ${chunks.length}`
      });
    }

    // Merge similar sections
    onProgress?.({
      stage: 'merging',
      current: 0,
      total: 1,
      message: 'Merging similar sections'
    });

    const mergedSections = await this.mergeSimilarSections(allSections);
    this.log(`Identified ${mergedSections.length} unique sections`);
    
    return mergedSections;
  }

  /**
   * Classify document type
   */
  // async classifyDocument(content: string): Promise<DocumentClassification> {
  //   const documentType = this.detectDocumentType(content);
    
  //   const responseFormat = z.object({
  //     confidence: z.number().min(0).max(1),
  //     reasoning: z.string(),
  //     suggestedSections: z.array(z.string()),
  //     priority: z.enum(['high', 'medium', 'low']),
  //     keyTopics: z.array(z.string()),
  //     shouldUpdateSections: z.boolean()
  //   });

  //   const result = await this.callAI(
  //     MODELS.best,
  //     [
  //       {
  //         role: 'system',
  //         content: 'You are a document classification expert. Analyze the document and provide detailed classification information.',
  //       },
  //       {
  //         role: 'user',
  //         content: `Analyze this document and classify it:\n\n${content.substring(0, 2000)}...`,
  //       },
  //     ],
  //     responseFormat,
  //     'classifyDocument',
  //     'classification'
  //   );

  //   return {
  //     documentType,
  //     confidence: result.confidence,
  //     reasoning: result.reasoning,
  //     suggestedSections: result.suggestedSections,
  //     priority: result.priority,
  //     keyTopics: result.keyTopics,
  //     shouldUpdateSections: result.shouldUpdateSections
  //   };
  // }

  /**
   * Detect document type from content
   */
  detectDocumentType(content: string): DocumentType {
    const lowerContent = content.toLowerCase();
    
    // Check for requirements-specific keywords
    const requirementsKeywords = [
      'requirements', 'specifications', 'must have', 'shall', 'should',
      'functional requirements', 'non-functional requirements', 'acceptance criteria',
      'user stories', 'use cases', 'rfp', 'request for proposal'
    ];
    
    const proposalKeywords = [
      'proposal', 'solution', 'approach', 'methodology', 'deliverables',
      'timeline', 'budget', 'cost', 'pricing', 'team', 'experience',
      'case study', 'references'
    ];
    
    const requirementsCount = requirementsKeywords.filter(keyword => 
      lowerContent.includes(keyword)
    ).length;
    
    const proposalCount = proposalKeywords.filter(keyword => 
      lowerContent.includes(keyword)
    ).length;
    
    if (requirementsCount > proposalCount && requirementsCount >= 3) {
      return 'requirements';
    } else if (proposalCount >= 3) {
      return 'proposal';
    } else if (lowerContent.includes('rfp') || lowerContent.includes('request for proposal')) {
      return 'rfp';
    } else {
      return 'general';
    }
  }

  /**
   * Legacy analyzeDocument method for backward compatibility
   */
  async analyzeDocumentLegacy(
    documentContent: string,
    existingSections: Section[],
    documentType: string,
    onProgress?: ProgressCallback,
    signal?: AbortSignal
  ): Promise<DocumentAnalysisResult> {
    console.log('Starting document analysis...');
    
    if (signal?.aborted) {
      throw new Error('Analysis cancelled');
    }

    let standardizedContent = documentContent;

    if (documentType === 'url') {
      const response = await fetch(documentContent);
      const contentType = response.headers.get('content-type') || 'text/plain';
      const result = await convertToMarkdown(await response.blob(), contentType);
      standardizedContent = result.content;
    } else {
      const result = await convertToMarkdown(new Blob([documentContent]), documentType);
      standardizedContent = result.content;
    }

    // Split content into manageable chunks
    const chunks = this.embeddingService.chunkText(standardizedContent);
    console.log(`Split document into ${chunks.length} chunks`);
    onProgress?.({
      stage: 'chunking',
      current: 0,
      total: chunks.length,
      message: `Splitting document into ${chunks.length} chunks`
    });

    // Process each chunk
    const allSections: Array<{ title: string; keywords: string[]; content: string }> = [];
    for (const [index, chunk] of chunks.entries()) {
      if (signal?.aborted) {
        throw new Error('Analysis cancelled');
      }

      console.log(`Processing chunk ${index + 1}/${chunks.length}`);
      const chunkSections = await this.identifySections(chunk.content);
      allSections.push(...chunkSections);
      
      const progress = {
        stage: 'processing' as const,
        current: index + 1,
        total: chunks.length,
        message: `Processing document chunk ${index + 1} of ${chunks.length}`
      };
      console.log('Progress:', progress);
      onProgress?.(progress);
    }

    // Merge similar sections with timeout
    console.log(`Starting section merge...`);
    onProgress?.({
      stage: 'merging',
      current: 0,
      total: 1,
      message: 'Merging similar sections'
    });

    if (signal?.aborted) {
      throw new Error('Analysis cancelled');
    }

    const mergedSections = await this.mergeSimilarSections(allSections);
    console.log(`Identified ${mergedSections.length} unique sections`);
    onProgress?.({
      stage: 'merging',
      current: 1,
      total: 1,
      message: `Identified ${mergedSections.length} unique sections`
    });

    // Match sections with existing proposal sections
    console.log(`Starting section matching...`);
    onProgress?.({
      stage: 'matching',
      current: 0,
      total: mergedSections.length,
      message: 'Starting section matching'
    });

    if (signal?.aborted) {
      throw new Error('Analysis cancelled');
    }

    // Process section matches in smaller batches
    const matchedSections: AnalyzedSection[] = [];
    const BATCH_SIZE = 3; // Process 3 sections at a time
    
    for (let i = 0; i < mergedSections.length; i += BATCH_SIZE) {
      if (signal?.aborted) {
        throw new Error('Analysis cancelled');
      }

      const batch = mergedSections.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(section => 
        this.findSectionMatches(section, existingSections)
          .then(async matches => {
            for (const match of matches) {
              if (match.confidence > 0.7) {
                const existingSection = existingSections.find(s => s.id === match.sectionId);
                if (!existingSection || typeof existingSection.content !== 'string') continue;

                const mergedContent = await this.mergeSectionContent(
                  section.content,
                  existingSection.content
                );

                matchedSections.push({
                  id: existingSection.id,
                  title: existingSection.title,
                  keywords: existingSection.keywords,
                  content: mergedContent,
                  confidence: match.confidence,
                  sourceSection: section.title,
                  mergeType: existingSection.content.trim() === '' ? 'direct' : 'partial'
                });
              }
            }
          })
      );

      await Promise.all(batchPromises);
      
      onProgress?.({
        stage: 'matching',
        current: Math.min(i + BATCH_SIZE, mergedSections.length),
        total: mergedSections.length,
        message: `Matched ${matchedSections.length} sections so far`
      });
    }

    console.log(`Matched ${matchedSections.length} sections`);

    // Analyze unmatched content
    const unmatchedSections = mergedSections.filter(section => 
      !matchedSections.some(match => match.sourceSection === section.title)
    );
    console.log(`Found ${unmatchedSections.length} unmatched sections`);
    
    if (signal?.aborted) {
      throw new Error('Analysis cancelled');
    }

    onProgress?.({
      stage: 'analyzing',
      current: 0,
      total: unmatchedSections.length,
      message: 'Analyzing unmatched sections'
    });

    const unmatchedAnalysis = await this.analyzeUnmatchedContent(unmatchedSections, existingSections);

    return {
      sections: matchedSections,
      unmatched: unmatchedAnalysis,
      progress: {
        stage: 'analyzing',
        current: chunks.length,
        total: chunks.length,
        message: 'Analysis complete'
      }
    };
  }

  // REMOVED: Redundant chunking implementation - using unified EmbeddingService.chunkText() instead
  // This method was duplicated in embeddingService.ts with better features
  // See Phase 1 consolidation in AI Architecture Migration Roadmap

  async mergeSimilarSections(sections: Array<{ title: string; keywords: string[]; content: string }>): Promise<Array<{ title: string; keywords: string[]; content: string }>> {
    const mergedSections: { [key: string]: { title: string; keywords: string[]; content: string } } = {};
    
    for (const section of sections) {
      const normalizedTitle = section.title.toLowerCase().trim();
      if (mergedSections[normalizedTitle]) {
        mergedSections[normalizedTitle].content += '\n\n' + section.content;
        mergedSections[normalizedTitle].keywords = [...mergedSections[normalizedTitle].keywords, ...section.keywords];
      } else {
        mergedSections[normalizedTitle] = { title: section.title, keywords: section.keywords, content: section.content};
      }
    }
    
    return Object.values(mergedSections).map((section) => ({
      title: section.title,
      keywords: section.keywords,
      content: section.content
    }));
  }

  async identifySections(
    content: string, 
    entityType: 'opportunity' | 'proposal' = 'opportunity',
    debugCallback?: (prompt: string, response: string, tokens: number, cost: number, stage: string) => void
  ): Promise<Array<{ title: string; keywords: string[]; content: string }>> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured. Please check your environment variables.');
    }

    const responseFormat = z.object({ 
      sections: z.array(z.object({ 
        title: z.string(), 
        keywords: z.array(z.string()),
        content: z.string() 
      })) 
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
      const prompt = {
        opportunity: `You are an expert proposal writer. Identify distinct sections in the provided document content.
              Normalize section titles to match common proposal sections.
              Group related content under appropriate sections.
              If there is information about pricing, budget or other financial information, consolidate it into a single section called Financials.
              If there are specific requirements for how the response must be structured, consolidate it into a single section called Response Requirements.`,
        proposal: `You are an expert proposal writer. Use the opportunity information provided to create a list of sections for a proposal that responds to the opportunity.
        If the information provides specific requirements for how the response must be structured, 
        ensure you adhere to those requirements in your section titles.
        Then draft the content of each section as semantically and professionally formatted HTML based on the opportunity information provided.`
      }
      const model = entityType === 'opportunity' ? MODELS.default : MODELS.default;

      // Broadcast AI prompt if callback provided
      const systemPrompt = prompt[entityType];
      if (debugCallback) {
        debugCallback(
          `System: ${systemPrompt}\n\nUser: ${content}`,
          '', // Response will be filled after API call
          0, // Tokens will be estimated
          0, // Cost will be estimated
          'section-identification'
        );
      }

      const response = await openai.responses.parse({
        model: model,
        input: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content
          }
        ],
        text: { format: zodTextFormat(responseFormat, "sections") }
      });

      clearTimeout(timeoutId);

      const result = response.output_parsed as z.infer<typeof responseFormat>;
      
      // Broadcast AI response if callback provided
      if (debugCallback) {
        const responseText = JSON.stringify(result, null, 2);
        const estimatedTokens = Math.ceil((systemPrompt.length + content.length + responseText.length) / 4);
        const estimatedCost = estimatedTokens * 0.00002; // Rough cost estimate
        
        debugCallback(
          `System: ${systemPrompt}\n\nUser: ${content}`,
          responseText,
          estimatedTokens,
          estimatedCost,
          'section-identification'
        );
      }
      
      return result.sections;
    } catch (error) {
      console.error('Error identifying sections:', error);
      if (error instanceof Error && error.message.includes('API key')) {
        throw error; // Re-throw API key related errors
      }
      // Try best model
      try {
        const fallbackPrompt = `Identify distinct sections in the provided document content.
                Return a JSON object with a 'sections' array containing objects with 'title' and 'content' properties.`;
        
        // Broadcast fallback AI prompt if callback provided
        if (debugCallback) {
          debugCallback(
            `System: ${fallbackPrompt}\n\nUser: ${content}`,
            '', // Response will be filled after API call
            0, // Tokens will be estimated
            0, // Cost will be estimated
            'section-identification-fallback'
          );
        }
        
        const response = await openai.responses.parse({
          model: MODELS.best,
          input: [
            {
              role: "system",
              content: fallbackPrompt
            },
            {
              role: "user",
              content
            }
          ],
          text: { format: zodTextFormat(responseFormat, "sections") }
        });
        
        const result = response.output_parsed as z.infer<typeof responseFormat>;
        
        // Broadcast fallback AI response if callback provided
        if (debugCallback) {
          const responseText = JSON.stringify(result, null, 2);
          const estimatedTokens = Math.ceil((fallbackPrompt.length + content.length + responseText.length) / 4);
          const estimatedCost = estimatedTokens * 0.00002; // Rough cost estimate
          
          debugCallback(
            `System: ${fallbackPrompt}\n\nUser: ${content}`,
            responseText,
            estimatedTokens,
            estimatedCost,
            'section-identification-fallback'
          );
        }
        
        return result.sections || [];
      } catch (fallbackError) {
        console.error('Best model also failed:', fallbackError);
        if (fallbackError instanceof Error && fallbackError.message.includes('API key')) {
          throw fallbackError; // Re-throw API key related errors
        }
        return [];
      }
    }
  }

  async mergeSectionContent(
    newContent: string,
    existingContent: string
  ): Promise<string> {
    const responseFormat = z.object({ 
      mergedContent: z.string() 
    });
    try {
      const messages = [
        {
          role: "system",
          content: `You are a content merging expert. Combine the two provided sections of content
            intelligently, avoiding duplication and maintaining a coherent flow. Preserve important
            information from both sources. Return the merged content as clean, semantic HTML.`
        },
        {
          role: "user",
          content: JSON.stringify({
            newContent,
            existingContent
          })
        }
      ];
      console.log('Merging content with messages:', messages);
      const response = await openai.responses.parse({
        model: MODELS.default,
        input: messages as ResponseInputItem[],
        text: { format: zodTextFormat(responseFormat, "mergedContent") }
      });
      console.log('Response:', response);
      const result = response.output_parsed as z.infer<typeof responseFormat>;
      return result.mergedContent || existingContent;
    } catch (error) {
      console.error('Error merging content:', error);
      return existingContent;
    }
  }

  async analyzeUnmatchedContent(
    unmatchedSections: Array<{ title: string; content: string }>,
    existingSections: Section[]
  ): Promise<Array<{ content: string; potentialSections: Array<{ sectionId: string; relevance: number }> }>> {
    const responseFormat = z.object({ 
      analysis: z.array(z.object({ 
        content: z.string(), 
        potentialSections: z.array(z.object({ 
          sectionId: z.string(), 
          relevance: z.number() 
        })) 
      })) 
    });
     try {

      const response = await openai.responses.parse({
        model: MODELS.reasoning,
        input: [
          {
            role: "system",
            content: `You are a content analysis expert. For each unmatched section,
              identify existing sections that could be enhanced with this content.
              Consider partial matches and relevant information that could improve
              other sections. Return a JSON array of objects with 'content' and
              'potentialSections' (array of {sectionId, relevance}) properties.`
          },
          {
            role: "user",
            content: JSON.stringify({
              unmatchedSections,
              existingSections: existingSections.map(s => ({
                id: s.id,
                title: s.title
              }))
            })
          }
        ],
        text: { format: zodTextFormat(responseFormat, "analysis") }
      });

      const result = response.output_parsed as z.infer<typeof responseFormat>;
      return result.analysis || [];
    } catch (error) {
      console.error('Error analyzing unmatched content:', error);
      return [];
    }
  }

  // Helper function to extract text content from HTML
  extractTextFromHTML(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  // Helper function to convert markdown to HTML
  async convertMarkdownToHTML(markdown: string): Promise<string> {
    return await marked.parse(markdown);
  }

  // New function for step 2: Semantic analysis
  async analyzeSemantic(
    documentContent: string,
    onProgress?: ProgressCallback,
    debugCallback?: (prompt: string, response: string, tokens: number, cost: number, stage: string) => void
  ): Promise<SemanticSection[]> {
    console.log('Starting semantic analysis...');
    
    // Split content into manageable chunks
    const chunks = this.embeddingService.chunkText(documentContent);
    console.log(`Split document into ${chunks.length} chunks`);
    
    onProgress?.({
      stage: 'chunking',
      current: 0,
      total: chunks.length,
      message: `Splitting document into ${chunks.length} chunks`
    });

    // Process each chunk to identify sections
    const allSections: SemanticSection[] = [];
    for (const [index, chunk] of chunks.entries()) {
      console.log(`Processing chunk ${index + 1}/${chunks.length}`);
      
      // Pass debug callback to identifySections for AI operation logging
      const chunkSections = await this.identifySections(chunk.content, 'opportunity', debugCallback);
      allSections.push(...chunkSections);
      
      onProgress?.({
        stage: 'processing',
        current: index + 1,
        total: chunks.length,
        message: `Processing document chunk ${index + 1} of ${chunks.length}`
      });
    }

    // Merge similar sections
    const semanticSections = await this.mergeSimilarSections(allSections);
    console.log(`Identified ${semanticSections.length} semantic sections`);

    return semanticSections;
  }

  // New function for step 3: Match semantic sections to opportunity sections
  async matchSections(
    semanticSections: SemanticSection[],
    opportunitySections: Array<{ id: string; title: string; content?: string }>,
    onProgress?: ProgressCallback
  ): Promise<{ [sectionId: string]: SectionAnalysisResult }> {
    console.log('Starting section matching...');
    
    // Collect all matches first
    const allMatches: { [sectionId: string]: Array<{ semanticSection: SemanticSection; confidence: number }> } = {};
    
    for (const [index, semanticSection] of semanticSections.entries()) {
      onProgress?.({
        stage: 'matching',
        current: index,
        total: semanticSections.length,
        message: `Finding matches for section ${index + 1} of ${semanticSections.length}`
      });

      const matches = await this.findSectionMatches(semanticSection, opportunitySections);
      
      // Collect all good matches (not just the best one)
      for (const match of matches.filter(m => m.confidence > 0.6)) {
        if (!allMatches[match.sectionId]) {
          allMatches[match.sectionId] = [];
        }
        allMatches[match.sectionId].push({
          semanticSection,
          confidence: match.confidence
        });
      }
    }

    console.log(`Found matches for ${Object.keys(allMatches).length} opportunity sections`);
    
    // Now intelligently merge content for each opportunity section
    const sectionAnalysis: { [sectionId: string]: SectionAnalysisResult } = {};
    const sectionIds = Object.keys(allMatches);
    
    for (const [index, sectionId] of sectionIds.entries()) {
      onProgress?.({
        stage: 'matching',
        current: semanticSections.length + index,
        total: semanticSections.length + sectionIds.length,
        message: `Merging content for section ${index + 1} of ${sectionIds.length}`
      });

      const matches = allMatches[sectionId];
      const opportunitySection = opportunitySections.find(s => s.id === sectionId);
      
      if (!opportunitySection || matches.length === 0) continue;

      // Sort matches by confidence
      matches.sort((a, b) => b.confidence - a.confidence);
      
      // Prepare content for intelligent merging
      const semanticContents = matches.map(m => ({
        title: m.semanticSection.title,
        content: m.semanticSection.content,
        confidence: m.confidence
      }));

      // Use reasoning model to intelligently merge content
      const mergedContent = await this.intelligentMergeContent(
        opportunitySection.title,
        opportunitySection.content || '',
        semanticContents
      );

      sectionAnalysis[sectionId] = {
        sectionTitle: opportunitySection.title,
        extractedContent: mergedContent,
        summary: mergedContent.substring(0, 500) + (mergedContent.length > 500 ? '...' : ''),
        relevanceScore: Math.max(...matches.map(m => m.confidence)),
        addedToSection: true
      };
    }

    console.log(`Merged content for ${Object.keys(sectionAnalysis).length} sections`);
    return sectionAnalysis;
  }

  // New function to intelligently merge content using reasoning model
  async intelligentMergeContent(
    sectionTitle: string,
    existingContent: string,
    semanticContents: Array<{ title: string; content: string; confidence: number }>
  ): Promise<string> {
    const responseFormat = z.object({ 
      mergedContent: z.string() 
    });

    try {
      const response = await openai.responses.parse({
        model: MODELS.reasoning,
        input: [
          {
            role: "system",
            content: `You are an expert content strategist tasked with intelligently merging document content into proposal sections.

Your goal is to create a comprehensive, well-structured section that:
1. Preserves all important information from existing content
2. Seamlessly integrates relevant information from semantic sections
3. Eliminates redundancy and maintains coherent flow
4. Uses professional proposal language and formatting
5. Organizes information logically within the section's purpose

Consider the confidence scores when prioritizing content - higher confidence content should be more prominent.
If existing content is empty, create a well-structured section from the semantic content.
Return clean, professional content suitable for a business proposal.`
          },
          {
            role: "user",
            content: JSON.stringify({
              sectionTitle,
              existingContent: existingContent || '(empty)',
              semanticContents,
              instruction: `Merge the semantic content into the existing ${sectionTitle} section, creating a comprehensive and professional result.`
            })
          }
        ],
        text: { format: zodTextFormat(responseFormat, "mergedContent") }
      });

      const result = response.output_parsed as z.infer<typeof responseFormat>;
      return result.mergedContent || existingContent;
    } catch (error) {
      console.error('Error in intelligent merge:', error);
      
      // Fallback: simple concatenation with structure
      if (!existingContent || existingContent.trim() === '' || existingContent === '(empty)') {
        // If no existing content, structure the semantic content
        const structuredContent = semanticContents
          .map(sc => `**${sc.title}** (Relevance: ${Math.round(sc.confidence * 100)}%)\n\n${sc.content}`)
          .join('\n\n---\n\n');
        return structuredContent;
      } else {
        // If existing content, append new content
        const additionalContent = semanticContents
          .map(sc => sc.content)
          .join('\n\n');
        return `${existingContent}\n\n---\n\n**Additional Information:**\n\n${additionalContent}`;
      }
    }
  }

  // New function for re-matching a specific section
  async rematchSection(
    semanticSection: SemanticSection,
    opportunitySections: Array<{ id: string; title: string; content?: string }>
  ): Promise<{ sectionId: string; mergedContent: string; confidence: number } | null> {
    const matches = await this.findSectionMatches(semanticSection, opportunitySections);
    const bestMatch = matches.find(match => match.confidence > 0.6);
    
    if (!bestMatch) return null;
    
    const opportunitySection = opportunitySections.find(s => s.id === bestMatch.sectionId);
    if (!opportunitySection) return null;
    
    // Use intelligent merging for re-matching too
    const mergedContent = await this.intelligentMergeContent(
      opportunitySection.title,
      opportunitySection.content || '',
      [{ title: semanticSection.title, content: semanticSection.content, confidence: bestMatch.confidence }]
    );
    
    return {
      sectionId: bestMatch.sectionId,
      mergedContent,
      confidence: bestMatch.confidence
    };
  }

  // Updated findSectionMatches to work with the new structure
  async findSectionMatches(
    uploadedSection: SemanticSection,
    existingSections: Array<{ id: string; title: string }>
  ): Promise<SectionMatch[]> {
    try {
      // First try simple title matching
      const titleMatches = existingSections
        .map(section => {
          const normalizedUploadedTitle = uploadedSection.title.toLowerCase().trim();
          const normalizedSectionTitle = section.title.toLowerCase().trim();
          
          if (normalizedUploadedTitle === normalizedSectionTitle) {
            return { sectionId: section.id, confidence: 1.0 };
          }
          
          if (normalizedUploadedTitle.includes(normalizedSectionTitle) || 
              normalizedSectionTitle.includes(normalizedUploadedTitle)) {
            return { sectionId: section.id, confidence: 0.8 };
          }
          
          return null;
        })
        .filter((match): match is SectionMatch => match !== null);

      if (titleMatches.length > 0) {
        return titleMatches;
      }

      const responseFormat = z.object({ 
        matches: z.array(z.object({ 
          sectionId: z.string(), 
          confidence: z.number() 
        })) 
      });

      // Use AI for semantic matching
      const response = await openai.responses.parse({
        model: MODELS.fast,
        input: [
          {
            role: "system",
            content: `Match the semantic section with the most relevant opportunity sections.
              Consider semantic similarity between titles, keywords, and content themes.
              Return a JSON object with a 'matches' array of {sectionId, confidence}.
              Only include matches with confidence > 0.5.`
          },
          {
            role: "user",
            content: JSON.stringify({
              section: uploadedSection,
              existingSections: existingSections
            })
          }
        ],
        text: { format: zodTextFormat(responseFormat, "matches") }
      });

      const result = response.output_parsed as z.infer<typeof responseFormat>;
      return result.matches || [];
    } catch (error) {
      console.error('Error finding section matches:', error);
      return [];
    }
  }

  // New function to create embeddings for semantic sections
  async createSemanticSectionEmbeddings(
    fileId: string,
    entityType: 'opportunity' | 'proposal',
    entityId: string,
    semanticSections: SemanticSection[]
  ): Promise<void> {
    console.log(`Creating embeddings for ${semanticSections.length} semantic sections`);
    
    const vectorDB = new VectorDatabase();
    
    // Process sections in batches to manage memory
    const BATCH_SIZE = 5;
    for (let i = 0; i < semanticSections.length; i += BATCH_SIZE) {
      const batch = semanticSections.slice(i, i + BATCH_SIZE);
      
      for (const [index, section] of batch.entries()) {
        try {
          // Create embedding for the section content
          const embedding = await this.embeddingService.generateEmbedding(section.content);
          
          // Store in vector database
          const vectorRecord = {
            entityType: 'opportunity' as const,
            entityId: entityId,
            sourceEntityType: 'FileData' as const,
            sourceEntityId: `${fileId}_section_${i + index}`,
            content: section.content,
            vector: embedding,
            metadata: {
              title: section.title,
              keywords: section.keywords.join(', '),
              chunkIndex: i + index,
              totalChunks: semanticSections.length,
              fileId,
              extractedAt: new Date().toISOString(),
              sectionType: 'semantic',
            },
          };
          await vectorDB.createVector(vectorRecord);
          
          console.log(`Created embedding for section: ${section.title}`);
        } catch (error) {
          console.error(`Error creating embedding for section ${section.title}:`, error);
          // Continue with other sections even if one fails
        }
      }
    }
    
    console.log(`Completed embedding creation for semantic sections`);
  }

  // Enhanced version that considers versioning and document type
  async enhancedAnalyzeDocument(
    documentContent: string,
    entityType: 'opportunity' | 'proposal',
    entityId: string,
    onProgress?: ProgressCallback,
    signal?: AbortSignal
  ): Promise<DocumentAnalysisResult & { documentType: DocumentType }> {
    console.log('Starting enhanced document analysis...');
    
    if (signal?.aborted) {
      throw new Error('Analysis cancelled');
    }

    // Detect document type to determine matching strategy
    const documentType = this.detectDocumentType(documentContent);
    console.log(`Detected document type: ${documentType}`);

    let standardizedContent = documentContent;

    // Convert content to markdown if needed
    if (typeof documentContent !== 'string') {
      const contentType = 'text/plain';
      const result = await convertToMarkdown(new Blob([documentContent]), contentType);
      standardizedContent = result.content;
    }

    // Split content into manageable chunks
    const chunks = this.embeddingService.chunkText(standardizedContent);
    console.log(`Split document into ${chunks.length} chunks`);
    onProgress?.({
      stage: 'chunking',
      current: 0,
      total: chunks.length,
      message: `Splitting document into ${chunks.length} chunks`
    });

    // Process each chunk
    const allSections: Array<{ title: string; keywords: string[]; content: string }> = [];
    for (const [index, chunk] of chunks.entries()) {
      if (signal?.aborted) {
        throw new Error('Analysis cancelled');
      }

      console.log(`Processing chunk ${index + 1}/${chunks.length}`);
      const chunkSections = await this.identifySections(chunk.content);
      allSections.push(...chunkSections);
      
      const progress = {
        stage: 'processing' as const,
        current: index + 1,
        total: chunks.length,
        message: `Processing document chunk ${index + 1} of ${chunks.length}`
      };
      console.log('Progress:', progress);
      onProgress?.(progress);
    }

    // Merge similar sections
    console.log(`Starting section merge...`);
    onProgress?.({
      stage: 'merging',
      current: 0,
      total: 1,
      message: 'Merging similar sections'
    });

    if (signal?.aborted) {
      throw new Error('Analysis cancelled');
    }

    const mergedSections = await this.mergeSimilarSections(allSections);
    console.log(`Identified ${mergedSections.length} unique sections`);
    onProgress?.({
      stage: 'merging',
      current: 1,
      total: 1,
      message: `Identified ${mergedSections.length} unique sections`
    });

    // Get ONLY the most recent (active) sections for matching
    console.log(`Getting active sections for ${entityType} ${entityId}...`);
    const { getActiveSections } = await import('@/src/lib/database');
    const activeSectionRecords = await getActiveSections(entityType, entityId);
    const existingSections = activeSectionRecords.map(section => ({
      id: section.id,
      title: section.title,
      content: section.content || '',
      keywords: [], // We could extract these if needed
      type: section.type as 'text' | 'fields'
    }));

    console.log(`Found ${existingSections.length} active sections for matching`);

    // Match sections with existing sections (now only active ones)
    console.log(`Starting section matching...`);
    onProgress?.({
      stage: 'matching',
      current: 0,
      total: mergedSections.length,
      message: 'Starting section matching'
    });

    if (signal?.aborted) {
      throw new Error('Analysis cancelled');
    }

    // Process section matches in smaller batches
    const matchedSections: AnalyzedSection[] = [];
    const BATCH_SIZE = 3; // Process 3 sections at a time
    
    for (let i = 0; i < mergedSections.length; i += BATCH_SIZE) {
      if (signal?.aborted) {
        throw new Error('Analysis cancelled');
      }

      const batch = mergedSections.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(section => 
        this.findSectionMatches(section, existingSections)
          .then(async matches => {
            for (const match of matches) {
              if (match.confidence > 0.7) {
                const existingSection = existingSections.find(s => s.id === match.sectionId);
                if (!existingSection || typeof existingSection.content !== 'string') continue;

                const mergedContent = await this.mergeSectionContent(
                  section.content,
                  existingSection.content
                );

                matchedSections.push({
                  id: existingSection.id,
                  title: existingSection.title,
                  keywords: existingSection.keywords,
                  content: mergedContent,
                  confidence: match.confidence,
                  sourceSection: section.title,
                  mergeType: existingSection.content.trim() === '' ? 'direct' : 'partial'
                });
              }
            }
          })
      );

      await Promise.all(batchPromises);
      
      onProgress?.({
        stage: 'matching',
        current: Math.min(i + BATCH_SIZE, mergedSections.length),
        total: mergedSections.length,
        message: `Matched ${matchedSections.length} sections so far`
      });
    }

    console.log(`Matched ${matchedSections.length} sections`);

    // Analyze unmatched content
    const unmatchedSections = mergedSections.filter(section => 
      !matchedSections.some(match => match.sourceSection === section.title)
    );
    console.log(`Found ${unmatchedSections.length} unmatched sections`);
    
    if (signal?.aborted) {
      throw new Error('Analysis cancelled');
    }

    onProgress?.({
      stage: 'analyzing',
      current: 0,
      total: unmatchedSections.length,
      message: 'Analyzing unmatched sections'
    });

    const unmatchedAnalysis = await this.analyzeUnmatchedContent(unmatchedSections, existingSections);

    return {
      sections: matchedSections,
      unmatched: unmatchedAnalysis,
      documentType: documentType,
      progress: {
        stage: 'analyzing',
        current: chunks.length,
        total: chunks.length,
        message: 'Analysis complete'
      }
    };
  }
}

// Create singleton instance
const documentAnalysisService = new DocumentAnalysisService();

// Export legacy functions for backward compatibility
export async function analyzeDocument(
  documentContent: string,
  existingSections: Section[],
  documentType: string,
  onProgress?: ProgressCallback,
  signal?: AbortSignal
): Promise<DocumentAnalysisResult> {
  return documentAnalysisService.analyzeDocumentLegacy(documentContent, existingSections, documentType, onProgress, signal);
}

export async function identifySections(
  content: string, 
  entityType: 'opportunity' | 'proposal' = 'opportunity',
  debugCallback?: (prompt: string, response: string, tokens: number, cost: number, stage: string) => void
): Promise<Array<{ title: string; keywords: string[]; content: string }>> {
  return documentAnalysisService.identifySections(content, entityType, debugCallback);
}

export function extractTextFromHTML(html: string): string {
  return documentAnalysisService.extractTextFromHTML(html);
}

export async function convertMarkdownToHTML(markdown: string): Promise<string> {
  return documentAnalysisService.convertMarkdownToHTML(markdown);
}

export async function analyzeSemantic(
  documentContent: string,
  onProgress?: ProgressCallback,
  debugCallback?: (prompt: string, response: string, tokens: number, cost: number, stage: string) => void
): Promise<SemanticSection[]> {
  return documentAnalysisService.analyzeSemantic(documentContent, onProgress, debugCallback);
}

export async function matchSections(
  semanticSections: SemanticSection[],
  opportunitySections: Array<{ id: string; title: string; content?: string }>,
  onProgress?: ProgressCallback
): Promise<{ [sectionId: string]: SectionAnalysisResult }> {
  return documentAnalysisService.matchSections(semanticSections, opportunitySections, onProgress);
}

export async function intelligentMergeContent(
  sectionTitle: string,
  existingContent: string,
  semanticContents: Array<{ title: string; content: string; confidence: number }>
): Promise<string> {
  return documentAnalysisService.intelligentMergeContent(sectionTitle, existingContent, semanticContents);
}

export async function rematchSection(
  semanticSection: SemanticSection,
  opportunitySections: Array<{ id: string; title: string; content?: string }>
): Promise<{ sectionId: string; mergedContent: string; confidence: number } | null> {
  return documentAnalysisService.rematchSection(semanticSection, opportunitySections);
}

export async function createSemanticSectionEmbeddings(
  fileId: string,
  entityType: 'opportunity' | 'proposal',
  entityId: string,
  semanticSections: SemanticSection[]
): Promise<void> {
  return documentAnalysisService.createSemanticSectionEmbeddings(fileId, entityType, entityId, semanticSections);
}

export function detectDocumentType(content: string): DocumentType {
  return documentAnalysisService.detectDocumentType(content);
}

export async function enhancedAnalyzeDocument(
  documentContent: string,
  entityType: 'opportunity' | 'proposal',
  entityId: string,
  onProgress?: ProgressCallback,
  signal?: AbortSignal
): Promise<DocumentAnalysisResult & { documentType: DocumentType }> {
  return documentAnalysisService.enhancedAnalyzeDocument(documentContent, entityType, entityId, onProgress, signal);
}

// Export the service instance for new standardized usage
export { documentAnalysisService };
export default documentAnalysisService; 
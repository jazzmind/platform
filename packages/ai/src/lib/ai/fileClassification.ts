import OpenAI from 'openai';
import { MODELS } from '@/src/lib/ai/models';
import { z } from 'zod';
import { zodTextFormat } from 'openai/helpers/zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const fileClassificationResponseFormat = z.object({
  documentType: z.enum(['rfp', 'requirements', 'proposal', 'ideation', 'reference', 'transcript', 'other']),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
  suggestedSections: z.array(z.string()),
  priority: z.enum(['high', 'medium', 'low']),
  keyTopics: z.array(z.string()),
  shouldUpdateSections: z.boolean()
});

export interface FileClassificationResult {
  documentType: 'rfp' | 'requirements' | 'proposal' | 'ideation' | 'reference' | 'transcript' | 'other';
  confidence: number;
  reasoning: string;
  suggestedSections: string[];
  priority: 'high' | 'medium' | 'low';
  keyTopics: string[];
  shouldUpdateSections: boolean;
}

export async function classifyDocument(
  filename: string,
  extractedText: string,
  existingSections: Array<{ id: string; title: string; content?: string }> = [],
  debugCallback?: (prompt: string, response: string, tokensUsed: number, cost: number) => void
): Promise<FileClassificationResult> {
  try {
    const prompt = `Analyze this document and classify it to determine how it should be processed in an opportunity management system.

Document Information:
- Filename: ${filename}
- Content Length: ${extractedText.length} characters

Document Content (first 4000 characters):
${extractedText.substring(0, 4000)}

Existing Opportunity Sections:
${existingSections.map(s => `- ${s.title}${s.content ? ` (${s.content.length} chars)` : ' (empty)'}`).join('\n')}

Please classify this document and provide guidance on how to process it:

1. **Document Type Classification:**
   - "rfp": Request for Proposal or tender document from client
   - "requirements": Requirements specification or statement of work
   - "proposal": Existing proposal or response document
   - "ideation": Brainstorming, notes, or preliminary ideas
   - "reference": Supporting materials, case studies, or background info
   - "transcript": Meeting transcripts, call recordings, or interview notes
   - "other": Unclear or mixed content

2. **Section Update Strategy:**
   - Should this document's content be used to update/populate existing sections?
   - Which sections would benefit from this content?
   - What priority should this document have for processing?

3. **Content Analysis:**
   - What are the key topics covered in this document?
   - How confident are you in the classification?
   - Why did you make this classification?

Focus on practical impact: RFPs and requirements docs should typically trigger section updates, while proposals and reference materials might be stored for reference without immediate section changes.`;

    const completion = await openai.responses.parse({
      model: MODELS.reasoning,
      input: [
        {
          role: 'system',
          content: 'You are an expert document analyst specializing in business documents, RFPs, proposals, and requirements analysis. Classify documents accurately to guide proper processing workflows.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      text: { format: zodTextFormat(fileClassificationResponseFormat, 'json_object') }
    });

    const result = completion.output_parsed as z.infer<typeof fileClassificationResponseFormat>;
    
    // Call debug callback if provided
    if (debugCallback && result) {
      const systemMessage = 'You are an expert document analyst specializing in business documents, RFPs, proposals, and requirements analysis. Classify documents accurately to guide proper processing workflows.';
      const fullPrompt = `${systemMessage}\n\n${prompt}`;
      const response = JSON.stringify(result, null, 2);
      
      // Estimate token usage (rough calculation)
      const estimatedTokens = Math.ceil((fullPrompt.length + response.length) / 4);
      const estimatedCost = estimatedTokens * 0.00002; // Rough estimate
      
      debugCallback(fullPrompt, response, estimatedTokens, estimatedCost);
    }
    
    if (!result) {
      return generateFallbackClassification(filename, extractedText);
    }

    return {
      documentType: result.documentType,
      confidence: Math.min(100, Math.max(0, result.confidence)),
      reasoning: result.reasoning || 'AI classification completed.',
      suggestedSections: result.suggestedSections || [],
      priority: result.priority,
      keyTopics: result.keyTopics || [],
      shouldUpdateSections: Boolean(result.shouldUpdateSections)
    };

  } catch (error) {
    console.error('Error classifying document:', error);
    return generateFallbackClassification(filename, extractedText);
  }
}

function generateFallbackClassification(filename: string, extractedText: string): FileClassificationResult {
  const lowerFilename = filename.toLowerCase();
  const lowerText = extractedText.toLowerCase();
  
  // Simple heuristics for classification
  let documentType: FileClassificationResult['documentType'] = 'other';
  let shouldUpdateSections = false;
  let priority: FileClassificationResult['priority'] = 'medium';
  
  // Transcript detection
  const transcriptIndicators = [
    lowerFilename.includes('transcript'),
    lowerFilename.includes('meeting'),
    lowerFilename.includes('call'),
    lowerFilename.includes('interview'),
    /speaker\s*\d+\s*\(/i.test(extractedText),
    /\(\d{1,2}:\d{2}\)/.test(extractedText),
    (extractedText.match(/\w+:/g) || []).length > 5 // Multiple speaker patterns
  ];
  
  if (transcriptIndicators.filter(Boolean).length >= 2) {
    documentType = 'transcript';
    shouldUpdateSections = true;
    priority = 'high';
  }
  
  // RFP/Requirements detection
  else if (
    lowerFilename.includes('rfp') || 
    lowerFilename.includes('request') ||
    lowerFilename.includes('tender') ||
    lowerFilename.includes('requirements') ||
    lowerText.includes('request for proposal') ||
    lowerText.includes('statement of work') ||
    lowerText.includes('scope of work')
  ) {
    documentType = lowerFilename.includes('rfp') || lowerText.includes('request for proposal') ? 'rfp' : 'requirements';
    shouldUpdateSections = true;
    priority = 'high';
  }
  
  // Proposal detection
  else if (
    lowerFilename.includes('proposal') ||
    lowerFilename.includes('response') ||
    lowerText.includes('we propose') ||
    lowerText.includes('our solution')
  ) {
    documentType = 'proposal';
    shouldUpdateSections = false;
    priority = 'medium';
  }
  
  // Reference materials
  else if (
    lowerFilename.includes('case') ||
    lowerFilename.includes('study') ||
    lowerFilename.includes('reference') ||
    lowerFilename.includes('background')
  ) {
    documentType = 'reference';
    shouldUpdateSections = false;
    priority = 'low';
  }

  return {
    documentType,
    confidence: 60,
    reasoning: 'Fallback classification based on filename and content patterns.',
    suggestedSections: [],
    priority,
    keyTopics: [],
    shouldUpdateSections
  };
}

export function getSectionUpdatePriority(classification: FileClassificationResult): {
  shouldProcess: boolean;
  priority: number;
  reason: string;
} {
  switch (classification.documentType) {
    case 'rfp':
      return {
        shouldProcess: true,
        priority: 1,
        reason: 'RFP documents contain critical requirements that should update opportunity sections'
      };
    
    case 'requirements':
      return {
        shouldProcess: true,
        priority: 2,
        reason: 'Requirements documents specify what needs to be addressed in the proposal'
      };
    
    case 'ideation':
      return {
        shouldProcess: classification.confidence > 70,
        priority: 3,
        reason: 'Ideation documents may contain useful content for proposal development'
      };
    
    case 'reference':
      return {
        shouldProcess: false,
        priority: 4,
        reason: 'Reference materials are stored for context but don\'t typically update sections'
      };
    
    case 'proposal':
      return {
        shouldProcess: false,
        priority: 5,
        reason: 'Existing proposals are stored for reference rather than updating current sections'
      };
    
    default:
      return {
        shouldProcess: classification.confidence > 80,
        priority: 6,
        reason: 'Uncertain document type - process only if high confidence'
      };
  }
} 
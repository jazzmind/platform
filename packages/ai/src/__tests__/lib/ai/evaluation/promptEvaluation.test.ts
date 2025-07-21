/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { 
  generateSectionContent, 
  generateImprovement, 
  //generateDocumentSummary 
} from '@/src/lib/ai/contentGeneration';
import { 
  analyzeDocument, 
  identifySections 
} from '@/src/lib/ai/documentAnalysis';
import { 
  extractOrganizationInfo, 
  extractContactInfo 
} from '@/src/lib/ai/searchExtraction';
import { 
  validateTestEnvironment, 
  retryOperation, 
  TEST_CONFIG 
} from '../setup/testConfig';
import { 
  //EVALUATION_PROMPTS, 
  SAMPLE_DOCUMENTS, 
  //QUALITY_CRITERIA 
} from '../setup/testData';

describe('AI Response Quality Evaluation', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  describe('Content Generation Quality', () => {
    it('should generate high-quality section content', async () => {
      const evaluationCases = [
        {
          message: "Create an executive summary for a cloud migration project",
          section: "Executive Summary",
          expectedKeywords: ['cloud', 'migration', 'benefits', 'strategy', 'timeline'],
          minLength: 200,
          maxLength: 800,
        },
        {
          message: "Develop a technical approach for API development",
          section: "Technical Approach",
          expectedKeywords: ['API', 'architecture', 'security', 'testing', 'documentation'],
          minLength: 300,
          maxLength: 1000,
        },
        {
          message: "Outline project management methodology",
          section: "Project Management",
          expectedKeywords: ['agile', 'scrum', 'timeline', 'deliverables', 'communication'],
          minLength: 250,
          maxLength: 900,
        },
      ];

      const results = [];

      for (const evalCase of evaluationCases) {
        const response = await retryOperation(() =>
          generateSectionContent(evalCase.message, evalCase.section)
        );

        // Quality Assessment
        const qualityScore = assessContentQuality(response.content, evalCase);
        
        expect(qualityScore.overall).toBeGreaterThan(0.7); // 70% quality threshold
        expect(response.content.length).toBeGreaterThanOrEqual(evalCase.minLength);
        expect(response.content.length).toBeLessThanOrEqual(evalCase.maxLength);

        results.push({
          case: evalCase.message,
          content: response.content.substring(0, 100) + '...',
          qualityScore: qualityScore.overall,
          breakdown: qualityScore.breakdown,
        });

        console.log(`✅ Content generation quality: ${(qualityScore.overall * 100).toFixed(1)}%`);
      }

      // Log detailed results
      console.log('\n📊 Content Generation Evaluation Results:');
      results.forEach(r => {
        console.log(`\n${r.case}:`);
        console.log(`  Quality Score: ${(r.qualityScore * 100).toFixed(1)}%`);
        console.log(`  Preview: ${r.content}`);
        Object.entries(r.breakdown).forEach(([key, value]) => {
          console.log(`  ${key}: ${((value as number) * 100).toFixed(1)}%`);
        });
      });
    }, TEST_CONFIG.timeouts.completion * 3);

    it('should generate contextually appropriate improvements', async () => {
      const improvementCases = [
        {
          currentContent: "We will develop a web application using React.",
          requirement: "The application must support high performance and scalability",
          context: "Enterprise-level e-commerce platform",
          expectedEnhancements: ['performance', 'scalability', 'optimization', 'caching'],
        },
        {
          currentContent: "Basic user authentication will be implemented.",
          requirement: "Security compliance with SOC 2 and GDPR requirements",
          context: "Financial services application",
          expectedEnhancements: ['security', 'compliance', 'encryption', 'audit'],
        },
      ];

      for (const evalCase of improvementCases) {
        const improvement = await retryOperation(() =>
          generateImprovement(
            evalCase.currentContent,
            evalCase.requirement,
            evalCase.context
          )
        );

        // Assess improvement quality
        const relevanceScore = assessImprovementRelevance(improvement, evalCase);
        expect(relevanceScore).toBeGreaterThan(0.6);

        console.log(`✅ Improvement relevance: ${(relevanceScore * 100).toFixed(1)}%`);
        console.log(`   Enhancement: ${improvement.substring(0, 100)}...`);
      }
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('Document Analysis Quality', () => {
    it('should accurately analyze and extract document information', async () => {
      const analysisResults = await retryOperation(() =>
        analyzeDocument(
          SAMPLE_DOCUMENTS.requirements,
          'test-org',
          'test-opportunity',
          'opportunity'
        )
      );

      // Validate analysis completeness
      expect(analysisResults.summary).toBeDefined();
      expect(analysisResults.keyPoints).toBeDefined();
      expect(Array.isArray(analysisResults.keyPoints)).toBe(true);
      expect(analysisResults.keyPoints.length).toBeGreaterThan(0);

      // Content quality assessment
      const summaryQuality = assessSummaryQuality(
        analysisResults.summary, 
        SAMPLE_DOCUMENTS.requirements
      );
      expect(summaryQuality).toBeGreaterThan(0.7);

      console.log(`✅ Document analysis quality: ${(summaryQuality * 100).toFixed(1)}%`);
      console.log(`   Key points identified: ${analysisResults.keyPoints.length}`);
    }, TEST_CONFIG.timeouts.document);

    it('should identify sections accurately across document types', async () => {
      const documentTypes = [
        { content: SAMPLE_DOCUMENTS.requirements, type: 'opportunity' as const },
        { content: SAMPLE_DOCUMENTS.proposal, type: 'proposal' as const },
      ];

      for (const doc of documentTypes) {
        const sections = await retryOperation(() =>
          identifySections(doc.content, doc.type)
        );

        expect(Array.isArray(sections)).toBe(true);
        expect(sections.length).toBeGreaterThan(0);

        // Validate section structure
        sections.forEach(section => {
          expect(section.title).toBeDefined();
          expect(section.keywords).toBeDefined();
          expect(section.content).toBeDefined();
          expect(Array.isArray(section.keywords)).toBe(true);
        });

        // Assess section identification accuracy
        const accuracyScore = assessSectionAccuracy(sections, doc.type);
        expect(accuracyScore).toBeGreaterThan(0.6);

        console.log(`✅ Section identification for ${doc.type}: ${(accuracyScore * 100).toFixed(1)}%`);
        console.log(`   Sections found: ${sections.map(s => s.title).join(', ')}`);
      }
    }, TEST_CONFIG.timeouts.document);
  });

  describe('Information Extraction Quality', () => {
    it('should extract organization information accurately', async () => {
      const orgText = "TechCorp Solutions is a software development company located in San Francisco. " +
                     "They specialize in React, Node.js, and cloud technologies. Contact them at info@techcorp.com";

      const extracted = await retryOperation(() =>
        extractOrganizationInfo(orgText)
      );

      // Validate extraction completeness
      expect(extracted.organizations.length).toBeGreaterThan(0);
      
      const org = extracted.organizations[0];
      expect(org.name).toContain('TechCorp');
      
      // Quality assessment
      const extractionQuality = assessExtractionQuality(extracted, orgText);
      expect(extractionQuality).toBeGreaterThan(0.7);

      console.log(`✅ Organization extraction quality: ${(extractionQuality * 100).toFixed(1)}%`);
      console.log(`   Extracted: ${org.name} - ${org.industry || 'Unknown industry'}`);
    }, TEST_CONFIG.timeouts.completion);

    it('should extract contact information with high accuracy', async () => {
      const contactText = "John Smith is a Senior Software Engineer at Microsoft. " +
                         "You can reach him at john.smith@microsoft.com or (555) 123-4567. " +
                         "He has 8 years of experience in React and Python development.";

      const extracted = await retryOperation(() =>
        extractContactInfo(contactText)
      );

      expect(extracted.contacts.length).toBeGreaterThan(0);
      
      const contact = extracted.contacts[0];
      expect(contact.name).toContain('John');
      expect(contact.email).toContain('@microsoft.com');

      // Quality assessment
      const contactQuality = assessContactExtractionQuality(extracted, contactText);
      expect(contactQuality).toBeGreaterThan(0.8);

      console.log(`✅ Contact extraction quality: ${(contactQuality * 100).toFixed(1)}%`);
      console.log(`   Extracted: ${contact.name} - ${contact.email}`);
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('Semantic Understanding Assessment', () => {
    it('should demonstrate consistent understanding across similar prompts', async () => {
      const similarPrompts = [
        "Describe the technical architecture for a web application",
        "Explain the technology stack for building a web app",
        "Outline the technical approach for web development",
      ];

      const responses = [];
      for (const prompt of similarPrompts) {
        const response = await retryOperation(() =>
          generateSectionContent(prompt, "Technical Architecture")
        );
        responses.push(response.content);
      }

      // Assess semantic consistency
      const consistencyScore = assessSemanticConsistency(responses);
      expect(consistencyScore).toBeGreaterThan(0.6);

      console.log(`✅ Semantic consistency: ${(consistencyScore * 100).toFixed(1)}%`);
    }, TEST_CONFIG.timeouts.completion * 3);

    it('should handle ambiguous prompts appropriately', async () => {
      const ambiguousPrompts = [
        "Tell me about the project",
        "What should we do for implementation?",
        "How do we handle the requirements?",
      ];

      for (const prompt of ambiguousPrompts) {
        const response = await retryOperation(() =>
          generateSectionContent(prompt, "General Response")
        );

        // Should ask for clarification or provide general guidance
        const handlingQuality = assessAmbiguityHandling(response.content, prompt);
        expect(handlingQuality).toBeGreaterThan(0.5);

        console.log(`✅ Ambiguity handling for "${prompt}": ${(handlingQuality * 100).toFixed(1)}%`);
      }
    }, TEST_CONFIG.timeouts.completion);
  });
});

// Quality Assessment Functions

function assessContentQuality(content: string, criteria: unknown): { overall: number; breakdown: unknown } {
  const breakdown = {
    length: assessLengthAppropriate(content, criteria.minLength, criteria.maxLength),
    keywords: assessKeywordPresence(content, criteria.expectedKeywords),
    structure: assessContentStructure(content),
    coherence: assessCoherence(content),
    professionalism: assessProfessionalism(content),
  };

  const overall = Object.values(breakdown).reduce((sum, score) => sum + (score as number), 0) / Object.keys(breakdown).length;

  return { overall, breakdown };
}

function assessLengthAppropriate(content: string, min: number, max: number): number {
  const length = content.length;
  if (length >= min && length <= max) return 1.0;
  if (length < min) return Math.max(0, length / min);
  return Math.max(0, 1 - (length - max) / max);
}

function assessKeywordPresence(content: string, keywords: string[]): number {
  const lowerContent = content.toLowerCase();
  const foundKeywords = keywords.filter(keyword => 
    lowerContent.includes(keyword.toLowerCase())
  );
  return foundKeywords.length / keywords.length;
}

function assessContentStructure(content: string): number {
  // Check for proper structure indicators
  const hasHeaders = /^#+\s/.test(content) || /^\d+\.\s/.test(content);
  const hasParagraphs = content.split('\n\n').length > 1;
  const hasBullets = /^[-*•]\s/m.test(content);
  
  let score = 0.5; // Base score
  if (hasHeaders) score += 0.2;
  if (hasParagraphs) score += 0.2;
  if (hasBullets) score += 0.1;
  
  return Math.min(1.0, score);
}

function assessCoherence(content: string): number {
  // Simple coherence check - sentences should flow logically
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length < 2) return 0.5;
  
  // Check for transition words and logical flow
  const transitionWords = ['however', 'therefore', 'additionally', 'furthermore', 'moreover', 'consequently'];
  const hasTransitions = transitionWords.some(word => 
    content.toLowerCase().includes(word)
  );
  
  return hasTransitions ? 0.8 : 0.6;
}

function assessProfessionalism(content: string): number {
  // Check for professional tone indicators
  const unprofessionalWords = ['awesome', 'cool', 'stuff', 'things', 'kinda'];
  const hasUnprofessional = unprofessionalWords.some(word => 
    content.toLowerCase().includes(word)
  );
  
  const professionalWords = ['implement', 'develop', 'ensure', 'utilize', 'establish'];
  const hasProfessional = professionalWords.some(word => 
    content.toLowerCase().includes(word)
  );
  
  if (hasUnprofessional) return 0.4;
  if (hasProfessional) return 0.9;
  return 0.7;
}

function assessImprovementRelevance(improvement: string, criteria: unknown): number {
  const lowerImprovement = improvement.toLowerCase();
  const foundEnhancements = criteria.expectedEnhancements.filter((enhancement: string) => 
    lowerImprovement.includes(enhancement.toLowerCase())
  );
  return foundEnhancements.length / criteria.expectedEnhancements.length;
}

function assessSummaryQuality(summary: string, originalContent: string): number {
  // Summary should be shorter but capture key information
  const lengthRatio = summary.length / originalContent.length;
  const lengthScore = lengthRatio > 0.1 && lengthRatio < 0.5 ? 1.0 : 0.5;
  
  // Should contain key terms from original
  const originalWords = originalContent.toLowerCase().split(/\s+/);
  const summaryWords = summary.toLowerCase().split(/\s+/);
  const commonWords = originalWords.filter(word => 
    word.length > 4 && summaryWords.includes(word)
  );
  const contentScore = Math.min(1.0, commonWords.length / 10);
  
  return (lengthScore + contentScore) / 2;
}

function assessSectionAccuracy(sections: unknown[], documentType: string): number {
  const expectedSections = documentType === 'opportunity' 
    ? ['requirements', 'technical', 'budget', 'timeline']
    : ['summary', 'approach', 'deliverables', 'pricing'];
  
  const foundSections = sections.filter(section => 
    expectedSections.some(expected => 
      section.title.toLowerCase().includes(expected)
    )
  );
  
  return foundSections.length / expectedSections.length;
}

function assessExtractionQuality(extracted: unknown, originalText: string): number {
  // Simple assessment based on whether key information was found
  const hasOrganizations = extracted.organizations && extracted.organizations.length > 0;
  const hasValidData = extracted.organizations?.[0]?.name && 
                      extracted.organizations[0].name.length > 0;
  
  return hasOrganizations && hasValidData ? 0.8 : 0.4;
}

function assessContactExtractionQuality(extracted: unknown, originalText: string): number {
  const hasContacts = extracted.contacts && extracted.contacts.length > 0;
  const contact = extracted.contacts?.[0];
  const hasName = contact?.name && contact.name.length > 0;
  const hasEmail = contact?.email && contact.email.includes('@');
  
  let score = 0;
  if (hasContacts) score += 0.3;
  if (hasName) score += 0.3;
  if (hasEmail) score += 0.4;
  
  return score;
}

function assessSemanticConsistency(responses: string[]): number {
  // Simple consistency check - responses should have similar themes
  const keywords = ['technical', 'architecture', 'development', 'technology', 'application'];
  
  const scores = responses.map(response => 
    keywords.filter(keyword => 
      response.toLowerCase().includes(keyword)
    ).length / keywords.length
  );
  
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
  
  // Lower variance indicates higher consistency
  return Math.max(0, 1 - variance);
}

function assessAmbiguityHandling(response: string, prompt: string): number {
  const clarificationIndicators = [
    'clarification', 'specific', 'more information', 'could you', 'please provide',
    'details', 'requirements', 'scope', 'context'
  ];
  
  const hasIndicators = clarificationIndicators.some(indicator => 
    response.toLowerCase().includes(indicator)
  );
  
  return hasIndicators ? 0.8 : 0.4;
} 
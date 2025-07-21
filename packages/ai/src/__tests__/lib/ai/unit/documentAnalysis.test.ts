import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { 
  documentAnalysisService,
  analyzeDocument,
  identifySections,
  detectDocumentType,
  analyzeSemantic,
  matchSections,
  intelligentMergeContent
} from '../../../../lib/ai/documentAnalysis';
import { 
  validateTestEnvironment, 
  retryOperation, 
  TEST_CONFIG 
} from '../setup/testConfig';
import { 
  SAMPLE_DOCUMENTS 
} from '../setup/testData';

describe('DocumentAnalysis Service', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  afterAll(() => {
    // Cleanup if needed
  });

  describe('detectDocumentType', () => {
    it('should detect requirements documents', () => {
      const requirementsText = `
        FUNCTIONAL REQUIREMENTS:
        - The system must support user authentication
        - Must handle 10,000 concurrent users
        - Shall provide real-time notifications
        RFP requirements for the new system
      `;
      
      const type = detectDocumentType(requirementsText);
      expect(type).toBe('requirements');
    });

    it('should detect proposal documents', () => {
      const proposalText = `
        PROPOSAL FOR WEB DEVELOPMENT
        Our approach to solving your needs:
        - Methodology: Agile development
        - Timeline: 6 months
        - Budget: $150,000
        - Team: 5 developers
        - Deliverables: React application
      `;
      
      const type = detectDocumentType(proposalText);
      expect(type).toBe('proposal');
    });

    it('should detect RFP documents', () => {
      const rfpText = `
        REQUEST FOR PROPOSAL
        We are seeking vendors for...
        Please submit your proposals by...
      `;
      
      const type = detectDocumentType(rfpText);
      expect(type).toBe('rfp');
    });

    it('should default to general for ambiguous documents', () => {
      const generalText = `
        This is just some random text
        about various topics without
        clear classification markers.
      `;
      
      const type = detectDocumentType(generalText);
      expect(type).toBe('general');
    });
  });

  describe('identifySections', () => {
    it('should identify sections in opportunity documents', async () => {
      const sections = await retryOperation(() =>
        identifySections(SAMPLE_DOCUMENTS.requirements, 'opportunity')
      );

      expect(Array.isArray(sections)).toBe(true);
      expect(sections.length).toBeGreaterThan(0);
      
      sections.forEach(section => {
        expect(section).toHaveProperty('title');
        expect(section).toHaveProperty('keywords');
        expect(section).toHaveProperty('content');
        expect(typeof section.title).toBe('string');
        expect(Array.isArray(section.keywords)).toBe(true);
        expect(typeof section.content).toBe('string');
      });

      console.log(`✅ Identified ${sections.length} sections in opportunity document`);
    }, TEST_CONFIG.timeouts.completion);

    it('should identify sections in proposal documents', async () => {
      const sections = await retryOperation(() =>
        identifySections(SAMPLE_DOCUMENTS.proposal, 'proposal')
      );

      expect(Array.isArray(sections)).toBe(true);
      expect(sections.length).toBeGreaterThan(0);
      
      // Proposal sections should be more structured
      const hasExecutiveSummary = sections.some(s => 
        s.title.toLowerCase().includes('executive') || 
        s.title.toLowerCase().includes('summary')
      );
      expect(hasExecutiveSummary).toBe(true);

      console.log(`✅ Identified ${sections.length} sections in proposal document`);
    }, TEST_CONFIG.timeouts.completion);

    it('should handle empty content gracefully', async () => {
      const sections = await retryOperation(() =>
        identifySections('', 'opportunity')
      );

      expect(Array.isArray(sections)).toBe(true);
      expect(sections.length).toBe(0);
    });

    it('should handle very long content by chunking', async () => {
      const longContent = SAMPLE_DOCUMENTS.requirements.repeat(10);
      
      const sections = await retryOperation(() =>
        identifySections(longContent, 'opportunity')
      );

      expect(Array.isArray(sections)).toBe(true);
      expect(sections.length).toBeGreaterThan(0);
      
      console.log(`✅ Handled long content: ${sections.length} sections identified`);
    }, TEST_CONFIG.timeouts.document);
  });

  describe('analyzeSemantic', () => {
    it('should perform semantic analysis on documents', async () => {
      const progressEvents: Array<{ stage: string; current: number; total: number; message: string }> = [];
      const progressCallback = (progress: { stage: 'chunking' | 'processing' | 'merging' | 'matching' | 'analyzing'; current: number; total: number; message: string }) => {
        progressEvents.push(progress);
      };
      
      const semanticSections = await retryOperation(() =>
        analyzeSemantic(SAMPLE_DOCUMENTS.requirements, progressCallback)
      );

      expect(Array.isArray(semanticSections)).toBe(true);
      expect(semanticSections.length).toBeGreaterThan(0);
      
      semanticSections.forEach(section => {
        expect(section).toHaveProperty('title');
        expect(section).toHaveProperty('keywords');
        expect(section).toHaveProperty('content');
        expect(typeof section.title).toBe('string');
        expect(Array.isArray(section.keywords)).toBe(true);
        expect(typeof section.content).toBe('string');
      });

      // Validate progress tracking
      expect(progressEvents.length).toBeGreaterThan(0);
      
      console.log(`✅ Semantic analysis completed with ${semanticSections.length} sections`);
    }, TEST_CONFIG.timeouts.document);
  });

  describe('matchSections', () => {
    it('should match semantic sections to opportunity sections', async () => {
      const semanticSections = [
        {
          title: 'Technical Requirements',
          keywords: ['react', 'nodejs', 'database'],
          content: 'The system should use React for frontend and Node.js for backend'
        },
        {
          title: 'Budget Information',
          keywords: ['budget', 'cost', 'pricing'],
          content: 'The estimated budget is $150,000'
        }
      ];

      const opportunitySections = [
        {
          id: 'tech-approach',
          title: 'Technical Approach',
          content: 'Our technical solution'
        },
        {
          id: 'pricing',
          title: 'Pricing',
          content: 'Cost breakdown'
        }
      ];

      const progressEvents: Array<{ stage: string; current: number; total: number; message: string }> = [];
      const progressCallback = (progress: { stage: 'chunking' | 'processing' | 'merging' | 'matching' | 'analyzing'; current: number; total: number; message: string }) => {
        progressEvents.push(progress);
      };
      
      const matches = await retryOperation(() =>
        matchSections(semanticSections, opportunitySections, progressCallback)
      );

      expect(typeof matches).toBe('object');
      
      // Should have matched some sections
      const matchedSectionIds = Object.keys(matches);
      expect(matchedSectionIds.length).toBeGreaterThan(0);
      
      // Validate match structure
      Object.values(matches).forEach(match => {
        expect(match).toHaveProperty('sectionTitle');
        expect(match).toHaveProperty('extractedContent');
        expect(match).toHaveProperty('relevanceScore');
        expect(match).toHaveProperty('addedToSection');
        expect(typeof match.relevanceScore).toBe('number');
        expect(match.relevanceScore).toBeGreaterThan(0);
        expect(match.relevanceScore).toBeLessThanOrEqual(1);
      });

      console.log(`✅ Matched ${matchedSectionIds.length} sections`);
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('intelligentMergeContent', () => {
    it('should merge content intelligently', async () => {
      const sectionTitle = 'Technical Approach';
      const existingContent = 'We will use modern web technologies';
      const semanticContents = [
        {
          title: 'Technical Requirements',
          content: 'The system should use React for frontend and Node.js for backend with PostgreSQL database',
          confidence: 0.8
        }
      ];

      const mergedContent = await retryOperation(() =>
        intelligentMergeContent(sectionTitle, existingContent, semanticContents)
      );

      expect(typeof mergedContent).toBe('string');
      expect(mergedContent.length).toBeGreaterThan(existingContent.length);
      expect(mergedContent).toContain('React');
      expect(mergedContent).toContain('Node.js');
      
      console.log(`✅ Content merged: ${mergedContent.length} characters`);
    }, TEST_CONFIG.timeouts.completion);

    it('should handle empty existing content', async () => {
      const semanticContents = [
        {
          title: 'New Section',
          content: 'This is completely new content',
          confidence: 0.9
        }
      ];

      const mergedContent = await retryOperation(() =>
        intelligentMergeContent('New Section', '', semanticContents)
      );

      expect(typeof mergedContent).toBe('string');
      expect(mergedContent.length).toBeGreaterThan(0);
      expect(mergedContent).toContain('new content');
      
      console.log(`✅ Empty content handled correctly`);
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('Legacy analyzeDocument', () => {
    it('should perform complete document analysis', async () => {
      const existingSections = [
        {
          id: 'summary',
          title: 'Executive Summary',
          content: 'Project overview',
          keywords: ['summary', 'overview'],
          type: 'text' as const
        },
        {
          id: 'tech',
          title: 'Technical Approach',
          content: '',
          keywords: ['technical', 'approach'],
          type: 'text' as const
        }
      ];

      const progressEvents: Array<{ stage: string; current: number; total: number; message: string }> = [];
      const progressCallback = (progress: { stage: 'chunking' | 'processing' | 'merging' | 'matching' | 'analyzing'; current: number; total: number; message: string }) => {
        progressEvents.push(progress);
      };
      
      const result = await retryOperation(() =>
        analyzeDocument(
          SAMPLE_DOCUMENTS.requirements,
          existingSections,
          'text/plain',
          progressCallback
        )
      );

      expect(result).toHaveProperty('sections');
      expect(result).toHaveProperty('unmatched');
      expect(Array.isArray(result.sections)).toBe(true);
      expect(Array.isArray(result.unmatched)).toBe(true);
      
      // Validate matched sections
      result.sections.forEach(section => {
        expect(section).toHaveProperty('id');
        expect(section).toHaveProperty('title');
        expect(section).toHaveProperty('content');
        expect(section).toHaveProperty('confidence');
        expect(typeof section.confidence).toBe('number');
        expect(section.confidence).toBeGreaterThan(0);
      });

      console.log(`✅ Complete analysis: ${result.sections.length} matched, ${result.unmatched.length} unmatched`);
    }, TEST_CONFIG.timeouts.document);
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Test with malformed content that might cause API errors
      const malformedContent = '\x00\x01\x02Invalid content';
      
      const sections = await retryOperation(() =>
        identifySections(malformedContent, 'opportunity')
      );

      expect(Array.isArray(sections)).toBe(true);
      // Should return empty array rather than throwing
      expect(sections.length).toBe(0);
      
      console.log('✅ API errors handled gracefully');
    });

    it('should handle network timeouts', async () => {
      // This test depends on actual network conditions
      // but we can at least test that the service doesn't crash
      const veryLongContent = 'word '.repeat(100000);
      
      try {
        const sections = await identifySections(veryLongContent, 'opportunity');
        expect(Array.isArray(sections)).toBe(true);
        console.log('✅ Large content handled successfully');
      } catch (error) {
        // If it fails, it should be a proper error, not a crash
        expect(error).toBeInstanceOf(Error);
        console.log('✅ Network timeout handled gracefully');
      }
    }, TEST_CONFIG.timeouts.document);
  });

  describe('Service Instance', () => {
    it('should export working service instance', () => {
      expect(documentAnalysisService).toBeDefined();
      expect(typeof documentAnalysisService.detectDocumentType).toBe('function');
      expect(typeof documentAnalysisService.identifySections).toBe('function');
      
      console.log('✅ Service instance exported correctly');
    });
  });
}); 
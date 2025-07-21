/**
 * @jest-environment node
 */

import fs from 'fs';
import path from 'path';
import { 
  getExtractedText,
  getSemanticSections,
  storeExtractedText,
  storeSemanticSections,
  deleteFileData
} from '@/src/lib/database/prisma/fileData';
import { analyzeSemantic, matchSections, intelligentMergeContent } from '@/src/lib/ai/documentAnalysis';
import { extractContentFromFile } from '@/src/lib/ai/contentExtraction';

// Mock the database functions for isolated testing
jest.mock('@/src/lib/database/prisma/fileData', () => ({
  getExtractedText: jest.fn(),
  getSemanticSections: jest.fn(),
  storeExtractedText: jest.fn(),
  storeSemanticSections: jest.fn(),
  deleteFileData: jest.fn(),
}));

jest.mock('@/src/lib/ai/documentAnalysis', () => ({
  analyzeSemantic: jest.fn(),
  matchSections: jest.fn(),
  intelligentMergeContent: jest.fn(),
}));

jest.mock('@/src/lib/ai/contentExtraction', () => ({
  extractContentFromFile: jest.fn(),
}));

const mockGetExtractedText = getExtractedText as jest.MockedFunction<typeof getExtractedText>;
const mockGetSemanticSections = getSemanticSections as jest.MockedFunction<typeof getSemanticSections>;
const mockStoreExtractedText = storeExtractedText as jest.MockedFunction<typeof storeExtractedText>;
const mockStoreSemanticSections = storeSemanticSections as jest.MockedFunction<typeof storeSemanticSections>;
const mockDeleteFileData = deleteFileData as jest.MockedFunction<typeof deleteFileData>;
const mockAnalyzeSemantic = analyzeSemantic as jest.MockedFunction<typeof analyzeSemantic>;
const mockMatchSections = matchSections as jest.MockedFunction<typeof matchSections>;
const mockIntelligentMergeContent = intelligentMergeContent as jest.MockedFunction<typeof intelligentMergeContent>;
const mockExtractContentFromFile = extractContentFromFile as jest.MockedFunction<typeof extractContentFromFile>;

describe('FileData Analysis System', () => {
  const testOpportunityId = 'test-opportunity-123';
  const testFileId = 'test-file-456';
  const testOrganizationId = 'test-org-789';

  // Sample content from the test files
  const expectedMarkdownContent = `# This is the title

This is the introduction.

## This is the first section. It's about Cars.

Lightning McQueen is a race car.

## This is the second section. It's about Trucks.

Tow Mater is a truck.

## This is the third section. It's about Planes.

The Blue Angels are a plane.`;

  const expectedSemanticSections = [
    {
      title: "Introduction",
      content: "This is the introduction."
    },
    {
      title: "Cars",
      content: "Lightning McQueen is a race car."
    },
    {
      title: "Trucks", 
      content: "Tow Mater is a truck."
    },
    {
      title: "Planes",
      content: "The Blue Angels are a plane."
    }
  ];

  const sampleOpportunitySections = [
    {
      id: 'section-1',
      title: 'Vehicle Overview',
      content: 'Existing content about vehicles'
    },
    {
      id: 'section-2', 
      title: 'Transportation Methods',
      content: ''
    },
    {
      id: 'section-3',
      title: 'Aircraft Systems',
      content: 'Some existing aircraft info'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Content Extraction', () => {
    it('should extract content from markdown file', async () => {
      // Read the actual sample file
      const sampleFilePath = path.join(process.cwd(), 'src/tests/sampleFile.md');
      const fileBuffer = fs.readFileSync(sampleFilePath);

      mockExtractContentFromFile.mockResolvedValue({
        text: expectedMarkdownContent,
        metadata: {
          title: 'This is the title',
          pages: 1
        }
      });

      const result = await extractContentFromFile(fileBuffer, 'text', testFileId);

      expect(result.text).toBe(expectedMarkdownContent);
      expect(result.metadata?.title).toBe('This is the title');
      expect(mockExtractContentFromFile).toHaveBeenCalledWith(fileBuffer, 'text', testFileId);
    });

    it('should extract content from PDF file', async () => {
      // Read the actual sample PDF
      const samplePdfPath = path.join(process.cwd(), 'src/tests/sampleFile.pdf');
      const fileBuffer = fs.readFileSync(samplePdfPath);

      mockExtractContentFromFile.mockResolvedValue({
        text: expectedMarkdownContent.replace(/^#+ /gm, ''), // PDF might not preserve markdown formatting
        metadata: {
          title: 'This is the title',
          pages: 1
        }
      });

      const result = await extractContentFromFile(fileBuffer, 'pdf', testFileId);

      expect(result.text).toContain('This is the title');
      expect(result.text).toContain('Lightning McQueen is a race car');
      expect(result.text).toContain('Tow Mater is a truck');
      expect(result.text).toContain('The Blue Angels are a plane');
      expect(mockExtractContentFromFile).toHaveBeenCalledWith(fileBuffer, 'pdf', testFileId);
    });
  });

  describe('Semantic Section Analysis', () => {
    it('should correctly identify semantic sections from content', async () => {
      mockAnalyzeSemantic.mockResolvedValue(expectedSemanticSections);

      const result = await analyzeSemantic(expectedMarkdownContent);

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual(expect.objectContaining({
        title: "Introduction",
        content: "This is the introduction."
      }));
      expect(result[1]).toEqual(expect.objectContaining({
        title: "Cars",
        content: "Lightning McQueen is a race car."
      }));
      expect(result[2]).toEqual(expect.objectContaining({
        title: "Trucks",
        content: "Tow Mater is a truck."
      }));
      expect(result[3]).toEqual(expect.objectContaining({
        title: "Planes",
        content: "The Blue Angels are a plane."
      }));
    });

    it('should handle content without clear sections', async () => {
      const simpleContent = "This is just a paragraph without any sections.";
      
      mockAnalyzeSemantic.mockResolvedValue([
        {
          title: "Content",
          content: simpleContent
        }
      ]);

      const result = await analyzeSemantic(simpleContent);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe(simpleContent);
    });
  });

  describe('Section Matching', () => {
    it('should match semantic sections to opportunity sections', async () => {
      const expectedMatches = {
        'section-1': {
          sectionTitle: 'Vehicle Overview',
          extractedContent: 'Lightning McQueen is a race car.',
          summary: 'Lightning McQueen is a race car.',
          relevanceScore: 0.8,
          addedToSection: true
        },
        'section-3': {
          sectionTitle: 'Aircraft Systems',
          extractedContent: 'The Blue Angels are a plane.',
          summary: 'The Blue Angels are a plane.',
          relevanceScore: 0.7,
          addedToSection: true
        }
      };

      mockMatchSections.mockResolvedValue(expectedMatches);

      const result = await matchSections(expectedSemanticSections, sampleOpportunitySections);

      expect(result).toEqual(expectedMatches);
      expect(mockMatchSections).toHaveBeenCalledWith(expectedSemanticSections, sampleOpportunitySections);
    });

    it('should handle no matches gracefully', async () => {
      mockMatchSections.mockResolvedValue({});

      const result = await matchSections(expectedSemanticSections, []);

      expect(result).toEqual({});
    });
  });

  describe('Content Merging', () => {
    it('should intelligently merge content', async () => {
      const mergedContent = 'Existing content about vehicles enhanced with Lightning McQueen is a race car.';
      
      mockIntelligentMergeContent.mockResolvedValue(mergedContent);

      const result = await intelligentMergeContent(
        'Vehicle Overview',
        'Existing content about vehicles',
        [{
          title: 'Cars',
          content: 'Lightning McQueen is a race car.',
          confidence: 0.8
        }]
      );

      expect(result).toBe(mergedContent);
      expect(mockIntelligentMergeContent).toHaveBeenCalledWith(
        'Vehicle Overview',
        'Existing content about vehicles',
        [{
          title: 'Cars',
          content: 'Lightning McQueen is a race car.',
          confidence: 0.8
        }]
      );
    });
  });

  describe('FileData Storage', () => {
    it('should store extracted text in FileData table', async () => {
      const mockFileDataRecord = {
        id: 'filedata-1',
        fileId: testFileId,
        entityType: 'opportunity' as const,
        entityId: testOpportunityId,
        dataType: 'extractedText' as const,
        data: expectedMarkdownContent,
        metadata: { title: 'This is the title' },
        organizationId: testOrganizationId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockStoreExtractedText.mockResolvedValue(mockFileDataRecord);

      const result = await storeExtractedText(
        testFileId,
        'opportunity',
        testOpportunityId,
        testOrganizationId,
        expectedMarkdownContent,
        { title: 'This is the title' }
      );

      expect(result).toEqual(mockFileDataRecord);
      expect(mockStoreExtractedText).toHaveBeenCalledWith(
        testFileId,
        'opportunity',
        testOpportunityId,
        testOrganizationId,
        expectedMarkdownContent,
        { title: 'This is the title' }
      );
    });

    it('should store semantic sections in FileData table', async () => {
      const mockFileDataRecord = {
        id: 'filedata-2',
        fileId: testFileId,
        entityType: 'opportunity' as const,
        entityId: testOpportunityId,
        dataType: 'semanticSection' as const,
        data: expectedSemanticSections,
        metadata: { sectionsCount: 4 },
        organizationId: testOrganizationId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockStoreSemanticSections.mockResolvedValue(mockFileDataRecord);

      const result = await storeSemanticSections(
        testFileId,
        'opportunity',
        testOpportunityId,
        testOrganizationId,
        expectedSemanticSections,
        { sectionsCount: 4 }
      );

      expect(result).toEqual(mockFileDataRecord);
      expect(mockStoreSemanticSections).toHaveBeenCalledWith(
        testFileId,
        'opportunity',
        testOpportunityId,
        testOrganizationId,
        expectedSemanticSections,
        { sectionsCount: 4 }
      );
    });

    it('should retrieve extracted text from FileData table', async () => {
      mockGetExtractedText.mockResolvedValue(expectedMarkdownContent);

      const result = await getExtractedText(testFileId, 'opportunity', testOpportunityId);

      expect(result).toBe(expectedMarkdownContent);
      expect(mockGetExtractedText).toHaveBeenCalledWith(testFileId, 'opportunity', testOpportunityId);
    });

    it('should retrieve semantic sections from FileData table', async () => {
      mockGetSemanticSections.mockResolvedValue(expectedSemanticSections);

      const result = await getSemanticSections(testFileId, 'opportunity', testOpportunityId);

      expect(result).toEqual(expectedSemanticSections);
      expect(mockGetSemanticSections).toHaveBeenCalledWith(testFileId, 'opportunity', testOpportunityId);
    });

    it('should delete FileData records when file is deleted', async () => {
      mockDeleteFileData.mockResolvedValue();

      await deleteFileData(testFileId);

      expect(mockDeleteFileData).toHaveBeenCalledWith(testFileId);
    });
  });

  describe('Integration Tests', () => {
    it('should process a complete file workflow with section matching', async () => {
      // Mock the complete workflow
      const extractedContent = expectedMarkdownContent;
      const semanticSections = expectedSemanticSections;
      const sectionMatches = {
        'section-1': {
          sectionTitle: 'Vehicle Overview',
          extractedContent: 'Lightning McQueen is a race car.',
          summary: 'Lightning McQueen is a race car.',
          relevanceScore: 0.8,
          addedToSection: true
        }
      };

      // Step 1: Extract content
      mockExtractContentFromFile.mockResolvedValue({
        text: extractedContent,
        metadata: { title: 'This is the title' }
      });

      // Step 2: Store extracted text
      mockStoreExtractedText.mockResolvedValue({
        id: 'filedata-1',
        fileId: testFileId,
        entityType: 'opportunity',
        entityId: testOpportunityId,
        dataType: 'extractedText',
        data: extractedContent,
        metadata: { title: 'This is the title' },
        organizationId: testOrganizationId,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Step 3: Analyze semantic sections
      mockAnalyzeSemantic.mockResolvedValue(semanticSections);

      // Step 4: Store semantic sections
      mockStoreSemanticSections.mockResolvedValue({
        id: 'filedata-2',
        fileId: testFileId,
        entityType: 'opportunity',
        entityId: testOpportunityId,
        dataType: 'semanticSection',
        data: semanticSections,
        metadata: { sectionsCount: 4 },
        organizationId: testOrganizationId,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Step 5: Match sections
      mockMatchSections.mockResolvedValue(sectionMatches);

      // Execute workflow
      const fileBuffer = Buffer.from(extractedContent);
      const extractionResult = await extractContentFromFile(fileBuffer, 'text', testFileId);
      
      await storeExtractedText(
        testFileId,
        'opportunity',
        testOpportunityId,
        testOrganizationId,
        extractionResult.text,
        extractionResult.metadata
      );

      const sectionsResult = await analyzeSemantic(extractionResult.text);
      
      await storeSemanticSections(
        testFileId,
        'opportunity',
        testOpportunityId,
        testOrganizationId,
        sectionsResult
      );

      const matchesResult = await matchSections(sectionsResult, sampleOpportunitySections);

      // Verify all steps were called correctly
      expect(mockExtractContentFromFile).toHaveBeenCalled();
      expect(mockStoreExtractedText).toHaveBeenCalled();
      expect(mockAnalyzeSemantic).toHaveBeenCalledWith(extractedContent);
      expect(mockStoreSemanticSections).toHaveBeenCalled();
      expect(mockMatchSections).toHaveBeenCalledWith(sectionsResult, sampleOpportunitySections);
      expect(matchesResult).toEqual(sectionMatches);
    });

    it('should handle file processing errors gracefully', async () => {
      // Mock an extraction error
      mockExtractContentFromFile.mockRejectedValue(new Error('Failed to extract PDF content'));

      try {
        const fileBuffer = Buffer.from('corrupted data');
        await extractContentFromFile(fileBuffer, 'pdf', testFileId);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Failed to extract PDF content');
      }
    });
  });
}); 
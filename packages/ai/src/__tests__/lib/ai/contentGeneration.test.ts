// Mock OpenAI properly
const mockParse = jest.fn();
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    responses: {
      parse: mockParse
    }
  }));
});

import { generateSectionContent, generateImprovement, generateDraftContent } from '../../../lib/ai/contentGeneration';

interface Section {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'contact' | 'organization';
}

interface MockMessage {
  role: string;
  content: string;
}

describe('AI Content Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParse.mockClear();
  });

  describe('generateSectionContent', () => {
    it('should generate content successfully with first model', async () => {
      const mockResponse = {
        output_parsed: {
          content: 'This is generated content for the section with proper length.'
        }
      };
      
      mockParse.mockResolvedValue(mockResponse);

      const result = await generateSectionContent('Generate content for executive summary', 'executive summary');

      expect(result).toEqual({
        content: 'This is generated content for the section with proper length.',
        modelUsed: 'gpt-4.1-mini'
      });
      expect(mockParse).toHaveBeenCalledWith({
        model: 'gpt-4.1-mini',
        input: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: 'Generate content for executive summary' })
        ]),
        text: expect.objectContaining({ format: expect.any(Object) })
      });
    });

    it('should fallback to next model if content is too short', async () => {
      const shortResponse = {
        output_parsed: { content: 'Short' }
      };
      const goodResponse = {
        output_parsed: { content: 'This is a much longer and more detailed response that meets the minimum length requirement.' }
      };

      mockParse
        .mockResolvedValueOnce(shortResponse)
        .mockResolvedValueOnce(goodResponse);

      const result = await generateSectionContent('Generate content', 'test section');

      expect(result.modelUsed).toBe('gpt-4.1');
      expect(mockParse).toHaveBeenCalledTimes(2);
    });

    it('should clean up content by removing section headers', async () => {
      const mockResponse = {
        output_parsed: {
          content: '## Executive Summary\nThis is the actual content that should remain after cleanup.'
        }
      };
      
      mockParse.mockResolvedValue(mockResponse);

      const result = await generateSectionContent('Generate content', 'executive summary');

      expect(result.content).toBe('This is the actual content that should remain after cleanup.');
    });

    it('should throw error when all models fail', async () => {
      mockParse.mockRejectedValue(new Error('API Error'));

      await expect(generateSectionContent('test', 'test', 10)).rejects.toThrow('All models failed to generate section content');
    });
  });

  describe('generateImprovement', () => {
    const mockSection: Section = {
      id: 'exec-summary',
      title: 'Executive Summary',
      content: 'Original content',
      type: 'text'
    };

    it('should improve existing content with context', async () => {
      const mockResponse = {
        output_parsed: {
          // The cleaning logic removes "Improved" prefix, so use content that won't be affected
          content: 'Enhanced content based on the original and context provided for better engagement.'
        }
      };
      
      mockParse.mockResolvedValue(mockResponse);

      const contextSections: Section[] = [{
        id: 'background',
        title: 'Background',
        content: 'Context information',
        type: 'text'
      }];

      const result = await generateImprovement(mockSection, contextSections);

      expect(result.content).toBe('Enhanced content based on the original and context provided for better engagement.');
      expect(result.modelUsed).toBe('gpt-4.1-mini');
      expect(result.context).toBeDefined();
    });

    it('should generate new content when section has no existing content', async () => {
      const emptySection = { ...mockSection, content: '' };
      const mockResponse = {
        output_parsed: {
          // The cleaning logic removes "New" prefix, so use content that won't be affected
          content: 'Generated content based on requirements and context provided to create value.'
        }
      };
      
      mockParse.mockResolvedValue(mockResponse);

      const result = await generateImprovement(emptySection);

      expect(result.content).toBe('Generated content based on requirements and context provided to create value.');
      expect(mockParse).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('generate content for the executive summary section')
            })
          ])
        })
      );
    });

    it('should filter out empty context sections', async () => {
      const mockResponse = {
        output_parsed: { content: 'Generated content with proper length for testing purposes.' }
      };
      
      mockParse.mockResolvedValue(mockResponse);

      const contextSections: Section[] = [
        { id: 'empty1', title: 'Empty', content: '', type: 'text' },
        { id: 'valid', title: 'Valid', content: 'Valid content', type: 'text' },
        { id: 'empty2', title: 'Empty2', content: '   ', type: 'text' }
      ];

      await generateImprovement(mockSection, contextSections);

      const callArgs = mockParse.mock.calls[0][0];
      const userMessage = callArgs.input.find((m: MockMessage) => m.role === 'user').content;
      
      expect(userMessage).toContain('Valid content');
      expect(userMessage).not.toContain('Empty:');
    });
  });

  describe('generateDraftContent', () => {
    it('should generate draft content successfully', async () => {
      const mockResponse = {
        output_parsed: {
          content: 'Draft content for the section with markdown formatting and proper structure.'
        }
      };
      
      mockParse.mockResolvedValue(mockResponse);

      const result = await generateDraftContent('Create draft for project overview', 'project overview');

      expect(result).toBe('Draft content for the section with markdown formatting and proper structure.');
      expect(mockParse).toHaveBeenCalledWith({
        model: 'gpt-4.1', // Using MODELS.best, not MODELS.default
        input: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: 'Create draft for project overview' })
        ]),
        text: expect.objectContaining({ format: expect.any(Object) })
      });
    });

    it('should handle API errors', async () => {
      mockParse.mockRejectedValue(new Error('OpenAI API Error'));

      await expect(generateDraftContent('test message', 'test section')).rejects.toThrow('OpenAI API Error');
    });
  });


}); 
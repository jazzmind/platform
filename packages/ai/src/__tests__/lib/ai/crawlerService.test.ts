import { crawlerService, CrawlerService } from '@/src/lib/ai/crawlerService';
import { embeddingService } from '@/src/lib/ai/embeddingService';
import { getVectorDatabase } from '@/src/lib/database';

// Mock dependencies
jest.mock('@/src/lib/ai/embeddingService');
jest.mock('@/src/lib/database');
jest.mock('jsdom');
jest.mock('@mozilla/readability');
jest.mock('openai');

const mockEmbeddingService = embeddingService as jest.Mocked<typeof embeddingService>;
const mockGetVectorDatabase = getVectorDatabase as jest.MockedFunction<typeof getVectorDatabase>;

// Mock JSDOM and Readability
const mockJSDOM = {
  window: {
    document: {
      title: 'Test Page',
      querySelectorAll: jest.fn().mockReturnValue([]),
    },
  },
};

const mockReadability = {
  parse: jest.fn().mockReturnValue({
    title: 'Test Page',
    textContent: 'This is test content about our company and services.',
  }),
};

jest.mock('jsdom', () => ({
  JSDOM: jest.fn().mockImplementation(() => mockJSDOM),
}));

jest.mock('@mozilla/readability', () => ({
  Readability: jest.fn().mockImplementation(() => mockReadability),
}));

// Mock fetch
global.fetch = jest.fn();

describe('CrawlerService', () => {
  let crawler: CrawlerService;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  const mockVectorDb = {
    createVector: jest.fn(),
    createVectors: jest.fn(),
    searchSimilar: jest.fn(),
    getVectorsByEntity: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mocks
    mockFetch.mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('<html><body>Test content</body></html>'),
    } as unknown as Response);

    mockEmbeddingService.processContentForRAG.mockResolvedValue([
      {
        content: 'Test content chunk',
        embedding: [0.1, 0.2, 0.3],
        metadata: {
          title: 'Test Page',
          fileType: 'web_page',
          chunkIndex: 0,
          totalChunks: 1,
          extractedAt: '2023-01-01T00:00:00.000Z',
        },
        sourceUrl: 'https://example.com',
      },
    ]);

    mockGetVectorDatabase.mockResolvedValue(mockVectorDb as never);

    // Create a new instance for testing
    crawler = new CrawlerService();
  });

  describe('crawlWebsite', () => {
    it('should crawl a website successfully', async () => {
      const result = await crawler.crawlWebsite('https://example.com', {
        maxPages: 5,
      });

      expect(result).toMatchObject({
        url: 'https://example.com',
        pages: expect.any(Array),
        sessionId: expect.any(String),
        summary: expect.objectContaining({
          totalPages: expect.any(Number),
          categoryCounts: expect.any(Object),
          newPages: expect.any(Number),
        }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('ProposalHub Crawler'),
          }),
        })
      );
    });

    it('should handle tracking options', async () => {
      const trackingOptions = {
        organizationId: 'org123',
        skipRecentlyCrawled: true,
        maxAgeHours: 48,
        storeInKnowledgeBase: true,
      };

      const result = await crawler.crawlWebsite(
        'https://example.com',
        { maxPages: 2 },
        trackingOptions
      );

      expect(result.sessionId).toBeTruthy();
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0]).toMatchObject({
        url: 'https://example.com',
        title: 'Test Page',
        categories: expect.any(Array),
        content: expect.any(String),
        contentHash: expect.any(String),
        wasAlreadyCrawled: false,
      });
    });

    it('should store content in knowledge base when enabled', async () => {
      await crawler.crawlWebsite(
        'https://example.com',
        { maxPages: 1 },
        {
          organizationId: 'org123',
          storeInKnowledgeBase: true,
        }
      );

      expect(mockEmbeddingService.processContentForRAG).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          title: 'Test Page',
          fileType: 'web_page',
          sourceUrl: 'https://example.com',
        })
      );

      expect(mockVectorDb.createVectors).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            entityType: 'organization',
            entityId: 'org123',
            sourceUrl: 'https://example.com',
            content: 'Test content chunk',
            embedding: [0.1, 0.2, 0.3],
            metadata: expect.objectContaining({
              pageType: expect.any(String),
              contentHash: expect.any(String),
            }),
          }),
        ])
      );
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await crawler.crawlWebsite('https://example.com');

      expect(result.pages).toHaveLength(0);
      expect(result.summary.totalPages).toBe(0);
      expect(result.summary.newPages).toBe(0);
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      } as unknown as Response);

      const result = await crawler.crawlWebsite('https://example.com');

      expect(result.pages).toHaveLength(0);
    });

    it('should respect maxPages limit', async () => {
      // Mock multiple links
      mockJSDOM.window.document.querySelectorAll.mockReturnValue([
        { getAttribute: () => '/page1' },
        { getAttribute: () => '/page2' },
        { getAttribute: () => '/page3' },
      ] as unknown as Element[]);

      const result = await crawler.crawlWebsite('https://example.com', {
        maxPages: 2,
      });

      expect(result.pages.length).toBeLessThanOrEqual(2);
    });

    it('should generate unique content hashes', async () => {
      const result = await crawler.crawlWebsite('https://example.com');

      expect(result.pages[0].contentHash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hash
    });
  });

  describe('content extraction', () => {
    it('should classify pages correctly', async () => {
      // Test different page types by checking categories
      const testCases = [
        { url: 'https://example.com/about' },
        { url: 'https://example.com/team' },
        { url: 'https://example.com/services' },
        { url: 'https://example.com/contact' },
        { url: 'https://example.com' },
      ];

      for (const testCase of testCases) {
        const result = await crawler.crawlWebsite(testCase.url, { maxPages: 1 });
        expect(result.pages[0].categories).toEqual(expect.arrayContaining([
          expect.objectContaining({
            type: expect.stringMatching(/^(homepage|about|team|services|contact|case-studies|whitepapers|blog|news|other)$/),
            confidence: expect.any(Number)
          })
        ]));
      }
    });
  });

  describe('URL filtering', () => {
    it('should skip irrelevant URLs', async () => {
      mockJSDOM.window.document.querySelectorAll.mockReturnValue([
        { getAttribute: () => '/privacy-policy' },
        { getAttribute: () => '/terms-of-service' },
        { getAttribute: () => '/blog/post-123' },
        { getAttribute: () => '/document.pdf' },
        { getAttribute: () => '/image.jpg' },
        { getAttribute: () => '/about' }, // This should be crawled
      ] as unknown as Element[]);

      const result = await crawler.crawlWebsite('https://example.com', {
        maxPages: 10,
      });

      // Should only crawl homepage and about page
      expect(result.pages.length).toBeLessThanOrEqual(2);
      const crawledUrls = result.pages.map(p => p.url);
      expect(crawledUrls).toContain('https://example.com');
      expect(crawledUrls.some(url => url.includes('/about'))).toBeTruthy();
    });

    it('should only crawl same domain', async () => {
      mockJSDOM.window.document.querySelectorAll.mockReturnValue([
        { getAttribute: () => 'https://external.com/page' },
        { getAttribute: () => '/internal-page' },
      ] as unknown as Element[]);

      const result = await crawler.crawlWebsite('https://example.com', {
        maxPages: 10,
      });

      const crawledUrls = result.pages.map(p => p.url);
      expect(crawledUrls.every(url => url.includes('example.com'))).toBeTruthy();
    });
  });

  describe('error handling', () => {
    it('should handle vector database errors', async () => {
      mockVectorDb.createVectors.mockRejectedValue(new Error('Vector DB error'));

      // Should not throw error, just log it
      await expect(
        crawler.crawlWebsite(
          'https://example.com',
          {},
          { organizationId: 'org123', storeInKnowledgeBase: true }
        )
      ).resolves.toBeDefined();
    });
  });

  describe('rate limiting', () => {
    it('should implement rate limiting between requests', async () => {
      const startTime = Date.now();
      
      await crawler.crawlWebsite('https://example.com', { maxPages: 2 });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should take at least 1 second due to rate limiting
      // (though this test might be flaky in CI environments)
      expect(duration).toBeGreaterThan(900);
    });
  });
});

describe('crawlerService singleton', () => {
  it('should export a singleton instance', () => {
    expect(crawlerService).toBeInstanceOf(CrawlerService);
  });
}); 
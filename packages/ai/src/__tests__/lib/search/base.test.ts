// Mock React cache before importing the module
jest.mock('react', () => ({
  cache: (fn: (...args: unknown[]) => unknown) => fn // Fix Function type
}));

import { searchPerplexity, searchGoogle, isUrlAccessible } from '@/src/lib/search/base';

// Mock fetch globally
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

interface MockResponse {
  ok: boolean;
  status?: number;
  json?: jest.MockedFunction<() => Promise<unknown>>;
  headers?: {
    get: jest.MockedFunction<(key: string) => string | null>;
  };
}

describe('Search Base Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset rate limiter cache between tests
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('searchPerplexity', () => {
    it('should search Perplexity API successfully', async () => {
      const mockResponse: MockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Test search result' } }]
        })
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await searchPerplexity('llama-3.1-sonar-small-128k-online', 'system prompt', 'user query');

      expect(result).toBe('Test search result');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.perplexity.ai/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-perplexity-key',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [
              { role: 'system', content: 'system prompt' },
              { role: 'user', content: 'user query' }
            ]
          })
        })
      );
    });

    it('should handle API errors', async () => {
      const mockResponse: MockResponse = {
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({ error: 'Unauthorized' })
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      await expect(searchPerplexity('test-model', 'system', 'user')).rejects.toThrow('Failed to search perplexity: 401');
    });

    it('should throw error when API key is missing', async () => {
      const originalKey = process.env.PERPLEXITY_API_KEY;
      delete process.env.PERPLEXITY_API_KEY;

      await expect(searchPerplexity('test-model', 'system', 'user')).rejects.toThrow('Perplexity API key is not set');

      process.env.PERPLEXITY_API_KEY = originalKey;
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(searchPerplexity('test-model', 'system', 'user')).rejects.toThrow('Network error');
    });
  });

  describe('searchGoogle', () => {
    it('should search Google Custom Search API successfully', async () => {
      const mockResponse: MockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          items: [
            { title: 'Result 1', link: 'https://example.com/1' },
            { title: 'Result 2', link: 'https://example.com/2' }
          ]
        })
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await searchGoogle('test query', 'image', 'photo', 3);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ title: 'Result 1', link: 'https://example.com/1' });
      
      const expectedUrl = new URL('https://www.googleapis.com/customsearch/v1');
      expectedUrl.searchParams.set('key', 'test-google-key');
      expectedUrl.searchParams.set('cx', 'test-engine-id');
      expectedUrl.searchParams.set('q', 'test query');
      expectedUrl.searchParams.set('searchType', 'image');
      expectedUrl.searchParams.set('imgType', 'photo');
      expectedUrl.searchParams.set('num', '3');

      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
    });

    it('should use default parameters when optional params are not provided', async () => {
      const mockResponse: MockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ items: [] })
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      await searchGoogle('simple query');

      const expectedUrl = new URL('https://www.googleapis.com/customsearch/v1');
      expectedUrl.searchParams.set('key', 'test-google-key');
      expectedUrl.searchParams.set('cx', 'test-engine-id');
      expectedUrl.searchParams.set('q', 'simple query');
      expectedUrl.searchParams.set('num', '5');

      expect(mockFetch).toHaveBeenCalledWith(expectedUrl.toString());
    });

    it('should handle missing API credentials', async () => {
      const originalKey = process.env.GOOGLE_SEARCH_API_KEY;
      const originalCX = process.env.GOOGLE_SEARCH_ENGINE_ID;
      delete process.env.GOOGLE_SEARCH_API_KEY;

      await expect(searchGoogle('test')).rejects.toThrow('Google API key or Custom Search Engine ID is not set');

      process.env.GOOGLE_SEARCH_API_KEY = originalKey;
      process.env.GOOGLE_SEARCH_ENGINE_ID = originalCX;
    });

    it('should return empty array when no items in response', async () => {
      const mockResponse: MockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({})
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await searchGoogle('no results query');

      expect(result).toEqual([]);
    });
  });

  describe('isUrlAccessible', () => {
    it('should return true for accessible URL with correct MIME type', async () => {
      const mockResponse: MockResponse = {
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('image/jpeg')
        }
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await isUrlAccessible('https://example.com/image.jpg', 'image/');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/image.jpg', {
        method: 'HEAD',
        headers: { Accept: 'image/' }
      });
    });

    it('should return false for inaccessible URL', async () => {
      const mockResponse: MockResponse = {
        ok: false
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await isUrlAccessible('https://example.com/notfound.jpg', 'image/');

      expect(result).toBe(false);
    });

    it('should return false for wrong MIME type', async () => {
      const mockResponse: MockResponse = {
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('text/html')
        }
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await isUrlAccessible('https://example.com/page.html', 'image/');

      expect(result).toBe(false);
    });

    it('should return false when request throws error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await isUrlAccessible('https://example.com/image.jpg', 'image/');

      expect(result).toBe(false);
    });

    it('should return false when content-type header is null', async () => {
      const mockResponse: MockResponse = {
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue(null)
        }
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await isUrlAccessible('https://example.com/image.jpg', 'image/');

      expect(result).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit consecutive calls', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ choices: [{ message: { content: 'result' } }] })
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      // First call should succeed immediately
      const promise1 = searchPerplexity('test-model', 'system', 'user1');
      
      // Second call should be rate limited
      const promise2 = searchPerplexity('test-model', 'system', 'user2');

      // Fast forward time to resolve rate limiting
      jest.advanceTimersByTime(2000);

      await Promise.all([promise1, promise2]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
}); 
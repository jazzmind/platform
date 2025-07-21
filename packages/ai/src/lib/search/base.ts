// lib/search/base.js
import { cache } from 'react';

class RateLimiter {
  private cache: Map<string, number>;
  private limits: Map<string, number>;

  constructor() {
    this.cache = new Map();
    this.limits = new Map([
      ['perplexity', 2000], // 2 seconds
      ['google', 1000],     // 1 second
    ]);
  }

  async checkLimit(key: string): Promise<boolean> {
    const limit = this.limits.get(key) || 2000;
    const now = Date.now();
    const lastCall = this.cache.get(key) || 0;
    
    if (now - lastCall < limit) {
      await new Promise(resolve => setTimeout(resolve, limit - (now - lastCall)));
      return this.checkLimit(key);
    }

    this.cache.set(key, now);
    return true;
  }
}

// Create a singleton instance
const rateLimiter = new RateLimiter();

// Wrap the search functions with rate limiting
export const searchPerplexity = cache(async (model: string, system: string, user: string) => {
  const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
  if (!perplexityApiKey) {
    throw new Error("Perplexity API key is not set");
  }

  await rateLimiter.checkLimit('perplexity');

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${perplexityApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Perplexity API error:', error, response);
      throw new Error(`Failed to search perplexity: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content || [];
  } catch (error) {
    console.error('Error in searchPerplexity:', error);
    throw error;
  }
});

export const searchGoogle = cache(async (
  query: string,
  searchType?: string,
  imgType?: string,
  numResults?: number
) => {
  const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const googleCX = process.env.GOOGLE_SEARCH_ENGINE_ID;
  if (!googleApiKey || !googleCX) {
    throw new Error("Google API key or Custom Search Engine ID is not set");
  }

  await rateLimiter.checkLimit('google');

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", googleApiKey);
  url.searchParams.set("cx", googleCX);
  url.searchParams.set("q", query);
  if (searchType) url.searchParams.set("searchType", searchType);
  if (searchType === "image" && imgType) url.searchParams.set("imgType", imgType);
  url.searchParams.set("num", numResults?.toString() || "5");

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Google API error:', error);
      throw new Error(`Failed to search Google: ${response.status}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error in searchGoogle:", error);
    throw error;
  }
});

export const isUrlAccessible = cache(async (url: string, mimeType: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: {
        'Accept': mimeType
      }
    });
    const contentType = response.headers.get('content-type');
    return response.ok && (contentType?.startsWith(mimeType) ?? false);
  } catch {
    return false;
  }
});

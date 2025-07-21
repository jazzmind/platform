import { MODELS } from './models';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { z } from 'zod';
import { createHash } from 'crypto';
import { getVectorDatabase } from '@/src/lib/database';
import { embeddingService } from '@/src/lib/ai/embeddingService';
import { AIService } from './aiService';

export interface ExtractedContact {
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedIn?: string | null;
  bio?: string | null;
  department?: string | null;
}

export interface ExtractedService {
  name: string;
  description: string;
  category?: string | null;
  features?: string[] | null;
  technologies?: string[] | null;
  pricingModel?: string | null;
}

export interface ExtractedOrganization {
  name?: string | null;
  description?: string | null;
  mission?: string | null;
  vision?: string | null;
  values?: string[] | null;
  foundedYear?: number | null;
  headquarters?: string | null;
  size?: string | null;
  industry?: string | null;
  specialties?: string[] | null;
  awards?: string[] | null;
  clients?: string[] | null;
}

export interface PageCategory {
  type: 'homepage' | 'about' | 'team' | 'services' | 'contact' | 'case-studies' | 'whitepapers' | 'blog' | 'news' | 'other';
  confidence: number; // 0.0 to 1.0
}

export interface CrawledPage {
  url: string;
  title: string;
  categories: PageCategory[];
  content: string;
  contentHash: string;
  wasAlreadyCrawled: boolean;
  crawledAt: string;
}

export interface CrawlResult {
  url: string;
  pages: CrawledPage[];
  sessionId: string;
  // Remove immediate extraction results - these will be done in a separate step
  summary: {
    totalPages: number;
    categoryCounts: Record<string, number>;
    newPages: number;
  };
}

export interface CrawlTrackingOptions {
  organizationId: string;
  skipRecentlyCrawled?: boolean;
  maxAgeHours?: number;
  storeInKnowledgeBase?: boolean;
}

export interface DiscoveredPage {
  url: string;
  title?: string;
  type: 'homepage' | 'about' | 'team' | 'services' | 'contact' | 'other';
  priority: number; // 1-10, higher is more important
  estimatedDepth: number;
  parentUrl?: string;
  lastModified?: string;
  size?: number;
  contentType?: string;
}

export interface RobotsTxt {
  isAllowed: (userAgent: string, path: string) => boolean;
  crawlDelay?: number;
  sitemap?: string[];
}

export interface CrawlDiscoveryResult {
  discoveredPages: DiscoveredPage[];
  robotsTxt?: RobotsTxt;
  totalPages: number;
  estimatedCrawlTime: number; // in minutes
  recommendations: {
    suggestedPages: DiscoveredPage[];
    pagesToAvoid: string[];
    crawlStrategy: string;
  };
}

export interface CrawlSession {
  id: string;
  organizationId: string;
  baseUrl: string;
  status: 'discovering' | 'ready' | 'crawling' | 'paused' | 'completed' | 'failed';
  discoveryOptions: {
    maxDepth: number;
    respectRobotsTxt: boolean;
    followSitemaps: boolean;
  };
  statistics: {
    totalDiscovered: number;
    totalCrawled: number;
    batchesCompleted: number;
    lastDiscoveredBatch: number;
    estimatedRemaining: number;
  };
  discoveredPages: DiscoveredPage[];
  crawledPages: string[]; // URLs that have been crawled
  queuedForDiscovery: string[]; // URLs queued for next discovery batch
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

export interface BatchDiscoveryResult {
  sessionId: string;
  batchNumber: number;
  newPagesFound: number;
  totalPagesDiscovered: number;
  hasMore: boolean;
  estimatedRemaining: number;
  discoveredPages: DiscoveredPage[];
  suggestions: {
    recommendedBatchSize: number;
    estimatedTimePerBatch: number;
    shouldContinue: boolean;
  };
}

/**
 * Enhanced CrawlerService extending AIService base class
 * Provides website crawling and content extraction capabilities
 */
export class CrawlerService extends AIService {
  private readonly maxPages = 10;
  private readonly maxDepth = 3;
  private crawledUrls = new Set<string>();
  private sessionStorage = new Map<string, CrawlSession>();

  constructor() {
    super({
      maxRetries: 3,
      timeoutMs: 30000, // 30 seconds for crawling operations
      enableLogging: true,
      enableDebugLogging: true,
      logPrefix: 'Crawler',
    });
  }

  async crawlWebsite(
    baseUrl: string,
    options: {
      maxPages?: number;
    } = {},
    trackingOptions?: CrawlTrackingOptions
  ): Promise<CrawlResult> {
    const {
      maxPages = this.maxPages
    } = options;

    this.crawledUrls.clear();
    
    console.log(`Starting intelligent crawl of ${baseUrl}`);

    // Create crawl session if tracking is enabled
    let sessionId = '';
    if (trackingOptions?.organizationId) {
      sessionId = await this.createCrawlSession(trackingOptions.organizationId, baseUrl, options);
    }

    try {
      // Start with the homepage
      const pages = await this.crawlPages(baseUrl, maxPages, trackingOptions);
      
      // Store content in knowledge base if requested
      if (trackingOptions?.storeInKnowledgeBase && trackingOptions.organizationId) {
        await this.storeInKnowledgeBase(pages, trackingOptions.organizationId);
      }

      // Update crawl session
      if (sessionId && trackingOptions?.organizationId) {
        await this.updateCrawlSession(sessionId, 'completed', {
          pagesFound: pages.length,
          pagesCrawled: pages.filter(p => !p.wasAlreadyCrawled).length,
        });
      }

      return {
        url: baseUrl,
        pages,
        sessionId,
        summary: {
          totalPages: pages.length,
          categoryCounts: this.countCategories(pages),
          newPages: pages.filter(p => !p.wasAlreadyCrawled).length,
        },
      };
    } catch (error) {
      console.error('Error during crawl:', error);
      
      // Update session with error
      if (sessionId && trackingOptions?.organizationId) {
        await this.updateCrawlSession(sessionId, 'failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      throw error;
    }
  }

  private countCategories(pages: CrawledPage[]): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const page of pages) {
      for (const category of page.categories) {
        counts[category.type] = (counts[category.type] || 0) + 1;
      }
    }
    
    return counts;
  }

  private async crawlPages(
    baseUrl: string, 
    maxPages: number, 
    trackingOptions?: CrawlTrackingOptions
  ): Promise<CrawledPage[]> {
    const pages: CrawledPage[] = [];
    const urlsToVisit = [baseUrl];
    
    while (urlsToVisit.length > 0 && pages.length < maxPages) {
      const currentUrl = urlsToVisit.shift()!;
      
      if (this.crawledUrls.has(currentUrl)) continue;
      this.crawledUrls.add(currentUrl);

      try {
        // Check for recent crawl record to avoid duplicate work
        if (trackingOptions?.skipRecentlyCrawled) {
          const recentRecord = await this.getRecentCrawlRecord(
            trackingOptions.organizationId,
            currentUrl,
            trackingOptions.maxAgeHours || 24
          );
          
          if (recentRecord) {
            console.log(`Skipping recently crawled URL: ${currentUrl}`);
            pages.push({
              url: currentUrl,
              title: recentRecord.title || 'Previously Crawled',
              categories: [{ type: recentRecord.pageType as PageCategory['type'], confidence: 1.0 }],
              content: '',
              contentHash: recentRecord.contentHash || '',
              wasAlreadyCrawled: true,
              crawledAt: recentRecord.crawledAt || '',
            });
            continue;
          }
        }
        
        console.log(`Crawling: ${currentUrl}`);
        
        const response = await fetch(currentUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ProposalHub Crawler/1.0)',
          },
        });

        if (!response.ok) {
          console.log(`Failed to fetch ${currentUrl}: ${response.status}`);
          await this.recordCrawlAttempt(trackingOptions?.organizationId, baseUrl, currentUrl, 'failed');
          continue;
        }

        const html = await response.text();
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        // Extract readable content
        const reader = new Readability(document);
        const article = reader.parse();
        
        const content = article?.textContent || '';
        const title = article?.title || document.title || '';
        
        // Classify page with multiple categories and confidence scores
        const categories = await this.classifyPageWithCategories(currentUrl, title, content);
        const contentHash = this.generateContentHash(content);

        // Record crawl attempt
        await this.recordCrawlAttempt(
          trackingOptions?.organizationId, 
          baseUrl, 
          currentUrl, 
          'success',
          title,
          categories[0]?.type || 'other', // Use primary category for legacy compatibility
          contentHash
        );

        pages.push({
          url: currentUrl,
          title,
          categories,
          content,
          contentHash,
          wasAlreadyCrawled: false,
          crawledAt: new Date().toISOString(),
        });

        // Find more URLs to crawl
        if (pages.length < maxPages) {
          const newUrls = this.findRelevantUrls(dom.window.document, baseUrl);
          urlsToVisit.push(...newUrls.slice(0, maxPages - pages.length));
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error crawling ${currentUrl}:`, error);
        await this.recordCrawlAttempt(trackingOptions?.organizationId, baseUrl, currentUrl, 'failed');
      }
    }

    return pages;
  }

  private generateContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private async storeInKnowledgeBase(pages: CrawledPage[], organizationId: string): Promise<void> {
    try {
      const vectorDb = await getVectorDatabase();
      
      for (const page of pages) {
        if (!page.content || page.content.length < 100) {
          continue; // Skip pages with minimal content
        }

        // Process content for RAG using existing service
        const processedChunks = await embeddingService.processContentForRAG(
          page.content,
          {
            title: page.title,
            fileType: 'web_page',
            sourceUrl: page.url,
          }
        );

        // Create vector records with organization entity type
        const vectorRecords = processedChunks
          .filter(chunk => chunk.embedding !== undefined)
          .map(chunk => ({
            entityType: 'organization' as const,
            entityId: organizationId,
            sourceEntityType: 'url' as const,
            sourceEntityId: page.url,
            vector: chunk.embedding!,
            metadata: {
              ...chunk.metadata,
              sourceUrl: page.url,
              pageCategories: JSON.stringify(page.categories),
              contentHash: page.contentHash,
              pageTitle: page.title,
              crawledAt: page.crawledAt,
            },
          }));

        await vectorDb.createVectors(vectorRecords as never);
      }
      
      console.log(`Stored ${pages.length} pages in knowledge base for organization ${organizationId}`);
    } catch (error) {
      console.error('Error storing pages in knowledge base:', error);
      throw error;
    }
  }

  private async createCrawlSession(organizationId: string, baseUrl: string, options: Record<string, unknown>): Promise<string> {
    try {
      // This would use the database abstraction layer
      // For now, return a mock ID
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = { baseUrl, options };
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      console.log(`Created crawl session ${sessionId} for ${organizationId}`);
      return sessionId;
    } catch (error) {
      console.error('Error creating crawl session:', error);
      return '';
    }
  }

  private async updateCrawlSession(sessionId: string, status: string, data: Record<string, unknown>): Promise<void> {
    try {
      console.log(`Updated crawl session ${sessionId} with status: ${status}`, data);
    } catch (error) {
      console.error('Error updating crawl session:', error);
    }
  }

  private async getRecentCrawlRecord(organizationId: string, url: string, maxAgeHours: number): Promise<{ title?: string; pageType: string; contentHash?: string; crawledAt?: string } | null> {
    try {
      // Import database functions
      const { getRecentCrawlRecord } = await import('@/src/lib/database');
      
      const record = await getRecentCrawlRecord(organizationId, url, maxAgeHours);
      
      if (record) {
        // Extract primary category for backward compatibility
        const categories = record.categories as Array<{ type: string; confidence: number }>;
        const primaryCategory = categories && categories.length > 0 ? categories[0].type : 'other';
        
        return {
          title: record.title || undefined,
          pageType: primaryCategory,
          contentHash: record.contentHash || undefined,
          crawledAt: record.lastCrawled?.toISOString() || undefined,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting recent crawl record:', error);
      return null;
    }
  }

  private async recordCrawlAttempt(
    organizationId: string | undefined,
    baseUrl: string,
    pageUrl: string,
    status: string,
    title?: string,
    pageType?: string,
    contentHash?: string
  ): Promise<void> {
    if (!organizationId) return;
    
    try {
      // Import database functions
      const { createCrawlRecord, updateCrawlRecord } = await import('@/src/lib/database');
      
      // Convert single pageType to categories array
      const categories = pageType ? [{ type: pageType, confidence: 1.0 }] : [{ type: 'other', confidence: 1.0 }];
      
      try {
        // Try to create new record
        await createCrawlRecord({
          organizationId,
          baseUrl,
          pageUrl,
          title,
          categories,
          status,
          contentHash,
        });
      } catch (createError) {
        // If creation fails (likely duplicate), try to update
        console.log('Record exists, updating:', createError instanceof Error ? createError.message : 'Unknown error');
        await updateCrawlRecord(organizationId, pageUrl, {
          title,
          categories,
          status,
          contentHash,
        });
      }
    } catch (error) {
      console.error('Error recording crawl attempt:', error);
    }
  }

  private async classifyPageWithCategories(url: string, title: string, _content: string): Promise<PageCategory[]> {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();

    if (urlLower.includes('/about') || titleLower.includes('about')) return [{ type: 'about', confidence: 1.0 }];
    if (urlLower.includes('/team') || urlLower.includes('/people') || titleLower.includes('team')) return [{ type: 'team', confidence: 1.0 }];
    if (urlLower.includes('/service') || urlLower.includes('/product') || titleLower.includes('service')) return [{ type: 'services', confidence: 1.0 }];
    if (urlLower.includes('/contact') || titleLower.includes('contact')) return [{ type: 'contact', confidence: 1.0 }];
    
    // Check if this is likely the homepage
    const domain = new URL(url).hostname;
    if (url === `https://${domain}` || url === `https://${domain}/` || url === `http://${domain}` || url === `http://${domain}/`) {
      return [{ type: 'homepage', confidence: 1.0 }];
    }

    // use LLM to classify the page with multiple categories
    // define response schema
    const responseSchema = z.object({
      categories: z.array(z.object({
        type: z.enum(['homepage', 'about', 'team', 'services', 'contact', 'case-studies', 'whitepapers', 'blog', 'news', 'other']),
        confidence: z.number().min(0).max(1),
      })).min(1),
    });

    try {
      const result = await this.callAI(
        MODELS.fast,
        [
          {
            role: 'system',
            content: `You are an expert at classifying web pages based on their content and URL structure. 
            Classify pages into one or more categories with confidence scores (0.0-1.0).
            
            Categories:
            - homepage: Main landing page of a website
            - about: About us, company history, mission, vision
            - team: Team members, staff, leadership, people
            - services: Services, products, offerings, what they do
            - contact: Contact information, locations, how to reach them
            - case-studies: Case studies, project examples, success stories
            - whitepapers: Research papers, technical documentation, downloads
            - blog: Blog posts, news articles, updates
            - news: Press releases, company news, announcements
            - other: Everything else
            
            Return multiple categories if applicable (e.g., a page could be both 'about' and 'services').
            Higher confidence for more certain classifications.`
          },
          {
            role: 'user',
            content: `Classify this page:
URL: ${url}
Title: ${title}
Content: ${_content.slice(0, 1000)}...`
          }
        ],
        responseSchema,
        `classifyPageWithCategories(${url})`,
        'pageCategories'
      );
      
      return result.categories || [{ type: 'other', confidence: 1.0 }];
    } catch (error) {
      this.log(`Page classification failed: ${error}`, 'warn');
      return [{ type: 'other', confidence: 1.0 }];
    }
  }

  private findRelevantUrls(document: Document, baseUrl: string): string[] {
    const links = Array.from(document.querySelectorAll('a[href]'));
    const relevantUrls: string[] = [];
    const baseDomain = new URL(baseUrl).hostname;

    const priorityPatterns = [
      /\/(about|team|people|staff|leadership|management)/i,
      /\/(services|products|solutions|offerings)/i,
      /\/(contact|reach|touch)/i,
    ];

    for (const link of links) {
      try {
        const href = link.getAttribute('href');
        if (!href) continue;

        const url = new URL(href, baseUrl);
        
        // Only crawl same domain
        if (url.hostname !== baseDomain) continue;
        
        const fullUrl = url.toString();
        
        // Skip already crawled or irrelevant URLs
        if (this.crawledUrls.has(fullUrl)) continue;
        if (this.isIrrelevantUrl(fullUrl)) continue;

        // Prioritize important pages
        const isPriority = priorityPatterns.some(pattern => pattern.test(fullUrl));
        if (isPriority) {
          relevantUrls.unshift(fullUrl);
        } else {
          relevantUrls.push(fullUrl);
        }

      } catch (error) {
        // Invalid URL, skip
        console.error(`Invalid URL`, error);
      }
    }

    return [...new Set(relevantUrls)].slice(0, 20); // Dedupe and limit
  }

  private isIrrelevantUrl(url: string): boolean {
    const irrelevantPatterns = [
      /\.(pdf|jpg|jpeg|png|gif|svg|mp4|mp3|zip|exe)$/i,
      /\/(login|signin|register|logout|admin|wp-admin)/i,
      /\/(privacy|terms|legal|cookie)/i,
      /\/(blog|news|press|media)\/\d/i, // Specific blog posts
      /#/,
      /javascript:/,
      /mailto:/,
      /tel:/,
    ];

    return irrelevantPatterns.some(pattern => pattern.test(url));
  }

  private async extractContacts(pages: CrawledPage[]): Promise<ExtractedContact[]> {
    const relevantPages = pages.filter(p => 
      p.categories.some(c => c.type === 'about' || c.type === 'team' || c.type === 'contact' || c.type === 'homepage')
    );

    if (relevantPages.length === 0) return [];

    const combinedContent = relevantPages
      .map(p => `=== ${p.title} (${p.url}) ===\n${p.content}`)
      .join('\n\n');

    try {
      const responseSchema = z.object({
        contacts: z.array(z.object({
          name: z.string(),
          title: z.string().nullable(),
          email: z.string().nullable(),
          phone: z.string().nullable(),
          linkedIn: z.string().nullable(),
          bio: z.string().nullable(),
          department: z.string().nullable(),
        }))
      });

      const response = await this.callAI(
        MODELS.fast,
        [
          {
            role: 'system',
            content: `You are an expert at extracting contact information from website content. Extract all people mentioned with their details.
Rules:
- Only include real people, not company names
- Email and phone are optional - only include if clearly stated
- LinkedIn should be full URL if found
- Bio should be 1-2 sentences max
- Return empty array [] if no contacts found
`
          },
          {
            role: 'user',
            content: combinedContent
          }
        ],
        responseSchema,
        'extractContacts',
        'contacts'
      );

      return response?.contacts || [];
    } catch (error) {
      console.error('Error extracting contacts:', error);
      return [];
    }
  }

  private async extractServices(pages: CrawledPage[]): Promise<ExtractedService[]> {
    const relevantPages = pages.filter(p => 
      p.categories.some(c => c.type === 'services' || c.type === 'homepage' || c.type === 'about')
    );

    if (relevantPages.length === 0) return [];

    const combinedContent = relevantPages
      .map(p => `=== ${p.title} (${p.url}) ===\n${p.content}`)
      .join('\n\n');

    try {
      const responseSchema = z.object({
        services: z.array(z.object({
          name: z.string(),
          description: z.string(),
          category: z.string().nullable(),
          features: z.array(z.string()).nullable(),
          technologies: z.array(z.string()).nullable(),
          pricingModel: z.string().nullable(),
        }))
      });

      const response = await this.callAI(
        MODELS.fast,
        [
          {
            role: 'system',
            content: `You are an expert at extracting service/product information from website content. Extract all services, products, or offerings mentioned.
Rules:
- Only include actual services/products offered
- Description should be clear and concise (2-3 sentences)
- Features should be key capabilities or benefits
- Technologies should be technical tools/platforms used
- Return empty array [] if no services found
`
          },
          {
            role: 'user',
            content: combinedContent
          }
        ],
        responseSchema,
        'extractServices',
        'services'
      );

      return response?.services || [];
    } catch (error) {
      console.error('Error extracting services:', error);
      return [];
    }
  }

  private async extractOrganization(pages: CrawledPage[]): Promise<ExtractedOrganization> {
    const relevantPages = pages.filter(p => 
      p.categories.some(c => c.type === 'about' || c.type === 'homepage')
    );

    if (relevantPages.length === 0) return {};

    const combinedContent = relevantPages
      .map(p => `=== ${p.title} (${p.url}) ===\n${p.content}`)
      .join('\n\n');

    try {
      // define response schema
      const responseSchema = z.object({
        name: z.string().nullable(),
        description: z.string().nullable(),
        mission: z.string().nullable(),
        vision: z.string().nullable(),
        values: z.array(z.string()).nullable(),
        foundedYear: z.number().nullable(),
        headquarters: z.string().nullable(),
        size: z.string().nullable(),
        industry: z.string().nullable(),
        specialties: z.array(z.string()).nullable(),
        awards: z.array(z.string()).nullable(),
        clients: z.array(z.string()).nullable(),
      });

      const response = await this.callAI(
        MODELS.fast,
        [
          {
            role: 'system',
            content: `You are an expert at extracting organization information from website content. Extract company details.

Rules:
- Only include information explicitly mentioned
- Use null for missing fields, not empty strings
- foundedYear should be a number or null
- size should be descriptive (e.g., "10-50 employees", "Fortune 500")
- Include notable clients/customers if mentioned
`
          },
          {
            role: 'user',
            content: combinedContent
          }
        ],
        responseSchema,
        'extractOrganization',
        'organization'
      );

      return response || {};
    } catch (error) {
      console.error('Error extracting organization info:', error);
      return {};
    }
  }

  // Enhanced crawler methods

  /**
   * Discover all pages on a website without crawling content
   */
  async discoverPages(baseUrl: string, options: {
    maxDepth?: number;
    respectRobotsTxt?: boolean;
    followSitemaps?: boolean;
  } = {}): Promise<CrawlDiscoveryResult> {
    const {
      maxDepth = 3,
      respectRobotsTxt = true,
      followSitemaps = true,
    } = options;

    console.log(`Starting page discovery for ${baseUrl}`);

    const discoveredPages: DiscoveredPage[] = [];
    const urlsToCheck = [{ url: baseUrl, depth: 0, parentUrl: undefined as string | undefined }];
    const checkedUrls = new Set<string>();
    
    // Check robots.txt
    let robotsTxt: RobotsTxt | undefined;
    if (respectRobotsTxt) {
      robotsTxt = await this.parseRobotsTxt(baseUrl);
    }

    // Check sitemap if available
    if (followSitemaps && robotsTxt?.sitemap) {
      for (const sitemapUrl of robotsTxt.sitemap) {
        const sitemapPages = await this.parseSitemap(sitemapUrl);
        for (const page of sitemapPages) {
          if (!checkedUrls.has(page.url)) {
            urlsToCheck.push({ url: page.url, depth: 1, parentUrl: baseUrl });
          }
        }
      }
    }

    while (urlsToCheck.length > 0) {
      const { url, depth, parentUrl } = urlsToCheck.shift()!;
      
      if (checkedUrls.has(url) || depth > maxDepth) continue;
      checkedUrls.add(url);

      // Check robots.txt
      if (robotsTxt && !robotsTxt.isAllowed('*', new URL(url).pathname)) {
        console.log(`Robots.txt disallows: ${url}`);
        continue;
      }

      try {
        const pageInfo = await this.discoverPageInfo(url, depth, parentUrl);
        if (pageInfo) {
          discoveredPages.push(pageInfo);
          
          // Find more URLs if not at max depth
          if (depth < maxDepth) {
            const newUrls = await this.findLinksOnPage(url, baseUrl);
            for (const newUrl of newUrls) {
              if (!checkedUrls.has(newUrl) && !this.isIrrelevantUrl(newUrl)) {
                urlsToCheck.push({ url: newUrl, depth: depth + 1, parentUrl: url });
              }
            }
          }
        }

        // Rate limiting
        if (robotsTxt?.crawlDelay) {
          await new Promise(resolve => setTimeout(resolve, robotsTxt.crawlDelay! * 1000));
        } else {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error(`Error discovering page ${url}:`, error);
      }
    }

    // Generate recommendations
    const recommendations = this.generateCrawlRecommendations(discoveredPages);
    
    return {
      discoveredPages,
      robotsTxt,
      totalPages: discoveredPages.length,
      estimatedCrawlTime: this.estimateCrawlTime(discoveredPages, robotsTxt),
      recommendations,
    };
  }

  /**
   * Parse robots.txt file
   */
  private async parseRobotsTxt(baseUrl: string): Promise<RobotsTxt | undefined> {
    try {
      const robotsUrl = new URL('/robots.txt', baseUrl).toString();
      console.log(`Checking robots.txt at: ${robotsUrl}`);
      const response = await fetch(robotsUrl);
      
      if (!response.ok) {
        console.log(`No robots.txt found at ${robotsUrl}`);
        return undefined;
      }

      const robotsText = await response.text();
      const lines = robotsText.split('\n').map(line => line.trim());
      
      let crawlDelay: number | undefined;
      const sitemap: string[] = [];
      const disallowedPaths: string[] = [];
      
      for (const line of lines) {
        const lowerLine = line.toLowerCase();
        if (lowerLine.startsWith('crawl-delay:')) {
          crawlDelay = parseInt(line.split(':')[1].trim()) || undefined;
        } else if (lowerLine.startsWith('sitemap:')) {
          const sitemapUrl = line.substring(line.indexOf(':') + 1).trim();
          // Validate sitemap URL
          try {
            new URL(sitemapUrl);
            sitemap.push(sitemapUrl);
            console.log(`Found sitemap: ${sitemapUrl}`);
          } catch {
            console.log(`Invalid sitemap URL found in robots.txt: ${sitemapUrl}`);
          }
        } else if (lowerLine.startsWith('disallow:')) {
          const path = line.substring(line.indexOf(':') + 1).trim();
          if (path) disallowedPaths.push(path);
        }
      }

      console.log(`Parsed robots.txt: ${disallowedPaths.length} disallowed paths, ${sitemap.length} sitemaps, crawl delay: ${crawlDelay || 'none'}`);

      return {
        isAllowed: (userAgent: string, path: string) => {
          return !disallowedPaths.some(disallowed => 
            disallowed === '*' || path.startsWith(disallowed)
          );
        },
        crawlDelay,
        sitemap: sitemap.length > 0 ? sitemap : undefined,
      };
    } catch (error) {
      console.error('Error parsing robots.txt:', error);
      return undefined;
    }
  }

  /**
   * Parse XML sitemap
   */
  private async parseSitemap(sitemapUrl: string): Promise<DiscoveredPage[]> {
    try {
      const response = await fetch(sitemapUrl);
      if (!response.ok) return [];

      const sitemapXml = await response.text();
      const dom = new JSDOM(sitemapXml, { contentType: 'text/xml' });
      const urls = Array.from(dom.window.document.querySelectorAll('url loc'));
      
      return urls.map((loc) => ({
        url: loc.textContent || '',
        type: 'other' as const,
        priority: 5,
        estimatedDepth: 1,
      })).filter(page => page.url);
    } catch (error) {
      console.error('Error parsing sitemap:', error);
      return [];
    }
  }

  /**
   * Discover basic info about a page without full content extraction
   */
  private async discoverPageInfo(url: string, depth: number, parentUrl?: string): Promise<DiscoveredPage | null> {
    try {
      const response = await fetch(url, {
        method: 'HEAD', // Only get headers first
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ProposalHub Crawler; +https://proposalhub.com/bot)',
        },
      });

      if (!response.ok) return null;

      const contentType = response.headers.get('content-type') || '';
      const lastModified = response.headers.get('last-modified') || undefined;
      const contentLength = response.headers.get('content-length');
      
      // Skip non-HTML content
      if (!contentType.includes('text/html')) return null;

      // Get title with a quick GET request
      const fullResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ProposalHub Crawler; +https://proposalhub.com/bot)',
        },
      });

      const html = await fullResponse.text();
      const dom = new JSDOM(html, { url });
      const title = dom.window.document.title || new URL(url).pathname;
      
      const pageType = await this.classifyPageQuick(url, title);
      const priority = this.calculatePagePriority(url, title, pageType, depth);

      return {
        url,
        title,
        type: pageType,
        priority,
        estimatedDepth: depth,
        parentUrl,
        lastModified,
        size: contentLength ? parseInt(contentLength) : undefined,
        contentType,
      };
    } catch (error) {
      console.error(`Error discovering page info for ${url}:`, error);
      return null;
    }
  }

  /**
   * Quick page classification without AI
   */
  private async classifyPageQuick(url: string, title: string): Promise<DiscoveredPage['type']> {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();

    if (urlLower.includes('/about') || titleLower.includes('about')) return 'about';
    if (urlLower.includes('/team') || urlLower.includes('/people') || titleLower.includes('team')) return 'team';
    if (urlLower.includes('/service') || urlLower.includes('/product') || titleLower.includes('service')) return 'services';
    if (urlLower.includes('/contact') || titleLower.includes('contact')) return 'contact';
    
    // Check if this is likely the homepage
    const domain = new URL(url).hostname;
    if (url === `https://${domain}` || url === `https://${domain}/` || url === `http://${domain}` || url === `http://${domain}/`) {
      return 'homepage';
    }

    return 'other';
  }

  /**
   * Calculate page priority for crawling
   */
  private calculatePagePriority(url: string, title: string, type: DiscoveredPage['type'], depth: number): number {
    let priority = 5; // base priority

    // Type-based priority
    switch (type) {
      case 'homepage': priority = 10; break;
      case 'about': priority = 9; break;
      case 'services': priority = 8; break;
      case 'team': priority = 7; break;
      case 'contact': priority = 6; break;
      default: priority = 5;
    }

    // Depth penalty
    priority -= depth;

    // URL quality indicators
    const urlLower = url.toLowerCase();
    if (urlLower.includes('solutions') || urlLower.includes('capabilities')) priority += 2;
    if (urlLower.includes('case-stud') || urlLower.includes('portfolio')) priority += 1;
    
    // Penalize certain patterns
    if (urlLower.includes('blog/20') || urlLower.includes('/tag/') || urlLower.includes('/category/')) priority -= 3;

    return Math.max(1, Math.min(10, priority));
  }

  /**
   * Find links on a page
   */
  private async findLinksOnPage(url: string, baseUrl: string): Promise<string[]> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ProposalHub Crawler; +https://proposalhub.com/bot)',
        },
      });

      if (!response.ok) return [];

      const html = await response.text();
      const dom = new JSDOM(html, { url });
      
      return this.findRelevantUrls(dom.window.document, baseUrl);
    } catch (error) {
      console.error(`Error finding links on ${url}:`, error);
      return [];
    }
  }

  /**
   * Generate crawl recommendations
   */
  private generateCrawlRecommendations(discoveredPages: DiscoveredPage[]): CrawlDiscoveryResult['recommendations'] {
    // Sort by priority
    const sortedPages = [...discoveredPages].sort((a, b) => b.priority - a.priority);
    
    const suggestedPages = sortedPages.slice(0, 20); // Top 20 pages
    const pagesToAvoid = discoveredPages
      .filter(p => p.priority <= 2)
      .map(p => p.url);

    let crawlStrategy = 'balanced';
    if (discoveredPages.length > 100) {
      crawlStrategy = 'selective';
    } else if (discoveredPages.length < 20) {
      crawlStrategy = 'comprehensive';
    }

    return {
      suggestedPages,
      pagesToAvoid,
      crawlStrategy,
    };
  }

  /**
   * Estimate crawl time
   */
  private estimateCrawlTime(discoveredPages: DiscoveredPage[], robotsTxt?: RobotsTxt): number {
    const avgProcessingTime = 3; // seconds per page
    const crawlDelay = robotsTxt?.crawlDelay || 1;
    const totalTime = discoveredPages.length * (avgProcessingTime + crawlDelay);
    return Math.round(totalTime / 60); // convert to minutes
  }

  /**
   * Crawl selected pages with full content extraction
   */
  async crawlSelectedPages(
    selectedPages: DiscoveredPage[],
    options: Record<string, unknown> = {},
    trackingOptions?: CrawlTrackingOptions
  ): Promise<CrawlResult> {
    console.log(`Crawling ${selectedPages.length} selected pages`);
    
    // Create crawl session if tracking is enabled
    let sessionId = '';
    if (trackingOptions?.organizationId) {
      sessionId = await this.createCrawlSession(trackingOptions.organizationId, selectedPages[0]?.url || '', options);
    }

    try {
      const pages: CrawledPage[] = [];
      
      for (const discoveredPage of selectedPages) {
        try {
          // Check if already crawled recently
          if (trackingOptions?.skipRecentlyCrawled) {
            const recentRecord = await this.getRecentCrawlRecord(
              trackingOptions.organizationId,
              discoveredPage.url,
              trackingOptions.maxAgeHours || 24
            );
            
            if (recentRecord) {
              console.log(`Skipping recently crawled URL: ${discoveredPage.url}`);
              pages.push({
                url: discoveredPage.url,
                title: recentRecord.title || discoveredPage.title || 'Previously Crawled',
                categories: [{ type: recentRecord.pageType as PageCategory['type'], confidence: 1.0 }],
                content: '',
                contentHash: recentRecord.contentHash || '',
                wasAlreadyCrawled: true,
                crawledAt: recentRecord.crawledAt || '',
              });
              continue;
            }
          }

          console.log(`Crawling: ${discoveredPage.url}`);
          
          const response = await fetch(discoveredPage.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; ProposalHub Crawler/1.0)',
            },
          });

          if (!response.ok) {
            console.log(`Failed to fetch ${discoveredPage.url}: ${response.status}`);
            await this.recordCrawlAttempt(trackingOptions?.organizationId, selectedPages[0]?.url || '', discoveredPage.url, 'failed');
            continue;
          }

          const html = await response.text();
          const dom = new JSDOM(html);
          const reader = new Readability(dom.window.document);
          const article = reader.parse();
          
          const content = article?.textContent || '';
          const contentHash = this.generateContentHash(content);

          pages.push({
            url: discoveredPage.url,
            title: article?.title || discoveredPage.title || 'Untitled',
            categories: await this.classifyPageWithCategories(discoveredPage.url, article?.title || '', content),
            content,
            contentHash,
            wasAlreadyCrawled: false,
            crawledAt: new Date().toISOString(),
          });

          // Record successful crawl
          await this.recordCrawlAttempt(
            trackingOptions?.organizationId,
            selectedPages[0]?.url || '',
            discoveredPage.url,
            'success',
            article?.title || discoveredPage.title || 'Untitled',
            discoveredPage.type,
            contentHash
          );
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`Error crawling ${discoveredPage.url}:`, error);
          await this.recordCrawlAttempt(trackingOptions?.organizationId, selectedPages[0]?.url || '', discoveredPage.url, 'failed');
        }
      }

      // Store content in knowledge base if requested
      if (trackingOptions?.storeInKnowledgeBase && trackingOptions.organizationId) {
        await this.storeInKnowledgeBase(pages, trackingOptions.organizationId);
      }

      // Update crawl session
      if (sessionId && trackingOptions?.organizationId) {
        await this.updateCrawlSession(sessionId, 'completed', {
          pagesFound: selectedPages.length,
          pagesCrawled: pages.filter(p => !p.wasAlreadyCrawled).length,
        });
      }

      return {
        url: selectedPages[0]?.url || '',
        pages,
        sessionId,
        summary: {
          totalPages: pages.length,
          categoryCounts: this.countCategories(pages),
          newPages: pages.filter(p => !p.wasAlreadyCrawled).length,
        },
      };
    } catch (error) {
      // Update crawl session with error
      if (sessionId && trackingOptions?.organizationId) {
        await this.updateCrawlSession(sessionId, 'failed', {
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      throw error;
    }
  }

  /**
   * Start or continue progressive discovery for large sites
   */
  async startProgressiveDiscovery(
    baseUrl: string,
    options: {
      maxDepth?: number;
      respectRobotsTxt?: boolean;
      followSitemaps?: boolean;
      batchSize?: number;
      sessionId?: string; // For continuing existing session
    } = {},
    trackingOptions?: CrawlTrackingOptions
  ): Promise<BatchDiscoveryResult> {
    const {
      maxDepth = 3,
      respectRobotsTxt = true,
      followSitemaps = true,
      batchSize = 100,
      sessionId
    } = options;

    console.log(`Starting progressive discovery for ${baseUrl} (batch size: ${batchSize})`);

    // Load or create session
    let session: CrawlSession;
    if (sessionId) {
      session = await this.loadCrawlSession(sessionId);
      console.log(`Continuing session ${sessionId} with ${session.discoveredPages.length} known pages`);
    } else {
      session = await this.createProgressiveCrawlSession(baseUrl, options, trackingOptions?.organizationId || '');
      console.log(`Created new session ${session.id}`);
    }

    const startTime = Date.now();
    let newPagesFound = 0;
    let urlsToCheck: Array<{ url: string; depth: number; parentUrl?: string }> = [];

    // Determine starting URLs for this batch
    if (session.queuedForDiscovery.length > 0) {
      // Continue from queued URLs - assign proper depths
      const queuedUrls = session.queuedForDiscovery.splice(0, batchSize);
      urlsToCheck = queuedUrls.map(url => {
        // Find the parent page to determine depth
        const parentPage = session.discoveredPages.find(p => p.url === url);
        const parentDepth = parentPage?.estimatedDepth || 0;
        return { url, depth: parentDepth + 1, parentUrl: parentPage?.url };
      });
      console.log(`Processing ${urlsToCheck.length} queued URLs from previous batches`);
    } else if (session.discoveredPages.length === 0) {
      // First batch - start with base URL and sitemap
      urlsToCheck = [{ url: baseUrl, depth: 0, parentUrl: undefined }];
      
      // Check robots.txt and sitemap for initial URLs
      if (respectRobotsTxt) {
        const robotsTxt = await this.parseRobotsTxt(baseUrl);
        if (robotsTxt?.sitemap && followSitemaps) {
          for (const sitemapUrl of robotsTxt.sitemap) {
            const sitemapPages = await this.parseSitemap(sitemapUrl);
            // Add sitemap pages with depth 1
            const sitemapUrlObjs = sitemapPages.map(p => ({ 
              url: p.url, 
              depth: 1, 
              parentUrl: baseUrl 
            }));
            urlsToCheck.push(...sitemapUrlObjs);
          }
        }
      }
    } else {
      // Find URLs from existing discovered pages that haven't been explored yet
      const unexploredPages = session.discoveredPages
        .filter(p => p.estimatedDepth < maxDepth)
        .slice(session.statistics.lastDiscoveredBatch * batchSize, (session.statistics.lastDiscoveredBatch + 1) * batchSize);
      
      if (unexploredPages.length === 0) {
        // No more pages to discover
        session.status = 'ready';
        await this.saveCrawlSession(session);
        
        return {
          sessionId: session.id,
          batchNumber: session.statistics.batchesCompleted,
          newPagesFound: 0,
          totalPagesDiscovered: session.discoveredPages.length,
          hasMore: false,
          estimatedRemaining: 0,
          discoveredPages: session.discoveredPages,
          suggestions: {
            recommendedBatchSize: batchSize,
            estimatedTimePerBatch: 0,
            shouldContinue: false,
          },
        };
      }
      
      urlsToCheck = unexploredPages.map(p => ({ 
        url: p.url, 
        depth: p.estimatedDepth, 
        parentUrl: p.parentUrl 
      }));
    }

    const checkedUrls = new Set(session.discoveredPages.map(p => p.url));
    const newDiscoveredPages: DiscoveredPage[] = [];
    
    // Check robots.txt once if not already done
    const robotsTxt = respectRobotsTxt ? await this.parseRobotsTxt(baseUrl) : undefined;

    // Process URLs in this batch
    for (const { url: currentUrl, depth, parentUrl } of urlsToCheck) {
      if (checkedUrls.has(currentUrl)) continue;
      checkedUrls.add(currentUrl);

      try {
        // Check robots.txt
        if (robotsTxt && !robotsTxt.isAllowed('*', new URL(currentUrl).pathname)) {
          console.log(`Robots.txt disallows: ${currentUrl}`);
          continue;
        }

        const pageInfo = await this.discoverPageInfo(currentUrl, depth, parentUrl);
        if (pageInfo) {
          newDiscoveredPages.push(pageInfo);
          newPagesFound++;

          // Find links on this page for future discovery
          if (pageInfo.estimatedDepth < maxDepth) {
            const newLinks = await this.findLinksOnPage(currentUrl, baseUrl);
            const unprocessedLinks = newLinks.filter(url => 
              !checkedUrls.has(url) && 
              !session.queuedForDiscovery.includes(url) &&
              !this.isIrrelevantUrl(url)
            );
            
            session.queuedForDiscovery.push(...unprocessedLinks);
            console.log(`Found ${newLinks.length} links on ${currentUrl}, ${unprocessedLinks.length} new links queued`);
          }
        }

        // Rate limiting
        if (robotsTxt?.crawlDelay) {
          await new Promise(resolve => setTimeout(resolve, robotsTxt.crawlDelay! * 1000));
        } else {
          await new Promise(resolve => setTimeout(resolve, 200)); // Shorter delay for discovery
        }

        // Check if we should pause this batch to prevent overwhelming
        if (newPagesFound >= batchSize * 2) {
          console.log(`Discovered ${newPagesFound} pages, pausing batch to prevent overwhelming`);
          break;
        }

      } catch (error) {
        console.error(`Error discovering page ${currentUrl}:`, error);
      }
    }

    // Update session
    session.discoveredPages.push(...newDiscoveredPages);
    session.statistics.totalDiscovered = session.discoveredPages.length;
    session.statistics.batchesCompleted += 1;
    session.statistics.lastDiscoveredBatch = session.statistics.batchesCompleted;
    session.statistics.estimatedRemaining = session.queuedForDiscovery.length;
    session.lastActivityAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();

    // Determine if more discovery is recommended
    const hasMore = session.queuedForDiscovery.length > 0;
    const elapsedTime = Date.now() - startTime;
    const estimatedTimePerBatch = Math.round(elapsedTime / 1000);

    if (!hasMore) {
      session.status = 'ready';
    }

    await this.saveCrawlSession(session);

    console.log(`Batch ${session.statistics.batchesCompleted} complete: ${newPagesFound} new pages, ${session.queuedForDiscovery.length} queued for next batch`);

    return {
      sessionId: session.id,
      batchNumber: session.statistics.batchesCompleted,
      newPagesFound,
      totalPagesDiscovered: session.discoveredPages.length,
      hasMore,
      estimatedRemaining: session.queuedForDiscovery.length,
      discoveredPages: session.discoveredPages,
      suggestions: {
        recommendedBatchSize: this.calculateOptimalBatchSize(elapsedTime, newPagesFound, batchSize),
        estimatedTimePerBatch,
        shouldContinue: hasMore && newPagesFound > 0,
      },
    };
  }

  /**
   * Get progressive crawl session by ID
   */
  async getProgressiveSession(sessionId: string): Promise<CrawlSession | null> {
    return await this.loadCrawlSession(sessionId);
  }

  /**
   * Continue crawling with selected pages from a progressive session
   */
  async continueProgressiveCrawl(
    sessionId: string,
    selectedPageUrls: string[],
    options: Record<string, unknown> = {},
    trackingOptions?: CrawlTrackingOptions
  ): Promise<CrawlResult> {
    const session = await this.loadCrawlSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const selectedPages = session.discoveredPages.filter(p => selectedPageUrls.includes(p.url));
    
    console.log(`Continuing progressive crawl for session ${sessionId} with ${selectedPages.length} selected pages`);

    // Update session status
    session.status = 'crawling';
    await this.saveCrawlSession(session);

    try {
      const result = await this.crawlSelectedPages(selectedPages, options, trackingOptions);
      
      // Update session with crawled URLs
      session.crawledPages.push(...selectedPageUrls);
      session.statistics.totalCrawled = session.crawledPages.length;
      session.status = 'completed';
      session.lastActivityAt = new Date().toISOString();
      session.updatedAt = new Date().toISOString();
      
      await this.saveCrawlSession(session);
      
      return result;
    } catch (error) {
      session.status = 'failed';
      await this.saveCrawlSession(session);
      throw error;
    }
  }

  private async createProgressiveCrawlSession(
    baseUrl: string,
    options: Record<string, unknown>,
    organizationId: string
  ): Promise<CrawlSession> {
    const session: CrawlSession = {
      id: `prog_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      organizationId,
      baseUrl,
      status: 'discovering',
      discoveryOptions: {
        maxDepth: (options.maxDepth as number) || 3,
        respectRobotsTxt: (options.respectRobotsTxt as boolean) !== false,
        followSitemaps: (options.followSitemaps as boolean) !== false,
      },
      statistics: {
        totalDiscovered: 0,
        totalCrawled: 0,
        batchesCompleted: 0,
        lastDiscoveredBatch: 0,
        estimatedRemaining: 0,
      },
      discoveredPages: [],
      crawledPages: [],
      queuedForDiscovery: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    };

    await this.saveCrawlSession(session);
    return session;
  }

  private async loadCrawlSession(sessionId: string): Promise<CrawlSession> {
    // In a real implementation, this would load from database
    // For now, we'll store in memory or local storage (mock implementation)
    const stored = this.sessionStorage.get(sessionId);
    if (!stored) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return stored;
  }

  private async saveCrawlSession(session: CrawlSession): Promise<void> {
    // In a real implementation, this would save to database
    // For now, we'll store in memory (mock implementation)
    this.sessionStorage.set(session.id, session);
    console.log(`Saved session ${session.id} with ${session.discoveredPages.length} pages`);
  }

  private calculateOptimalBatchSize(elapsedTimeMs: number, pagesProcessed: number, currentBatchSize: number): number {
    const targetTimePerBatch = 30 * 1000; // 30 seconds target
    
    if (pagesProcessed === 0) return currentBatchSize; // Return current if no data
    
    const timePerPage = elapsedTimeMs / pagesProcessed;
    const optimalBatchSize = Math.floor(targetTimePerBatch / timePerPage);
    
    // Keep batch size reasonable (between 50-500)
    return Math.max(50, Math.min(500, optimalBatchSize));
  }
}

// Create singleton instance
const crawlerService = new CrawlerService();

// Export the service instance for new standardized usage
export { crawlerService };
export default crawlerService;
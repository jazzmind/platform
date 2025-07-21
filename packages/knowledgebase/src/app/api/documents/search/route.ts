import { NextRequest, NextResponse } from 'next/server';
import { SearchService } from '../../../../lib/services/SearchService';
import { EmbeddingService } from '../../../../lib/services/EmbeddingService';
import { prisma } from '../../../../lib/db';
import type { EntityType } from '../../../../lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      query, 
      entityType = 'knowledgebase', 
      entityId = 'default',
      organizationId = 'default-org',
      limit = 10,
      threshold = 0.7,
      includeMetadata = true,
      filters 
    } = body;

    console.log(`🔍 Search API: Received search request for "${query}"`);
    console.log(`🔍 Search API: Parameters:`, { entityType, entityId, limit, threshold, includeMetadata });

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    console.log(`🔧 Search API: Creating SearchService instance`);
    const embeddingService = new EmbeddingService(prisma);
    const searchService = new SearchService(prisma, embeddingService);
    
    console.log(`🔧 Search API: Calling searchService.search()`);
    const results = await searchService.search(
      query,
      entityType as EntityType,
      entityId,
      {
        limit,
        threshold,
        includeMetadata,
        filters,
        organizationId,
      }
    );

    console.log(`✅ Search API: Search completed, found ${results.length} results`);

    // Return consistent format aligned with polysec
    return NextResponse.json({
      results,
      totalResults: results.length,
      searchTime: Date.now(),
      query,
      success: true,
    });

  } catch (error) {
    console.error('Search error:', error);
    
    return NextResponse.json(
      { 
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      },
      { status: 500 }
    );
  }
} 
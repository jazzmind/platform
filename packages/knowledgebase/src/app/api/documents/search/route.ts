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
    console.log(`✅ Search API: Results:`, results);

    return NextResponse.json({
      results,
      totalResults: results.length,
      searchTime: Date.now(), // Simple timing
      query,
    });

  } catch (error) {
    console.error('Search error:', error);
    
    return NextResponse.json(
      { 
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const entityType = searchParams.get('entityType') || 'knowledgebase';
    const entityId = searchParams.get('entityId') || 'default';
    const organizationId = searchParams.get('organizationId') || 'default-org';
    const limit = parseInt(searchParams.get('limit') || '10');
    const threshold = parseFloat(searchParams.get('threshold') || '0.5');

    console.log(`🔍 Search API (GET): Received search request for "${query}"`);
    console.log(`🔍 Search API (GET): Parameters:`, { entityType, entityId, organizationId, limit, threshold });

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter q is required' },
        { status: 400 }
      );
    }

    console.log(`🔧 Search API (GET): Creating SearchService instance`);
    const embeddingService = new EmbeddingService(prisma);
    const searchService = new SearchService(prisma, embeddingService);
    
    console.log(`🔧 Search API (GET): Calling searchService.search()`);
    const results = await searchService.search(
      query,
      entityType as EntityType,
      entityId,
      { 
        limit,
        threshold,
        organizationId
      }
    );

    console.log(`✅ Search API (GET): Search completed, found ${results.length} results`);
    console.log(`✅ Search API (GET): Results:`, results);

    return NextResponse.json({
      results,
      totalResults: results.length,
      searchTime: Date.now(),
      query,
    });

  } catch (error) {
    console.error('Search error:', error);
    
    return NextResponse.json(
      { 
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
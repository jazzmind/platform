import { NextRequest, NextResponse } from 'next/server';
import { SearchService } from '../../../../lib/services/SearchService';
import type { EntityType } from '../../../../lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      query, 
      entityType = 'knowledgebase', 
      entityId = 'default',
      limit = 10,
      threshold = 0.7,
      includeMetadata = true,
      filters 
    } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const searchService = new SearchService();
    
    const results = await searchService.search(
      query,
      entityType as EntityType,
      entityId,
      {
        limit,
        threshold,
        includeMetadata,
        filters,
      }
    );

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
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter q is required' },
        { status: 400 }
      );
    }

    const searchService = new SearchService();
    
    const results = await searchService.search(
      query,
      entityType as EntityType,
      entityId,
      { limit }
    );

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
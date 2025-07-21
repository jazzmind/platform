import { NextRequest, NextResponse } from 'next/server';
import { PolicyDocumentService } from '../../../../lib/services/document-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, organizationId = 'default-org', limit = 20 } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Document Search API: Searching for "${query}" in organization ${organizationId}`);

    const policyService = new PolicyDocumentService();
    
    // First check if there are any documents at all
    const allDocuments = await policyService.listDocuments(organizationId, { limit: 100 });
    console.log(`📊 Found ${allDocuments.length} total documents in system`);
    
    if (allDocuments.length === 0) {
      console.log(`⚠️ No documents found - need to upload documents first`);
      return NextResponse.json([]);
    }
    
    // Use real semantic search with lower threshold for better results
    const results = await policyService.searchPolicies(query, organizationId, {
      limit,
      threshold: 0.3 // Much lower threshold for broader results
    });

    console.log(`✅ Document Search API: Found ${results.length} results for "${query}"`);
    
    if (results.length === 0) {
      console.log(`⚠️ Search returned no results. This might mean:`);
      console.log(`   - No embeddings have been generated yet`);
      console.log(`   - Search query doesn't match document content`);
      console.log(`   - Need to wait for document processing to complete`);
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Document search API error:', error);
    return NextResponse.json(
      { 
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
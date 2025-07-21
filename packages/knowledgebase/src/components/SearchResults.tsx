'use client';

import React from 'react';
import type { SearchResult } from '../lib/types';

interface SearchResultsProps {
  results: SearchResult[];
  onResultSelect: (result: SearchResult) => void;
  query?: string;
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
  className?: string;
}

export function SearchResults({ 
  results, 
  onResultSelect, 
  query = '',
  suggestions = [],
  onSuggestionSelect,
  className = '' 
}: SearchResultsProps) {
  // Show nothing if no query has been made yet
  if (!query.trim()) {
    return null;
  }

  // Show no results message if query exists but no results
  if (results.length === 0) {
    return (
      <div className={`mt-6 ${className}`}>
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0118 12a8 8 0 01-8 8 8 8 0 01-8-8 8 8 0 018-8c.075 0 .15.001.225.003L8 4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-500 mb-4">
              No documents match your search for "<span className="font-medium">{query}</span>". Try different keywords or upload more documents.
            </p>
            
            {/* Search Tips */}
            <div className="text-left max-w-md mx-auto mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Search tips:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Try different or more general keywords</li>
                <li>• Check spelling and remove special characters</li>
                <li>• Use fewer words for broader results</li>
                <li>• Make sure your documents have been processed</li>
              </ul>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && onSuggestionSelect && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Try these suggestions:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.slice(0, 6).map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => onSuggestionSelect(suggestion)}
                      className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm rounded-full transition-colors"
                    >
                      "{suggestion}"
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Group results by document
  const groupedResults = results.reduce((acc, result) => {
    const docName = result.metadata?.documentName || result.source.filename || 'Unknown Document';
    if (!acc[docName]) acc[docName] = [];
    acc[docName].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const documentCount = Object.keys(groupedResults).length;

  return (
    <div className={`mt-6 ${className}`}>
      <h3 className="text-lg font-medium mb-3">
        Search Results ({documentCount} {documentCount === 1 ? 'document' : 'documents'})
      </h3>
      <div className="space-y-3">
        {Object.entries(groupedResults).map(([docName, chunks]) => {
          // Get the highest similarity chunk for this document
          const bestMatch = chunks.reduce((best, current) => 
            current.similarity > best.similarity ? current : best
          );
          
          return (
            <div key={docName} className="bg-white rounded-lg border border-gray-200">
              {/* Document Header */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onResultSelect(bestMatch)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900 flex-1">
                    {docName}
                  </h4>
                  <div className="flex items-center space-x-2 ml-4">
                    <span className="text-sm text-green-600 font-medium">
                      {Math.round(bestMatch.similarity * 100)}% match
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded uppercase">
                      {bestMatch.metadata?.fileType?.toUpperCase() || 'UNKNOWN'}
                    </span>
                    {chunks.length > 1 && (
                      <span className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded">
                        {chunks.length} sections
                      </span>
                    )}
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-2">
                  {bestMatch.content.substring(0, 200)}...
                </p>
                
                <div className="flex items-center text-xs text-gray-500">
                  <span>
                    📄 {bestMatch.metadata?.fileType?.toUpperCase() || 'UNKNOWN'}
                  </span>
                  <span className="mx-2">•</span>
                  <span>
                    📅 {bestMatch.metadata?.uploadedAt ? new Date(bestMatch.metadata.uploadedAt).toLocaleDateString() : 'Unknown date'}
                  </span>
                  {chunks.length > 1 && (
                    <>
                      <span className="mx-2">•</span>
                      <span>
                        📍 Click to view best match • {chunks.length - 1} more sections available
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Additional Chunks Preview */}
              {chunks.length > 1 && (
                <div className="border-t border-gray-100">
                  <div className="px-4 py-2 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 font-medium">
                        {chunks.length - 1} additional {chunks.length - 1 === 1 ? 'section' : 'sections'} found
                      </span>
                      <div className="flex gap-1">
                        {chunks.slice(1, Math.min(4, chunks.length)).map((chunk, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              onResultSelect(chunk);
                            }}
                            className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
                            title={`${Math.round(chunk.similarity * 100)}% match`}
                          >
                            {Math.round(chunk.similarity * 100)}%
                          </button>
                        ))}
                        {chunks.length > 4 && (
                          <span className="text-xs text-gray-500 px-2 py-1">
                            +{chunks.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 
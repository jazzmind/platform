'use client';

import React, { useState, useCallback } from 'react';
import type { SearchInterfaceProps, SearchResult } from '../lib/types';

export function SearchInterface({
  entityType,
  entityId,
  organizationId,
  onResultSelect,
  onSearch,
  placeholder = 'Search documents...',
  showFilters = false,
  showSuggestions = false,
  className = '',
}: SearchInterfaceProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions] = useState([
    'security policy',
    'data protection',
    'incident response',
    'access control',
    'compliance requirements',
  ]);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      // Make API call to search endpoint
      const response = await fetch('/api/documents/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          entityType,
          entityId,
          limit: 10,
          threshold: 0.7,
          includeMetadata: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Search failed');
      }

      const searchResponse = await response.json();
      const searchResults = searchResponse.results || [];
      
      setResults(searchResults);
      onSearch?.(searchQuery, searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
      // You might want to show an error message to the user here
    } finally {
      setIsSearching(false);
    }
  }, [entityType, entityId, onSearch]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  }, [query, handleSearch]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  }, [handleSearch]);

  return (
    <div className={`search-interface ${className}`}>
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            disabled={isSearching}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {isSearching ? (
              <svg className="h-5 w-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <button
                type="submit"
                className="text-blue-600 hover:text-blue-700 font-medium"
                disabled={!query.trim()}
              >
                Search
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Suggestions */}
      {showSuggestions && !query && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">Popular searches:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-3">Filters:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                File Type
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm">
                <option value="">All types</option>
                <option value="pdf">PDF</option>
                <option value="docx">Word Document</option>
                <option value="txt">Text File</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Upload Date
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm">
                <option value="">Any time</option>
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Sort by
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm">
                <option value="relevance">Relevance</option>
                <option value="date">Upload date</option>
                <option value="filename">File name</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Search Results ({results.length})
            </h3>
            <p className="text-sm text-gray-500">
              Found in {results.length} document{results.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="space-y-4">
            {results.map((result) => (
              <div
                key={result.id}
                className="bg-white p-4 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer transition-colors"
                onClick={() => onResultSelect?.(result)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900 hover:text-blue-600">
                    {result.source.filename}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-green-600 font-medium">
                      {Math.round(result.similarity * 100)}% match
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded uppercase">
                      {result.metadata.fileType}
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {result.content}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Uploaded {new Date(result.metadata.uploadedAt).toLocaleDateString()}
                  </span>
                  {result.source.chunkIndex !== undefined && (
                    <span>Section {result.source.chunkIndex + 1}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {query && !isSearching && results.length === 0 && (
        <div className="text-center py-8">
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
          <p className="text-gray-500">
            Try adjusting your search terms or upload more documents.
          </p>
        </div>
      )}
    </div>
  );
}

export default SearchInterface; 
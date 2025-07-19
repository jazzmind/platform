'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback(async (searchQuery: string) => {
    console.log(`🔍 SearchInterface: Starting search for "${searchQuery}"`);
    
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      // Make API call to search endpoint using GET
      const searchUrl = new URL('/api/documents/search', window.location.origin);
      searchUrl.searchParams.set('q', searchQuery);
      searchUrl.searchParams.set('entityType', entityType);
      searchUrl.searchParams.set('entityId', entityId);
      searchUrl.searchParams.set('organizationId', organizationId);
      searchUrl.searchParams.set('limit', '10');
      searchUrl.searchParams.set('threshold', '0.1'); // Very permissive threshold for testing
      
      console.log(`🔧 SearchInterface: Making GET request to ${searchUrl.toString()}`);
      const response = await fetch(searchUrl.toString());

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Search failed');
      }

      const searchResponse = await response.json();
      const searchResults = searchResponse.results || [];
      
      console.log(`✅ SearchInterface: Search completed for "${searchQuery}", found ${searchResults.length} results`);
      console.log(`✅ SearchInterface: Search response:`, searchResponse);
      
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

  // Debounced search effect
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (query.trim().length === 0) {
      setResults([]);
      return;
    }

    if (query.trim().length < 3) {
      return; // Don't search for queries less than 3 characters
    }

    debounceTimeoutRef.current = setTimeout(() => {
      handleSearch(query);
    }, 500); // 500ms debounce

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query]); // Removed handleSearch from dependencies to prevent infinite loops

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

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
            onChange={handleQueryChange}
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

      {/* Search Results - Display handled by parent component to avoid duplication */}

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
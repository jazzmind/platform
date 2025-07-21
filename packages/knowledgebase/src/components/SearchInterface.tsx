'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SearchResults } from './SearchResults';
import type { SearchInterfaceProps, SearchResult } from '../lib/types';

interface ExtendedSearchInterfaceProps extends SearchInterfaceProps {
  value?: string; // Controlled query value
  onChange?: (query: string) => void; // Callback when query changes
}

export function SearchInterface({
  entityType,
  entityId,
  organizationId,
  onResultSelect,
  onSearch,
  value,
  onChange,
  placeholder = 'Search documents using AI semantic search...',
  showFilters = true,
  showSuggestions = true,
  className = '',
}: ExtendedSearchInterfaceProps) {
  const [internalQuery, setInternalQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loadingResult, setLoadingResult] = useState<string | null>(null);
  const [suggestions] = useState([
    'security policy',
    'data protection',
    'incident response',
    'access control',
    'compliance requirements',
    'risk assessment',
    'audit procedures',
    'privacy controls',
  ]);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use controlled value if provided, otherwise use internal state
  const query = value !== undefined ? value : internalQuery;
  const setQuery = value !== undefined ? (onChange || (() => {})) : setInternalQuery;

  const performSearch = useCallback(async (searchQuery: string) => {
    console.log(`🔍 SearchInterface: Starting search for "${searchQuery}"`);
    
    if (!searchQuery.trim()) {
      setResults([]);
      onSearch?.('', []);
      return;
    }

    setIsSearching(true);
    
    try {
      // Use POST request to align with polysec format
      const response = await fetch('/api/documents/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          entityType,
          entityId,
          organizationId,
          limit: 10,
          threshold: 0.1,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Search failed');
      }

      const searchResponse = await response.json();
      const searchResults = searchResponse.results || [];
      
      console.log(`✅ SearchInterface: Search completed for "${searchQuery}", found ${searchResults.length} results`);
      
      setResults(searchResults);
      onSearch?.(searchQuery, searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
      onSearch?.(searchQuery, []);
    } finally {
      setIsSearching(false);
    }
  }, [entityType, entityId, organizationId, onSearch]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  }, [query, performSearch]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion);
    performSearch(suggestion);
  }, [performSearch, setQuery]);

  const handleResultSelect = useCallback(async (result: SearchResult) => {
    if (!onResultSelect) return;
    
    try {
      setLoadingResult(result.id);
      console.log(`📄 SearchInterface: Selecting result ${result.id}`);
      
      await onResultSelect(result);
      
    } catch (error) {
      console.error('Failed to select search result:', error);
    } finally {
      setLoadingResult(null);
    }
  }, [onResultSelect]);

  // Debounced search effect - removed handleSearch from dependencies
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (query.trim().length === 0) {
      setResults([]);
      onSearch?.('', []);
      return;
    }

    if (query.trim().length < 3) {
      return; // Don't search for queries less than 3 characters
    }

    debounceTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 500); // 500ms debounce

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query]); // Only depend on query, not performSearch

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, [setQuery]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string): string => {
    switch (fileType?.toLowerCase()) {
      case 'pdf': return '📄';
      case 'docx': return '📝';
      case 'txt': return '📃';
      case 'html': return '🌐';
      case 'md': return '📋';
      default: return '📄';
    }
  };

  return (
    <div className={`search-interface space-y-6 ${className}`}>
      {/* Search Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
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
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              ) : (
                <button
                  type="submit"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  disabled={!query.trim()}
                >
                  Search
                </button>
              )}
            </div>
          </div>
          
          {query && (
            <p className="text-sm text-gray-600">
              AI-powered semantic search • Find content by meaning, not just keywords
            </p>
          )}
        </form>

        {/* Suggestions */}
        {showSuggestions && !query && (
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Popular searches:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-3">Filters:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  File Type
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">All types</option>
                  <option value="pdf">PDF</option>
                  <option value="docx">Word Document</option>
                  <option value="txt">Text File</option>
                  <option value="html">HTML</option>
                  <option value="md">Markdown</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Upload Date
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">Any time</option>
                  <option value="today">Today</option>
                  <option value="week">This week</option>
                  <option value="month">This month</option>
                  <option value="year">This year</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Sort by
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="relevance">Relevance</option>
                  <option value="date">Upload date</option>
                  <option value="filename">File name</option>
                  <option value="size">File size</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

  
      {/* Search Tips */}
      {!query && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Search Tips</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Use natural language queries like "security incident procedures"</li>
            <li>• AI search understands context and meaning, not just keywords</li>
            <li>• Try synonyms if you don't find what you're looking for</li>
            <li>• Use specific terms like "compliance", "audit", or "risk assessment"</li>
            <li>• Search works best with 3+ words for better context</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default SearchInterface; 
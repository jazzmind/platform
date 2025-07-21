'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { FileMetadata } from '../lib/types';
import { getFileIcon } from '../lib/utils';

// Enhanced props to support both knowledgebase and polysec usage patterns
interface DocumentListProps {
  entityType: string;
  entityId: string;
  organizationId: string;
  refreshKey?: number;
  className?: string;
  onDocumentSelect?: (fileId: string, document?: any) => void;
  onDocumentDelete?: (fileId: string) => void;
  enableSearch?: boolean;
  enableFilters?: boolean;
  searchEndpoint?: string; // Allow custom search endpoint
  documentsEndpoint?: string; // Allow custom documents endpoint
}

interface DocumentItem {
  fileId: string;
  id?: string; // polysec uses id instead of fileId
  metadata: FileMetadata;
  uploadedAt: Date;
  title?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  status?: string;
  version?: string;
}

interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  source: {
    fileId: string;
    filename: string;
  };
  metadata: {
    fileType: string;
    uploadedAt: string;
    extractedAt: string;
    documentName?: string;
    chunkIndex?: number;
  };
}

type FileType = 'pdf' | 'docx' | 'txt' | 'html' | 'md';
type ProcessingStatus = 'processing' | 'completed' | 'failed';

export function DocumentList({
  entityType,
  entityId,
  organizationId,
  refreshKey = 0,
  className = '',
  onDocumentSelect,
  onDocumentDelete,
  enableSearch = true,
  enableFilters = true,
  searchEndpoint = '/api/documents/search',
  documentsEndpoint = '/api/documents',
}: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingDocument, setLoadingDocument] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'documents' | 'search'>('documents');
  const [filters, setFilters] = useState({
    fileType: '' as FileType | '',
    status: '' as ProcessingStatus | ''
  });
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');

  // Load documents from API
  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams();
        if (filters.fileType) params.append('fileType', filters.fileType);
        if (filters.status) params.append('status', filters.status);
        params.append('entityType', entityType);
        params.append('entityId', entityId);
        params.append('organizationId', organizationId);

        const response = await fetch(`${documentsEndpoint}?${params}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || errorData.error || 'Failed to load documents');
        }

        const data = await response.json();
        
        // Handle knowledgebase format
        const documentItems: DocumentItem[] = (data.documents || []).map((doc: any) => ({
          fileId: doc.fileId,
          metadata: doc.metadata,
          uploadedAt: new Date(doc.uploadedAt || doc.metadata.uploadedAt),
        }));
        
        setDocuments(documentItems);
        console.log(`✅ Loaded ${documentItems.length} documents`);
      } catch (err) {
        console.error('❌ Failed to fetch documents:', err);
        setError(err instanceof Error ? err.message : 'Failed to load documents');
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, [entityType, entityId, organizationId, filters, refreshKey, documentsEndpoint]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim() && enableSearch) {
        performSearch(searchQuery);
      } else {
        setViewMode('documents');
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, enableSearch]);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setViewMode('documents');
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      
      console.log(`🔍 Performing vector search for: "${query}"`);
      
      // Use POST for search consistently
      const response = await fetch(searchEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          entityType,
          entityId,
          organizationId,
          limit: 20,
          threshold: 0.1,
        }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const results = await response.json();
      const searchResultsData = results.results || [];
      
      setSearchResults(searchResultsData);
      setViewMode('search');
      console.log(`✅ Found ${searchResultsData.length} search results`);
      
    } catch (err) {
      console.error('❌ Search failed:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  // Filter and sort documents
  const filteredDocuments = documents
    .filter(doc => {
      const docFileType = doc.metadata?.fileType || doc.fileType;
      const docStatus = doc.status;
      
      if (filters.fileType && docFileType !== filters.fileType) return false;
      if (filters.status && docStatus !== filters.status) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          const aName = a.metadata?.filename || a.fileName || a.title || '';
          const bName = b.metadata?.filename || b.fileName || b.title || '';
          return aName.localeCompare(bName);
        case 'size':
          const aSize = a.metadata?.size || a.fileSize || 0;
          const bSize = b.metadata?.size || b.fileSize || 0;
          return bSize - aSize;
        case 'date':
        default:
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      }
    });

  const handleDocumentClick = async (doc: DocumentItem) => {
    const documentId = doc.fileId || doc.id;
    
    if (!documentId) return;
    
    try {
      setLoadingDocument(documentId);
      console.log(`📄 Loading document: ${documentId}`);
      
      // Always use knowledgebase mode
      onDocumentSelect?.(documentId, doc);
    } catch (error) {
      console.error('Failed to load document:', error);
      onDocumentSelect?.(documentId, doc);
    } finally {
      setLoadingDocument(null);
    }
  };

  const handleSearchResultClick = async (result: SearchResult) => {
    try {
      setLoadingDocument(result.source.fileId);
      console.log(`📄 Loading document from search result: ${result.source.fileId}`);
      
      // Find the document in our list or pass the result
      const document = documents.find(doc => (doc.fileId || doc.id) === result.source.fileId);
      if (document) {
        onDocumentSelect?.(result.source.fileId, document);
      } else {
        // Pass search result data
        onDocumentSelect?.(result.source.fileId, result);
      }
    } catch (err) {
      console.error('Failed to fetch document from search result:', err);
      alert('Failed to load document. Please try again.');
    } finally {
      setLoadingDocument(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className={`document-list flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`document-list bg-white rounded-lg border border-gray-200 p-8 ${className}`}>
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading documents</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`document-list space-y-6 ${className}`}>

      {/* Document List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Documents ({filteredDocuments.length})
          </h3>
        {/* Filters */}
        {enableFilters && viewMode === 'documents' && (
              <div className="flex gap-2">
                <select
                  value={filters.fileType}
                  onChange={(e) => setFilters(prev => ({ ...prev, fileType: e.target.value as FileType | '' }))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All types</option>
                  <option value="pdf">PDF</option>
                  <option value="docx">Word</option>
                  <option value="txt">Text</option>
                  <option value="html">HTML</option>
                  <option value="md">Markdown</option>
                </select>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'size')}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="date">Sort by Date</option>
                  <option value="name">Sort by Name</option>
                  <option value="size">Sort by Size</option>
                </select>
              </div>
            )}
        </div>


  
      {filteredDocuments.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0118 12a8 8 0 01-8 8 8 8 0 01-8-8 8 8 0 018-8c.075 0 .15.001.225.003L8 4"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-500">Upload some documents to get started</p>
        </div>
      ) : (
        filteredDocuments.map((doc) => {
          const documentId = doc.fileId || doc.id;
          const filename = doc.metadata?.filename || doc.fileName || doc.title;
          const fileType = doc.metadata?.fileType || doc.fileType;
          const fileSize = doc.metadata?.size || doc.fileSize || 0;
          
          return (
            <div
              key={documentId}
              className="px-6 py-4 hover:bg-gray-50 border-b border-gray-200 cursor-pointer transition-colors"
              onClick={() => handleDocumentClick(doc)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl mt-1">
                    {getFileIcon(fileType || 'pdf')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                        {filename}
                      </h4>
                      {doc.status && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                          {doc.status}
                        </span>
                      )}
                      {doc.version && (
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                          v{doc.version}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="uppercase">{fileType}</span>
                      <span>{formatFileSize(fileSize)}</span>
                      <span>📅 {format(doc.uploadedAt, 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                
                  <div className="text-gray-400">
                    {loadingDocument === documentId ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    ) : (
                      '→'
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}





{/* 
        {filteredDocuments.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0118 12a8 8 0 01-8 8 8 8 0 01-8-8 8 8 0 018-8c.075 0 .15.001.225.003L8 4"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">No documents found</p>
            <p className="text-gray-500">Upload some documents to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.fileId}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleDocumentClick(doc)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-medium text-gray-900 truncate">
                        {doc.metadata?.filename || doc.fileName || doc.title || 'Untitled Document'}
                      </h4>
                      {doc.status && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(doc.status)}`}>
                          {doc.status}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>📄 {(doc.metadata?.fileType || doc.fileType || 'unknown').toUpperCase()}</span>
                      <span>📊 {formatFileSize(doc.metadata?.size || doc.fileSize || 0)}</span>
                      <span>📅 {format(doc.uploadedAt, 'MMM d, yyyy')}</span>
                      {doc.version && <span>🔖 v{doc.version}</span>}
                    </div>
                  </div>
                  <div className="ml-4">
                    {loadingDocument === doc.fileId ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    ) : (
                      <div className="text-gray-400">→</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )} */}
      </div>
    </div>
  );
}
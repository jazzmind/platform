'use client';

import React, { useState } from 'react';
import { DocumentUpload } from './DocumentUpload';
import { SearchInterface } from './SearchInterface';
import { DocumentList } from './DocumentList';
import { DocumentViewer } from './DocumentViewer';
import { SearchResults } from './SearchResults';
import type { SearchResult, ProcessingResult, EntityType } from '../lib/types';

interface KnowledgebaseAppProps {
  entityType?: string;
  entityId?: string;
  organizationId?: string;
  className?: string;
}

export default function KnowledgebaseApp({
  entityType = 'knowledgebase',
  entityId = 'default',
  organizationId = 'default-org',
  className = '',
}: KnowledgebaseAppProps) {
  const [selectedTab, setSelectedTab] = useState<'upload' | 'search' | 'documents'>('upload');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedSearchResult, setSelectedSearchResult] = useState<SearchResult | null>(null);
  const [currentSearchQuery, setCurrentSearchQuery] = useState<string>('');

  // Popular search suggestions
  const searchSuggestions = [
    'security policy',
    'data protection',
    'privacy requirements',
    'compliance standards',
    'risk assessment',
    'audit procedures',
  ];

  const handleUploadComplete = (result: ProcessingResult) => {
    console.log('Upload completed:', result);
    // Trigger refresh of document list
    setRefreshKey(prev => prev + 1);
    // Switch to documents tab to show the uploaded file
    setSelectedTab('documents');
  };

  const handleSearch = (query: string, results: SearchResult[]) => {
    setCurrentSearchQuery(query);
    setSearchResults(results);
  };

  const handleSearchQueryChange = (query: string) => {
    setCurrentSearchQuery(query);
  };

  const handleResultSelect = (result: SearchResult) => {
    console.log('Selected result:', result);
    setSelectedFileId(result.source.fileId);
    setSelectedSearchResult(result);
    // Switch to documents tab to show the viewer
    setSelectedTab('documents');
  };

  const handleSuggestionSelect = (suggestion: string) => {
    // Set the search query which will trigger the SearchInterface to search
    setCurrentSearchQuery(suggestion);
  };

  const handleDocumentSelect = (fileId: string) => {
    console.log('Document selected:', fileId);
    setSelectedFileId(fileId);
    setSelectedSearchResult(null); // Clear search context when selecting from list
  };

  const handleViewerClose = () => {
    setSelectedFileId(null);
    setSelectedSearchResult(null);
  };

  const handleDocumentDelete = async (fileId: string) => {
    try {
      console.log('Deleting document:', fileId);
      const response = await fetch(`/api/documents/${fileId}?organizationId=${organizationId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete document');
      }
      
      // Trigger refresh of document list
      setRefreshKey(prev => prev + 1);
      console.log('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  return (
    <div className={`knowledgebase-app min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Knowledge Base</h1>
              <p className="text-gray-600 mt-1">Upload, search, and manage your documents with AI-powered processing</p>
            </div>
            <div className="text-sm text-gray-500">
              Organization: {organizationId}
            </div>
          </div>
        </div>
      </div>
      
      {/* Navigation Tabs */}
      {selectedFileId ? (
        // Document Viewer Mode
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-4">
              <button
                onClick={() => handleViewerClose()}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <span>←</span>
                Back to Library
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Tab Navigation
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              {[
                { id: 'upload', label: 'Upload Documents', icon: '📤' },
                { id: 'search', label: 'Search', icon: '🔍' },
                { id: 'documents', label: 'Documents', icon: '📋' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedTab(tab.id as any);
                    if (tab.id !== 'documents') {
                      setSelectedFileId(null);
                      setSelectedSearchResult(null);
                    }
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    selectedTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedTab === 'upload' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Upload Documents</h2>
            <DocumentUpload
              entityType={entityType as EntityType}
              entityId={entityId}
              organizationId={organizationId}
              onUploadComplete={handleUploadComplete}
              maxFileSize={100 * 1024 * 1024} // 100MB
              allowedFileTypes={['pdf', 'docx', 'txt', 'html', 'md']}
              className="bg-white rounded-lg border border-gray-200 p-6"
            />
          </div>
        )}

        {selectedTab === 'search' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Search Documents</h2>
            <SearchInterface
              entityType={entityType as EntityType}
              entityId={entityId}
              organizationId={organizationId}
              value={currentSearchQuery}
              onChange={handleSearchQueryChange}
              onSearch={handleSearch}
              onResultSelect={handleResultSelect}
              showFilters={true}
              showSuggestions={true}
              className="bg-white rounded-lg border border-gray-200"
            />
            
            <SearchResults
              results={searchResults}
              query={currentSearchQuery}
              suggestions={searchSuggestions}
              onResultSelect={handleResultSelect}
              onSuggestionSelect={handleSuggestionSelect}
            />
          </div>
        )}

        {selectedTab === 'documents' && (
          <div>
            {selectedFileId ? (
              // Show DocumentViewer inline
              <DocumentViewer
                fileId={selectedFileId}
                organizationId={organizationId}
                onClose={handleViewerClose}
                onDelete={handleDocumentDelete}
                enableAICleanup={true}
                searchContext={selectedSearchResult ? {
                  query: currentSearchQuery,
                  matchingContent: selectedSearchResult.content,
                  chunkIndex: selectedSearchResult.metadata.chunkIndex,
                  similarity: selectedSearchResult.similarity,
                } : undefined}
              />
            ) : (
              // Show DocumentList
              <>
                <h2 className="text-xl font-semibold mb-4">Document Library</h2>
                <DocumentList
                  entityType={entityType}
                  entityId={entityId}
                  organizationId={organizationId}
                  refreshKey={refreshKey}
                  onDocumentSelect={handleDocumentSelect}
                  onDocumentDelete={handleDocumentDelete}
                  className=""
                />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
} 
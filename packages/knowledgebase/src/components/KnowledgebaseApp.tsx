'use client';

import React, { useState } from 'react';
import { DocumentUpload } from './DocumentUpload';
import { SearchInterface } from './SearchInterface';
import { DocumentList } from './DocumentList';
import { DocumentPreview } from './DocumentPreview';
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedSearchResult, setSelectedSearchResult] = useState<SearchResult | null>(null);
  const [currentSearchQuery, setCurrentSearchQuery] = useState<string>('');

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

  const handleResultSelect = (result: SearchResult) => {
    console.log('Selected result:', result);
    setSelectedFileId(result.source.fileId);
    setSelectedSearchResult(result);
    setIsPreviewOpen(true);
  };

  const handleDocumentSelect = (fileId: string) => {
    console.log('Document selected:', fileId);
    setSelectedFileId(fileId);
    setIsPreviewOpen(true);
  };

  const handlePreviewClose = () => {
    setIsPreviewOpen(false);
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
    <div className={`knowledgebase-app max-w-6xl mx-auto p-6 ${className}`}>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Knowledge Base
        </h1>
        <p className="text-gray-600">
          Upload, search, and manage your documents with AI-powered processing
        </p>
      </header>

      {/* Tab Navigation */}
      <nav className="mb-6">
        <div className="border-b border-gray-200">
          <div className="-mb-px flex space-x-8">
            {[
              { id: 'upload', label: 'Upload Documents', icon: '📤' },
              { id: 'search', label: 'Search', icon: '🔍' },
              { id: 'documents', label: 'Document Library', icon: '📚' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Tab Content */}
      <main className="min-h-96">
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
              onSearch={handleSearch}
              onResultSelect={handleResultSelect}
              showFilters={true}
              showSuggestions={true}
              className="bg-white rounded-lg border border-gray-200"
            />
            
            {/* Search Results - Grouped by Document */}
            {searchResults.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">
                  Search Results (                  {(() => {
                    const groupedResults = searchResults.reduce((acc, result) => {
                      const docName = result.metadata?.documentName || result.source.filename || 'Unknown Document';
                      if (!acc[docName]) acc[docName] = [];
                      acc[docName].push(result);
                      return acc;
                    }, {} as Record<string, typeof searchResults>);
                    return Object.keys(groupedResults).length;
                  })()})
                </h3>
                <div className="space-y-3">
                  {(() => {
                    // Group results by document
                    const groupedResults = searchResults.reduce((acc, result) => {
                      const docName = result.metadata?.documentName || result.source.filename || 'Unknown Document';
                      if (!acc[docName]) acc[docName] = [];
                      acc[docName].push(result);
                      return acc;
                    }, {} as Record<string, typeof searchResults>);

                    return Object.entries(groupedResults).map(([docName, chunks]) => {
                      // Get the highest similarity chunk for this document
                      const bestMatch = chunks.reduce((best, current) => 
                        current.similarity > best.similarity ? current : best
                      );
                      
                      return (
                        <div key={docName} className="bg-white rounded-lg border border-gray-200">
                          {/* Document Header */}
                          <div 
                            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => handleResultSelect(bestMatch)}
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
                              <span>Uploaded {bestMatch.metadata?.uploadedAt ? new Date(bestMatch.metadata.uploadedAt).toLocaleDateString() : 'Unknown date'}</span>
                              {chunks.length > 1 && (
                                <span className="ml-4">Click to view best match • {chunks.length - 1} more sections available</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'documents' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Document Library</h2>
            <DocumentList
              entityType={entityType}
              entityId={entityId}
              organizationId={organizationId}
              refreshKey={refreshKey}
              onDocumentSelect={handleDocumentSelect}
              onDocumentDelete={handleDocumentDelete}
              className="bg-white rounded-lg border border-gray-200"
            />
          </div>
        )}
      </main>

      {/* Document Preview Modal */}
      {selectedFileId && (
        <DocumentPreview
          fileId={selectedFileId}
          organizationId={organizationId}
          isOpen={isPreviewOpen}
          onClose={handlePreviewClose}
          searchContext={selectedSearchResult ? {
            query: currentSearchQuery,
            matchingContent: selectedSearchResult.content,
            chunkIndex: selectedSearchResult.metadata.chunkIndex,
            similarity: selectedSearchResult.similarity,
          } : undefined}
        />
      )}
    </div>
  );
} 
'use client';

import React, { useState } from 'react';
import { DocumentUpload } from './DocumentUpload';
import { SearchInterface } from './SearchInterface';
import { DocumentList } from './DocumentList';
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

  const handleUploadComplete = (result: ProcessingResult) => {
    console.log('Upload completed:', result);
    // Trigger refresh of document list
    setRefreshKey(prev => prev + 1);
    // Switch to documents tab to show the uploaded file
    setSelectedTab('documents');
  };

  const handleSearch = (query: string, results: SearchResult[]) => {
    setSearchResults(results);
  };

  const handleResultSelect = (result: SearchResult) => {
    console.log('Selected result:', result);
    // Handle result selection (e.g., open document viewer)
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
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">
                  Search Results ({searchResults.length})
                </h3>
                <div className="space-y-3">
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors"
                      onClick={() => handleResultSelect(result)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">
                          {result.source.filename}
                        </h4>
                        <span className="text-sm text-gray-500">
                          {Math.round(result.similarity * 100)}% match
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">
                        {result.content.substring(0, 200)}...
                      </p>
                      <div className="flex items-center text-xs text-gray-500">
                        <span>{result.metadata.fileType.toUpperCase()}</span>
                        <span className="mx-2">•</span>
                        <span>{new Date(result.metadata.uploadedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
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
              className="bg-white rounded-lg border border-gray-200"
            />
          </div>
        )}
      </main>
    </div>
  );
} 
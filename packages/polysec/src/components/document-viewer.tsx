'use client';

import React, { useState } from 'react';
import { PolicyDocument, DocumentSection } from '../types';

interface DocumentViewerProps {
  document: PolicyDocument;
  onBack: () => void;
}

export function DocumentViewer({ document, onBack }: DocumentViewerProps) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Get document content and sections
  const content = document.content as any;
  const sections = (document.sections as DocumentSection[]) || [];
  const documentText = content?.text || 'No content available';
  const metadata = content?.metadata || {};

  // Filter sections based on search
  const filteredSections = sections.filter(section =>
    !searchQuery || 
    section.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get current section to display
  const currentSection = selectedSection 
    ? sections.find(s => s.id === selectedSection)
    : null;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Table of Contents */}
      <div className="w-80 bg-white border-r shadow-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <button
            onClick={onBack}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-3"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Documents
          </button>
          
          <h3 className="text-lg font-medium text-gray-900 truncate">
            {document.title}
          </h3>
          <p className="text-sm text-gray-500">{document.fileName}</p>
          
          {/* Search */}
          <div className="mt-3">
            <input
              type="text"
              placeholder="Search sections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Table of Contents */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <button
              onClick={() => setSelectedSection(null)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                !selectedSection 
                  ? 'bg-blue-100 text-blue-900' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Full Document
            </button>
          </div>
          
          {filteredSections.length > 0 ? (
            <div className="px-4 pb-4 space-y-1">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Sections ({filteredSections.length})
              </h4>
              {filteredSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setSelectedSection(section.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    selectedSection === section.id 
                      ? 'bg-blue-100 text-blue-900' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium truncate">
                    {section.title || `Section ${section.id}`}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {section.content.substring(0, 60)}...
                  </div>
                </button>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">No sections match your search</p>
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">No sections available</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Document Header */}
        <div className="bg-white border-b p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentSection?.title || document.title}
              </h1>
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <span>Type: {document.fileType}</span>
                <span>Size: {(document.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                <span>Status: {document.status}</span>
                {document.version && <span>Version: {document.version}</span>}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                Export
              </button>
              <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                Download
              </button>
            </div>
          </div>
          
          {/* Metadata */}
          {Object.keys(metadata).length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
              <h4 className="font-medium text-gray-900 mb-2">Document Metadata</h4>
              <div className="grid grid-cols-2 gap-2">
                {metadata.author && (
                  <div>
                    <span className="text-gray-500">Author:</span>
                    <span className="ml-1 text-gray-900">{metadata.author}</span>
                  </div>
                )}
                {metadata.createdDate && (
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <span className="ml-1 text-gray-900">
                      {new Date(metadata.createdDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {metadata.pageCount && (
                  <div>
                    <span className="text-gray-500">Pages:</span>
                    <span className="ml-1 text-gray-900">{metadata.pageCount}</span>
                  </div>
                )}
                {metadata.keywords && Array.isArray(metadata.keywords) && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Keywords:</span>
                    <span className="ml-1 text-gray-900">{metadata.keywords.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="max-w-4xl mx-auto">
            {currentSection ? (
              // Show selected section
              <div>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                    {currentSection.content}
                  </div>
                </div>
                
                {/* Section Info */}
                <div className="mt-8 p-4 bg-gray-50 rounded text-sm">
                  <h4 className="font-medium text-gray-900 mb-2">Section Information</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-500">Section ID:</span>
                      <span className="ml-1 text-gray-900">{currentSection.id}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Level:</span>
                      <span className="ml-1 text-gray-900">{currentSection.level}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Start Position:</span>
                      <span className="ml-1 text-gray-900">{currentSection.startIndex}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">End Position:</span>
                      <span className="ml-1 text-gray-900">{currentSection.endIndex}</span>
                    </div>
                    {currentSection.pageNumber && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Page:</span>
                        <span className="ml-1 text-gray-900">{currentSection.pageNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Show full document
              <div>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                    {documentText}
                  </div>
                </div>
                
                {/* Document Stats */}
                <div className="mt-8 p-4 bg-gray-50 rounded text-sm">
                  <h4 className="font-medium text-gray-900 mb-2">Document Statistics</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-500">Characters:</span>
                      <span className="ml-1 text-gray-900">{documentText.length.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Words:</span>
                      <span className="ml-1 text-gray-900">
                                                 {documentText.split(/\s+/).filter((word: string) => word.length > 0).length.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Sections:</span>
                      <span className="ml-1 text-gray-900">{sections.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Uploaded:</span>
                      <span className="ml-1 text-gray-900">
                        {new Date(document.uploadDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
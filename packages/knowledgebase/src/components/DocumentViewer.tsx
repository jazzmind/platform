'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { TextDiffViewer } from './TextDiffViewer';
import type { DocumentViewerProps, FileMetadata } from '../lib/types';

interface DocumentContent {
  fileId: string;
  fileType: string;
  metadata: FileMetadata;
  content: string;
  previewContent?: string;
  downloadUrl?: string;
  chunkCount?: number;
  wordCount?: number;
  sections?: Array<{
    id: string;
    title: string;
    content: string;
    order: number;
    level?: number;
    startIndex?: number;
    endIndex?: number;
    pageNumber?: number;
  }>;
}

interface DocumentSection {
  id: string;
  title: string;
  content: string;
  level?: number;
  startIndex?: number;
  endIndex?: number;
  pageNumber?: number;
}

export function DocumentViewer({
  fileId,
  organizationId,
  onClose,
  onDelete,
  showMetadata = true,
  showSections = true,
  enableSearch = true,
  enableAICleanup = true,
  className = '',
  previewEndpoint = '/api/documents',
  searchContext,
}: DocumentViewerProps & {
  onDelete?: (fileId: string) => void;
  enableAICleanup?: boolean;
  previewEndpoint?: string;
  searchContext?: {
    query: string;
    matchingContent: string;
    chunkIndex?: number;
    similarity?: number;
  };
}) {
  const [document, setDocument] = useState<DocumentContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // AI Cleanup state
  const [showDiffView, setShowDiffView] = useState(false);
  const [cleanupData, setCleanupData] = useState<{
    originalText: string;
    cleanedText: string;
    fileName: string;
  } | null>(null);
  const [isProcessingCleanup, setIsProcessingCleanup] = useState(false);
  const [isApplyingCleanup, setIsApplyingCleanup] = useState(false);

  useEffect(() => {
    if (fileId) {
      loadDocument();
    }
  }, [fileId, organizationId]);

  // Initialize search query from search context
  useEffect(() => {
    if (searchContext?.query) {
      setSearchQuery(searchContext.query);
    }
  }, [searchContext]);

  const loadDocument = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`📖 DocumentViewer: Loading document ${fileId}`);
      
      const url = `${previewEndpoint}/${fileId}/preview?organizationId=${organizationId}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Handle knowledgebase format
      const documentContent: DocumentContent = {
        fileId: data.fileId || fileId,
        fileType: data.fileType || 'unknown',
        metadata: data.metadata || {
          filename: 'Unknown Document',
          fileType: 'unknown',
          mimeType: 'application/unknown',
          size: 0,
          uploadedAt: new Date().toISOString(),
          organizationId,
        },
        content: data.content || data.previewContent || 'No content available',
        sections: data.sections || [],
        downloadUrl: data.downloadUrl,
        wordCount: data.wordCount,
        chunkCount: data.chunkCount,
      };
      
      setDocument(documentContent);
      console.log(`✅ DocumentViewer: Document loaded`, documentContent);
      
    } catch (error) {
      console.error('Error loading document:', error);
      setError(error instanceof Error ? error.message : 'Failed to load document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${document?.metadata.filename}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      console.log(`🗑️ DocumentViewer: Deleting document ${fileId}`);
      
      const response = await fetch(`/api/documents/${fileId}?organizationId=${organizationId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete document');
      }
      
      console.log(`✅ DocumentViewer: Successfully deleted document ${fileId}`);
      
      // Call the onDelete callback if provided
      onDelete?.(fileId);
      
      // Navigate back to document list
      onClose();
      
    } catch (error) {
      console.error('Error deleting document:', error);
      alert(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAICleanup = async () => {
    if (!document || isProcessingCleanup) return;
    
    const isPDF = document.fileType.toLowerCase() === 'pdf';
    if (!isPDF) {
      alert('AI cleanup is currently only available for PDF documents.');
      return;
    }
    
    setIsProcessingCleanup(true);
    
    try {
      console.log(`🤖 DocumentViewer: Starting AI cleanup for ${fileId}`);
      
      const response = await fetch(`/api/documents/${fileId}/cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          text: document.content,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process AI cleanup');
      }
      
      const result = await response.json();
      
      setCleanupData({
        originalText: document.content,
        cleanedText: result.data.cleanedText,
        fileName: document.metadata.filename,
      });
      setShowDiffView(true);
      
      console.log(`✅ DocumentViewer: AI cleanup completed for ${fileId}`);
      
    } catch (error) {
      console.error('Error during AI cleanup:', error);
      alert(`AI cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessingCleanup(false);
    }
  };

  const handleAcceptCleanup = async () => {
    if (!cleanupData || !document) return;
    
    setIsApplyingCleanup(true);
    
    try {
      // Update the document content with cleaned text
      const updatedDocument = {
        ...document,
        content: cleanupData.cleanedText,
      };
      
      setDocument(updatedDocument);
      setShowDiffView(false);
      setCleanupData(null);
      
      // Refresh the document to get the latest version
      await loadDocument();
      
    } catch (error) {
      console.error('Error applying cleanup:', error);
      alert(`Failed to apply cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsApplyingCleanup(false);
    }
  };

  const handleRejectCleanup = () => {
    setShowDiffView(false);
    setCleanupData(null);
  };

  // Get document content and sections
  const content = document?.content || '';
  const sections = document?.sections || [];
  const documentText = content || 'No content available';

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

  // Utility functions
  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type === 'pdf') return '📄';
    if (type === 'docx' || type === 'doc') return '📝';
    if (type === 'txt') return '📄';
    if (type === 'html') return '🌐';
    if (type === 'md') return '📋';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm || !text) {
      return <div className="prose max-w-none">
        <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
          {text}
        </div>
      </div>;
    }

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return (
      <div className="prose max-w-none">
        <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
          {parts.map((part, index) => 
            regex.test(part) ? (
              <mark key={index} className="bg-yellow-200 px-1 rounded">
                {part}
              </mark>
            ) : (
              part
            )
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 bg-gray-50 ${className}`}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center py-12 bg-gray-50 ${className}`}>
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading document</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!document) {
    return null;
  }

  return (
    <div className={`bg-white ${className}`}>
      <div className="flex h-[calc(100vh-200px)] bg-gray-50">
        {/* Sidebar - Table of Contents */}
        <div className="w-80 bg-white border-r shadow-sm overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b">
            <button
              onClick={onClose}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-3"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Documents
            </button>
            
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {document.metadata.filename}
            </h3>
            <p className="text-sm text-gray-500">{document.metadata.filename}</p>
            
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
                  {document.metadata.filename}
                </h1>
                <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                  <span>Type: {document.fileType.toUpperCase()}</span>
                  <span>Size: {formatFileSize(document.metadata.size)}</span>
                  {document.wordCount && <span>Words: {document.wordCount.toLocaleString()}</span>}
                </div>
              </div>
              
              <div className="flex space-x-2">
                {/* AI Cleanup Button */}
                {enableAICleanup && document.fileType.toLowerCase() === 'pdf' && (
                  <button
                    onClick={handleAICleanup}
                    disabled={isProcessingCleanup}
                    className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 transition-colors ${
                      isProcessingCleanup
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                    title="Fix spacing issues with AI"
                  >
                    {isProcessingCleanup ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        🤖 Fix Spacing
                      </>
                    )}
                  </button>
                )}
                
                <button 
                  onClick={() => document.downloadUrl && window.open(document.downloadUrl, '_blank')}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Download
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${
                    isDeleting 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                  title={isDeleting ? 'Deleting...' : 'Delete document'}
                >
                  {isDeleting ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>

            {/* Search Context or Document Metadata */}
            {searchContext ? (
              <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
                <h4 className="font-medium text-blue-900 mb-2">Search Match</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-blue-700 font-medium">Query:</span>
                    <span className="ml-2 text-blue-800">"{searchContext.query}"</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Similarity:</span>
                    <span className="ml-2 text-blue-800">{Math.round(searchContext.similarity! * 100)}% match</span>
                  </div>
                  {searchContext.chunkIndex !== undefined && (
                    <div>
                      <span className="text-blue-700 font-medium">Found in:</span>
                      <span className="ml-2 text-blue-800">Section {searchContext.chunkIndex + 1}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-blue-700 font-medium">Matching content:</span>
                    <div className="mt-1 p-2 bg-white border border-blue-200 rounded text-blue-900 italic">
                      "{searchContext.matchingContent.substring(0, 200)}..."
                    </div>
                  </div>
                </div>
              </div>
            ) : showMetadata && (
              <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
                <h4 className="font-medium text-gray-900 mb-2">Document Metadata</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500">File Type:</span>
                    <span className="ml-1 text-gray-900">{document.fileType.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">File Size:</span>
                    <span className="ml-1 text-gray-900">{formatFileSize(document.metadata.size)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Uploaded:</span>
                    <span className="ml-1 text-gray-900">
                      {new Date(document.metadata.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {document.chunkCount && (
                    <div>
                      <span className="text-gray-500">Sections:</span>
                      <span className="ml-1 text-gray-900">{document.chunkCount}</span>
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
                  {highlightSearchTerm(currentSection.content, searchQuery)}
                  
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
                  {highlightSearchTerm(documentText, searchQuery)}
                  
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
                          {new Date(document.metadata.uploadedAt).toLocaleDateString()}
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

      {/* AI Cleanup Diff View Modal */}
      {showDiffView && cleanupData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
            <TextDiffViewer
              originalText={cleanupData.originalText}
              cleanedText={cleanupData.cleanedText}
              fileName={cleanupData.fileName}
              onAccept={handleAcceptCleanup}
              onReject={handleRejectCleanup}
              isApplying={isApplyingCleanup}
            />
          </div>
        </div>
      )}
    </div>
  );
} 
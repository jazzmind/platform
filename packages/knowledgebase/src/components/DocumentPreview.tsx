'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { TextDiffViewer } from './TextDiffViewer';

interface DocumentPreviewData {
  fileId: string;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  content: string;
  previewContent: string;
  downloadUrl: string;
  chunkCount: number;
  previewAvailable: boolean;
  wordCount: number;
  metadata: any;
  sections?: Array<{
    id: string;
    title: string;
    content: string;
    level?: number;
    startIndex?: number;
    endIndex?: number;
    pageNumber?: number;
  }>;
}

interface DocumentPreviewProps {
  fileId: string;
  organizationId: string;
  isOpen: boolean;
  onClose: () => void;
  searchContext?: {
    query: string;
    matchingContent: string;
    chunkIndex?: number;
    similarity?: number;
  };
}

export function DocumentPreview({ fileId, organizationId, isOpen, onClose, searchContext }: DocumentPreviewProps) {
  const [document, setDocument] = useState<DocumentPreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDiffView, setShowDiffView] = useState(false);
  const [cleanupData, setCleanupData] = useState<{
    originalText: string;
    cleanedText: string;
    fileName: string;
  } | null>(null);
  const [isProcessingCleanup, setIsProcessingCleanup] = useState(false);
  const [isApplyingCleanup, setIsApplyingCleanup] = useState(false);
  
  // Section navigation state
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Helper function to highlight search terms
  const highlightSearchTerms = (content: string, query: string) => {
    if (!query.trim()) return content;
    
    const words = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    let highlightedContent = content;
    
    words.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi');
      highlightedContent = highlightedContent.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
    });
    
    return <span dangerouslySetInnerHTML={{ __html: highlightedContent }} />;
  };

  useEffect(() => {
    if (isOpen && fileId) {
      fetchDocumentPreview();
    }
  }, [isOpen, fileId, organizationId]);

  const handleAICleanup = async () => {
    if (!document) return;
    
    try {
      setIsProcessingCleanup(true);
      console.log(`🤖 Starting AI cleanup for ${document.filename}`);
      
      const response = await fetch(`/api/documents/${fileId}/cleanup?organizationId=${organizationId}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cleanup text');
      }
      
      const result = await response.json();
      
      setCleanupData({
        originalText: result.data.originalText,
        cleanedText: result.data.cleanedText,
        fileName: result.data.fileName,
      });
      setShowDiffView(true);
      
      console.log(`✅ AI cleanup completed for ${document.filename}`);
      
    } catch (error) {
      console.error('AI Cleanup failed:', error);
      alert(`Failed to cleanup text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessingCleanup(false);
    }
  };

  const handleAcceptCleanup = async () => {
    console.log(`🔴 Frontend: handleAcceptCleanup called, cleanupData:`, cleanupData ? 'exists' : 'null');
    
    if (!cleanupData) {
      console.log(`🔴 Frontend: No cleanup data, aborting`);
      return;
    }
    
    try {
      setIsApplyingCleanup(true);
      console.log(`💾 Frontend: Applying AI cleanup changes for ${cleanupData.fileName}`);
      console.log(`🔴 Frontend: Making API call to /api/documents/${fileId}/apply-cleanup?organizationId=${organizationId}`);
      console.log(`🔴 Frontend: cleanedText length:`, cleanupData.cleanedText.length);
      
      // Apply the cleaned text to the database
      const response = await fetch(`/api/documents/${fileId}/apply-cleanup?organizationId=${organizationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cleanedText: cleanupData.cleanedText,
        }),
      });
      
      console.log(`🔴 Frontend: API response status:`, response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to apply cleanup');
      }
      
      const result = await response.json();
      console.log(`✅ AI cleanup applied: ${result.data.chunksCreated} new chunks created`);
      
      setShowDiffView(false);
      setCleanupData(null);
      
      // Refresh the document to show updated content
      await fetchDocumentPreview();
      
      console.log(`✅ AI cleanup changes applied for ${cleanupData.fileName}`);
      
    } catch (error) {
      console.error('Failed to apply cleanup:', error);
      alert(`Failed to apply changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsApplyingCleanup(false);
    }
  };

  const handleRejectCleanup = () => {
    setShowDiffView(false);
    setCleanupData(null);
  };

  const fetchDocumentPreview = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`📖 DocumentPreview: Fetching preview for ${fileId}`);
      
      const response = await fetch(`/api/documents/${fileId}/preview?organizationId=${organizationId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load document preview');
      }
      
      const previewData = await response.json();
      setDocument(previewData);
      
      console.log(`✅ DocumentPreview: Preview loaded for ${fileId}`, previewData);
    } catch (err) {
      console.error('Error fetching document preview:', err);
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string): string => {
    switch (fileType.toLowerCase()) {
      case 'pdf': return '📄';
      case 'docx': return '📝';
      case 'txt': return '📄';
      case 'html': return '🌐';
      case 'md': return '📋';
      default: return '📄';
    }
  };

  // Get current section to display
  const currentSection = selectedSection && document?.sections
    ? document.sections.find(s => s.id === selectedSection)
    : null;

  // Filter sections based on search
  const filteredSections = document?.sections?.filter(section =>
    !searchTerm || 
    section.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.content.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Helper function to format content with search term highlighting
  const formatContentWithHighlights = (content: string, fileType: string, query: string): React.ReactNode => {
    if (!content) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>No content available for preview</p>
          <p className="text-sm mt-2">The document may not have been processed yet or contains no extractable text.</p>
        </div>
      );
    }

    // Highlight search terms in the content
    const words = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    let highlightedContent = content;
    
    words.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi');
      highlightedContent = highlightedContent.replace(regex, '**🔍$1🔍**');
    });

    return (
      <div className="prose prose-lg max-w-none text-gray-800">
        <ReactMarkdown
          components={{
            h1: ({children}) => (
              <h1 className="text-2xl font-bold mt-8 mb-6 text-gray-900 border-b border-gray-200 pb-3">
                {children}
              </h1>
            ),
            h2: ({children}) => (
              <h2 className="text-xl font-semibold mt-7 mb-4 text-gray-900">
                {children}
              </h2>
            ),
            h3: ({children}) => (
              <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-900">
                {children}
              </h3>
            ),
            h4: ({children}) => (
              <h4 className="text-base font-semibold mt-5 mb-2 text-gray-900">
                {children}
              </h4>
            ),
            p: ({children}) => (
              <p className="mb-4 text-gray-800 leading-relaxed text-base">
                {typeof children === 'string' 
                  ? children.split(/(\*\*🔍.*?🔍\*\*)/).map((part, i) => 
                      part.match(/\*\*🔍.*?🔍\*\*/) 
                        ? <mark key={i} className="bg-yellow-200 px-1 rounded font-medium">{part.replace(/\*\*🔍|🔍\*\*/g, '')}</mark>
                        : part
                    )
                  : children
                }
              </p>
            ),
            ul: ({children}) => (
              <ul className="list-disc ml-6 mb-4 space-y-2">
                {children}
              </ul>
            ),
            ol: ({children}) => (
              <ol className="list-decimal ml-6 mb-4 space-y-2">
                {children}
              </ol>
            ),
            li: ({children}) => (
              <li className="text-gray-800 leading-relaxed">
                {children}
              </li>
            ),
            strong: ({children}) => {
              if (typeof children === 'string' && children.includes('🔍')) {
                return <mark className="bg-yellow-200 px-1 rounded font-bold">{children.replace(/🔍/g, '')}</mark>;
              }
              return <strong className="font-semibold text-gray-900">{children}</strong>;
            },
            em: ({children}) => <em className="italic text-gray-700">{children}</em>,
            blockquote: ({children}) => (
              <blockquote className="border-l-4 border-blue-300 pl-6 my-6 italic text-gray-700 bg-blue-50 py-4 rounded-r">
                {children}
              </blockquote>
            ),
            code: ({children}) => (
              <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800 border">
                {children}
              </code>
            ),
            pre: ({children}) => (
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono my-4 border">
                {children}
              </pre>
            ),
            table: ({children}) => (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-gray-300">
                  {children}
                </table>
              </div>
            ),
            th: ({children}) => (
              <th className="border border-gray-300 bg-gray-100 px-4 py-2 text-left font-semibold text-gray-900">
                {children}
              </th>
            ),
            td: ({children}) => (
              <td className="border border-gray-300 px-4 py-2 text-gray-800">
                {children}
              </td>
            ),
            hr: () => <hr className="border-t border-gray-300 my-8" />,
          }}
        >
          {highlightedContent}
        </ReactMarkdown>
      </div>
    );
  };

  const handleDownload = () => {
    if (document?.downloadUrl) {
      console.log(`📥 DocumentPreview: Downloading file from ${document.downloadUrl}`);
      window.open(document.downloadUrl, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
      <div className="flex h-full">
        {/* Sidebar - Table of Contents */}
        {document?.sections && document.sections.length > 0 && (
          <div className="w-80 bg-white border-r shadow-sm overflow-hidden flex flex-col">
            {/* Sidebar Header */}
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
                {document?.filename}
              </h3>
              <p className="text-sm text-gray-500">{document?.filename}</p>
              
              {/* Search */}
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Search sections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
              ) : searchTerm ? (
                <div className="p-4 text-center text-gray-500">
                  <p className="text-sm">No sections match your search</p>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Document Header */}
          <div className="bg-white border-b p-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                {!document?.sections?.length && (
                  <button
                    onClick={onClose}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-3"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Documents
                  </button>
                )}
              </div>
              
              <div className="flex space-x-2">
                {/* AI Cleanup Button - Show only for PDFs */}
                {document?.fileType.toLowerCase() === 'pdf' && (
                  <button
                    onClick={handleAICleanup}
                    disabled={isProcessingCleanup || !document}
                    className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 transition-colors ${
                      isProcessingCleanup || !document
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
                
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Close preview"
                >
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="mt-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {currentSection?.title || document?.filename}
              </h1>
              {document && (
                <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    {getFileIcon(document.fileType)}
                    <span className="ml-1 uppercase">{document.fileType}</span>
                  </span>
                  <span>{formatFileSize(document.fileSize)}</span>
                  <span>{document.wordCount.toLocaleString()} words</span>
                  <span>{document.chunkCount} chunks</span>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">Loading document preview...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="text-red-500 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Preview Error</h3>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <button
                    onClick={fetchDocumentPreview}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {document && !isLoading && !error && (
              <div className="p-6">
                {/* Search Context Section */}
                {searchContext && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Search Match {searchContext.similarity && `(${Math.round(searchContext.similarity * 100)}% match)`}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Query: "<span className="font-medium">{searchContext.query}</span>"
                      {searchContext.chunkIndex !== undefined && ` • Section ${searchContext.chunkIndex + 1}`}
                    </p>
                    <div className="bg-white p-3 rounded border border-yellow-300">
                      <p className="text-gray-800 whitespace-pre-wrap">
                        {highlightSearchTerms(searchContext.matchingContent, searchContext.query)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Document Content Section */}
                <div className="max-w-4xl mx-auto">
                  {currentSection ? (
                    // Show selected section
                    <div>
                      {searchContext 
                        ? formatContentWithHighlights(currentSection.content, document.fileType, searchContext.query)
                        : formatContentWithHighlights(currentSection.content, document.fileType, searchTerm)
                      }
                      
                      {/* Section Info */}
                      <div className="mt-8 p-4 bg-gray-50 rounded text-sm">
                        <h4 className="font-medium text-gray-900 mb-2">Section Information</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-gray-500">Section ID:</span>
                            <span className="ml-1 text-gray-900">{currentSection.id}</span>
                          </div>
                          {currentSection.level && (
                            <div>
                              <span className="text-gray-500">Level:</span>
                              <span className="ml-1 text-gray-900">{currentSection.level}</span>
                            </div>
                          )}
                          {currentSection.startIndex && (
                            <div>
                              <span className="text-gray-500">Start Position:</span>
                              <span className="ml-1 text-gray-900">{currentSection.startIndex}</span>
                            </div>
                          )}
                          {currentSection.endIndex && (
                            <div>
                              <span className="text-gray-500">End Position:</span>
                              <span className="ml-1 text-gray-900">{currentSection.endIndex}</span>
                            </div>
                          )}
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
                      {searchContext 
                        ? formatContentWithHighlights(document.content, document.fileType, searchContext.query)
                        : formatContentWithHighlights(document.content, document.fileType, searchTerm)
                      }
                      
                      {/* Document Stats */}
                      <div className="mt-8 p-4 bg-gray-50 rounded text-sm">
                        <h4 className="font-medium text-gray-900 mb-2">Document Statistics</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-gray-500">Characters:</span>
                            <span className="ml-1 text-gray-900">{document.content.length.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Words:</span>
                            <span className="ml-1 text-gray-900">
                              {document.wordCount.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Sections:</span>
                            <span className="ml-1 text-gray-900">{document.sections?.length || 0}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Uploaded:</span>
                            <span className="ml-1 text-gray-900">
                              {new Date(document.uploadedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {document && !isLoading && !error && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Uploaded on {new Date(document.uploadedAt).toLocaleDateString()} at {new Date(document.uploadedAt).toLocaleTimeString()}
              </div>
              <div className="flex space-x-2">
                {document.downloadUrl && (
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    title="Download original file"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
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

export default DocumentPreview; 
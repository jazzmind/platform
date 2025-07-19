'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

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

  const formatContent = (content: string, fileType: string): React.ReactNode => {
    if (!content) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>No content available for preview</p>
          <p className="text-sm mt-2">The document may not have been processed yet or contains no extractable text.</p>
        </div>
      );
    }

    // Render content as markdown for better formatting
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
                {children}
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
            strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
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
            // Handle line breaks explicitly
            br: () => <br />,
          }}
        >
          {content}
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{document ? getFileIcon(document.fileType) : '📄'}</span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {document ? document.filename : 'Loading...'}
              </h2>
              {document && (
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                  <span className="uppercase">{document.fileType}</span>
                  <span>{formatFileSize(document.fileSize)}</span>
                  <span>{document.wordCount.toLocaleString()} words</span>
                  <span>{document.chunkCount} chunks</span>
                </div>
              )}
            </div>
          </div>
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

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-scroll">
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
            <div className="flex-1">
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

                {/* Document Preview Section */}
                <div className="mb-4">
                  {searchContext 
                    ? formatContentWithHighlights(document.content, document.fileType, searchContext.query)
                    : formatContent(document.content, document.fileType)
                  }   
                </div>
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
  );
}

export default DocumentPreview; 
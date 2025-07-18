'use client';

import React, { useState, useEffect } from 'react';
import type { FileMetadata } from '../lib/types';

interface DocumentListProps {
  entityType: string;
  entityId: string;
  organizationId: string;
  refreshKey?: number;
  className?: string;
  onDocumentSelect?: (fileId: string) => void;
  onDocumentDelete?: (fileId: string) => void;
}

interface DocumentItem {
  fileId: string;
  metadata: FileMetadata;
  uploadedAt: Date;
}

export function DocumentList({
  entityType,
  entityId,
  organizationId,
  refreshKey = 0,
  className = '',
  onDocumentSelect,
  onDocumentDelete,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load documents from API
  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `/api/documents?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}&organizationId=${encodeURIComponent(organizationId)}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || errorData.error || 'Failed to load documents');
        }

        const data = await response.json();
        
        // Convert API response to DocumentItem format
        const documentItems: DocumentItem[] = (data.documents || []).map((doc: any) => ({
          fileId: doc.fileId,
          metadata: doc.metadata,
          uploadedAt: new Date(doc.uploadedAt || doc.metadata.uploadedAt),
        }));
        
        setDocuments(documentItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load documents');
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, [entityType, entityId, organizationId, refreshKey]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string): string => {
    switch (fileType) {
      case 'pdf': return '📄';
      case 'docx': return '📝';
      case 'txt': return '📃';
      case 'html': return '🌐';
      case 'md': return '📋';
      default: return '📄';
    }
  };

  const handleDelete = (fileId: string, filename: string) => {
    if (window.confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.fileId !== fileId));
      onDocumentDelete?.(fileId);
    }
  };

  if (isLoading) {
    return (
      <div className={`document-list ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <svg className="mx-auto h-8 w-8 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
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
            <p className="mt-2 text-gray-500">Loading documents...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`document-list ${className}`}>
        <div className="text-center py-12">
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

  if (documents.length === 0) {
    return (
      <div className={`document-list ${className}`}>
        <div className="text-center py-12">
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
          <p className="text-gray-500">
            Upload your first document to get started with the knowledge base.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`document-list ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            Documents ({documents.length})
          </h3>
          <div className="text-sm text-gray-500">
            Total size: {formatFileSize(documents.reduce((sum, doc) => sum + doc.metadata.size, 0))}
          </div>
        </div>

        <div className="space-y-3">
          {documents.map((document) => (
            <div
              key={document.fileId}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">
                    {getFileIcon(document.metadata.fileType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => onDocumentSelect?.(document.fileId)}
                      className="text-left group"
                    >
                      <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {document.metadata.filename}
                      </h4>
                    </button>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <span className="uppercase">
                        {document.metadata.fileType}
                      </span>
                      <span>{formatFileSize(document.metadata.size)}</span>
                      <span>
                        Uploaded {document.uploadedAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onDocumentSelect?.(document.fileId)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="View document"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(document.fileId, document.metadata.filename)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete document"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DocumentList; 
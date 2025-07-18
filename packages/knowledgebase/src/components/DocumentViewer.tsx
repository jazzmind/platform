'use client';

import React, { useState, useEffect } from 'react';
import type { DocumentViewerProps, FileMetadata } from '../lib/types';

interface DocumentContent {
  fileId: string;
  metadata: FileMetadata;
  content: string;
  sections?: Array<{
    title: string;
    content: string;
    order: number;
  }>;
}

export function DocumentViewer({
  fileId,
  organizationId,
  onClose,
  showMetadata = true,
  showSections = true,
  enableSearch = true,
  className = '',
}: DocumentViewerProps) {
  const [document, setDocument] = useState<DocumentContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState<number>(0);

  useEffect(() => {
    const loadDocument = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock document content
        const mockContent: DocumentContent = {
          fileId,
          metadata: {
            filename: 'Security Policy v2.1.pdf',
            fileType: 'pdf',
            mimeType: 'application/pdf',
            size: 2458624,
            uploadedAt: '2024-01-15T10:30:00Z',
            organizationId,
          },
          content: `# Security Policy

## 1. Introduction

This document establishes the security policy for our organization. It outlines the requirements and guidelines for protecting our information assets and ensuring compliance with applicable regulations.

## 2. Scope

This policy applies to all employees, contractors, and third parties who have access to our systems and data.

## 3. Information Security Objectives

- Ensure confidentiality of sensitive information
- Maintain integrity of data and systems
- Ensure availability of critical business systems
- Comply with regulatory requirements

## 4. Access Control

### 4.1 User Authentication

All users must authenticate using strong passwords and multi-factor authentication where required.

### 4.2 Authorization

Access to systems and data is granted based on the principle of least privilege.

## 5. Data Protection

### 5.1 Data Classification

All data must be classified according to its sensitivity level:
- Public
- Internal
- Confidential
- Restricted

### 5.2 Data Handling

Data must be handled according to its classification level with appropriate security controls.

## 6. Incident Response

All security incidents must be reported immediately to the security team.

## 7. Compliance

This policy is subject to regular review and must comply with applicable laws and regulations.`,
          sections: [
            {
              title: 'Introduction',
              content: 'This document establishes the security policy for our organization...',
              order: 1,
            },
            {
              title: 'Scope',
              content: 'This policy applies to all employees, contractors, and third parties...',
              order: 2,
            },
            {
              title: 'Information Security Objectives',
              content: 'Ensure confidentiality of sensitive information...',
              order: 3,
            },
            {
              title: 'Access Control',
              content: 'All users must authenticate using strong passwords...',
              order: 4,
            },
            {
              title: 'Data Protection',
              content: 'All data must be classified according to its sensitivity level...',
              order: 5,
            },
            {
              title: 'Incident Response',
              content: 'All security incidents must be reported immediately...',
              order: 6,
            },
            {
              title: 'Compliance',
              content: 'This policy is subject to regular review...',
              order: 7,
            },
          ],
        };
        
        setDocument(mockContent);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setIsLoading(false);
      }
    };

    if (fileId) {
      loadDocument();
    }
  }, [fileId, organizationId]);

  const highlightSearchTerm = (text: string, term: string): string => {
    if (!term.trim()) return text;
    
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  };

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

  if (isLoading) {
    return (
      <div className={`document-viewer ${className}`}>
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
            <p className="mt-2 text-gray-500">Loading document...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`document-viewer ${className}`}>
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
    <div className={`document-viewer ${className}`}>
      <div className="bg-white rounded-lg shadow-lg max-w-5xl mx-auto">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">
                {getFileIcon(document.metadata.fileType)}
              </span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {document.metadata.filename}
                </h2>
                {showMetadata && (
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                    <span className="uppercase">
                      {document.metadata.fileType}
                    </span>
                    <span>{formatFileSize(document.metadata.size)}</span>
                    <span>
                      Uploaded {new Date(document.metadata.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Close document"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Search */}
          {enableSearch && (
            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search in document..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex">
          {/* Sections Sidebar */}
          {showSections && document.sections && document.sections.length > 0 && (
            <div className="w-64 border-r border-gray-200 bg-gray-50">
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Sections</h3>
                <nav className="space-y-1">
                  {document.sections.map((section, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveSection(index)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                        activeSection === index
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {section.title}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 p-6">
            <div className="prose max-w-none">
              <div
                dangerouslySetInnerHTML={{
                  __html: highlightSearchTerm(
                    document.content.replace(/\n/g, '<br>'),
                    searchTerm
                  ),
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentViewer; 
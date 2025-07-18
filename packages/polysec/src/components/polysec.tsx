'use client';

import React, { useState } from 'react';
import { DocumentUpload } from './document-upload';
import { DocumentList } from './document-list';
import { DocumentViewer } from './document-viewer';
import type { PolicyDocument } from '../types';

interface PolySecProps {
  className?: string;
}

export default function PolySec({ className = '' }: PolySecProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'documents' | 'viewer'>('upload');
  const [selectedDocument, setSelectedDocument] = useState<PolicyDocument | null>(null);

  const handleDocumentSelect = (document: PolicyDocument) => {
    setSelectedDocument(document);
    setActiveTab('viewer');
  };

  const handleUploadSuccess = () => {
    // Refresh documents list when upload succeeds
    setActiveTab('documents');
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">PolySec</h1>
              <p className="text-gray-600">Security Policy Management System</p>
            </div>
            <div className="text-sm text-gray-500">
              Phase 1: Document Management Foundation
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Upload Documents
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Document Library
            </button>
            {selectedDocument && (
              <button
                onClick={() => setActiveTab('viewer')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'viewer'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Document Viewer
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'upload' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Upload Policy Documents</h2>
              <p className="text-gray-600">
                Upload PDF, DOCX, or TXT files for processing and analysis.
              </p>
            </div>
            <DocumentUpload onUploadSuccess={handleUploadSuccess} />
          </div>
        )}

        {activeTab === 'documents' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Document Library</h2>
              <p className="text-gray-600">
                Manage and view all uploaded policy documents.
              </p>
            </div>
            <DocumentList onDocumentSelect={handleDocumentSelect} />
          </div>
        )}

        {activeTab === 'viewer' && selectedDocument && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Document Viewer</h2>
              <p className="text-gray-600">
                View document content and sections.
              </p>
            </div>
            <DocumentViewer 
              document={selectedDocument} 
              onBack={() => setActiveTab('documents')}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              PolySec v0.1.0 - Phase 1 Implementation
            </div>
            <div className="text-sm text-gray-500">
              Document Management Foundation Complete ✅
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

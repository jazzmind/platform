'use client';

import React, { useState } from 'react';
import { DocumentUpload } from './document-upload';
import { DocumentList } from './document-list';
import { DocumentViewer } from './document-viewer';
import { SecurityQuestionnaire } from './security-questionnaire';
import type { PolicyDocument } from '../types';

interface PolySecProps {
  className?: string;
  organizationId?: string;
}

export default function PolySec({ className = '', organizationId = 'default-org' }: PolySecProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'documents' | 'viewer' | 'questionnaire'>('upload');
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
              <p className="text-gray-600">AI-Powered Security Policy Management System</p>
            </div>
            <div className="text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span>Knowledgebase Connected</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <span>Vector Search Active</span>
                </div>
              </div>
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
              📁 Upload Policies
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📚 Policy Library
            </button>
            <button
              onClick={() => setActiveTab('questionnaire')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'questionnaire'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🔒 Security Questionnaire
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
                👁️ Document Viewer
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
              <h2 className="text-2xl font-bold text-gray-900">Upload Security Policy Documents</h2>
              <p className="text-gray-600">
                Upload PDF, DOCX, or TXT files for AI-powered processing and semantic search.
              </p>
            </div>
            <DocumentUpload onUploadSuccess={handleUploadSuccess} />
          </div>
        )}

        {activeTab === 'documents' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Security Policy Library</h2>
              <p className="text-gray-600">
                Manage and search through all uploaded security policy documents with AI-powered search.
              </p>
            </div>
            <DocumentList onDocumentSelect={handleDocumentSelect} />
          </div>
        )}

        {activeTab === 'questionnaire' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">AI Security Questionnaire</h2>
              <p className="text-gray-600">
                Get instant answers to compliance questions based on your uploaded policy documents. 
                Supports SOC 2, ISO 27001, PCI DSS, and custom security frameworks.
              </p>
            </div>
            <SecurityQuestionnaire organizationId={organizationId} />
          </div>
        )}

        {activeTab === 'viewer' && selectedDocument && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Policy Document Viewer</h2>
              <p className="text-gray-600">
                View document content and sections with AI-powered analysis.
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
              PolySec v1.0.0 - AI-Powered Security Policy Management
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <span className="text-green-600 mr-1">✅</span>
                Knowledgebase Integration Active
              </div>
              <div className="flex items-center">
                <span className="text-blue-600 mr-1">🧠</span>
                AI Question Answering Ready
              </div>
              <div className="flex items-center">
                <span className="text-purple-600 mr-1">🔍</span>
                Semantic Search Enabled
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

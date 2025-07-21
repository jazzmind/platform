'use client';

import React, { useState } from 'react';
import { DocumentUpload } from '../../../knowledgebase/src/components/DocumentUpload';
import { DocumentList } from '../../../knowledgebase/src/components/DocumentList';
import { DocumentViewer } from '../../../knowledgebase/src/components/DocumentViewer';
import { Compliance } from './compliance';
import type { ProcessingResult } from '../../../knowledgebase/src/lib/types';
import Ask from './ask';

interface PolySecProps {
  organizationId?: string;
}

export default function PolySec({ organizationId = 'default-org' }: PolySecProps) {
  const [activeTab, setActiveTab] = useState('ask');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const tabs = [
    { id: 'ask', label: 'Ask Questions', icon: '🤖' },
    { id: 'compliance', label: 'Check Compliance', icon: '🔒' },
    { id: 'library', label: 'Document Library', icon: '📚' },
    { id: 'upload', label: 'Document Upload', icon: '📤' },
  ];

  const handleUploadComplete = (result: ProcessingResult) => {
    console.log('Upload completed:', result);
    setRefreshTrigger(prev => prev + 1);
    setActiveTab('library');
  };

  const handleDocumentSelect = (fileId: string) => {
    console.log('Document selected:', fileId);
    setSelectedFileId(fileId);
  };

  const handleBackToLibrary = () => {
    setSelectedFileId(null);
    setActiveTab('library');
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
      
      console.log(`🗑️ PolySec: Document ${fileId} deleted, refreshing list`);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">PolySec</h1>
              <p className="text-gray-600 mt-1">AI-Powered Security Policy Management</p>
            </div>
            <div className="text-sm text-gray-500">
              Organization: {organizationId}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      {selectedFileId ? (
        // Document Viewer Mode
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-4">
              <button
                onClick={handleBackToLibrary}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <span>←</span>
                Back to Library
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Tab Navigation
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedFileId ? (
          // Document Viewer
          <DocumentViewer
            fileId={selectedFileId}
            organizationId={organizationId}
            onClose={handleBackToLibrary}
            onDelete={handleDocumentDelete}
            enableAICleanup={true}
          />
        ) : (
          <>
            {activeTab === 'upload' && (
              <div>
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Upload Policy Documents
                  </h2>
                  <p className="text-gray-600">
                    Upload your security policies, procedures, and documentation. 
                    Supported formats: PDF, DOCX, TXT, HTML, MD
                  </p>
                </div>
                <DocumentUpload
                  entityType="polysec"
                  entityId="default-polysec"
                  organizationId={organizationId}
                  onUploadComplete={handleUploadComplete}
                  maxFileSize={100 * 1024 * 1024} // 100MB
                  allowedFileTypes={['pdf', 'docx', 'txt', 'html', 'md']}
                  className="bg-white rounded-lg border border-gray-200 p-6"
                />
              </div>
            )}

            {activeTab === 'library' && (
              <div>
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Document Library
                  </h2>
                  <p className="text-gray-600">
                    Browse and manage your uploaded policy documents with AI-powered search
                  </p>
                </div>
                <DocumentList
                  entityType="polysec"
                  entityId="default-polysec"
                  organizationId={organizationId}
                  refreshKey={refreshTrigger}
                  onDocumentSelect={handleDocumentSelect}
                  onDocumentDelete={handleDocumentDelete}
                  enableSearch={true}
                  enableFilters={true}
                  className=""
                />
              </div>
            )}

            {activeTab === 'compliance' && (
              <div>
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    AI Compliance Checker
                  </h2>
                  <p className="text-gray-600">
                    Ask security questions and get AI-powered answers based on your policy documents
                  </p>
                </div>
                <Compliance organizationId={organizationId} />
              </div>
            )}

            {activeTab === 'ask' && (
              <div>
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Ask Questions
                  </h2>
                  <p className="text-gray-600">
                    Process multiple security questions at once with AI-powered analysis and verification workflow
                  </p>
                </div>
                <Ask organizationId={organizationId} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

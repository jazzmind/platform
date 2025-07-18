'use client';

import React, { useState, useCallback } from 'react';
import type { DocumentUploadProps, ProcessingResult } from '../lib/types';

export function DocumentUpload({
  entityType,
  entityId,
  organizationId,
  onUploadStart,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  maxFileSize = 100 * 1024 * 1024,
  allowedFileTypes = ['pdf', 'docx', 'txt', 'html', 'md'],
  className = '',
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file
    if (file.size > maxFileSize) {
      const error = `File size exceeds maximum allowed size of ${Math.round(maxFileSize / (1024 * 1024))}MB`;
      onUploadError?.(error);
      return;
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension && !allowedFileTypes.includes(fileExtension as any)) {
      const error = `File type .${fileExtension} is not allowed. Allowed types: ${allowedFileTypes.join(', ')}`;
      onUploadError?.(error);
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      formData.append('organizationId', organizationId);

      onUploadStart?.(file.name);

      // Start upload progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const next = prev + Math.random() * 15;
          if (next >= 90) {
            clearInterval(progressInterval);
            return 90; // Leave some room for completion
          }
          return next;
        });
      }, 300);

      // Make API call
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      setUploadProgress(100);
      
      // Convert API response to ProcessingResult format
      const processingResult: ProcessingResult = {
        success: result.success || true,
        fileId: result.fileId || file.name,
        processingId: result.processingId || `proc_${Date.now()}`,
        documentsProcessed: 1,
        chunksCreated: 0, // Will be updated during processing
        embeddingsGenerated: 0, // Will be updated during processing
        sectionsIdentified: 0, // Will be updated during processing
        processingTime: result.estimatedProcessingTime || 0,
      };

      onUploadComplete?.(processingResult);
      setIsUploading(false);
      setUploadProgress(0);

    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      onUploadError?.(error instanceof Error ? error.message : 'Upload failed');
    }
  }, [entityType, entityId, organizationId, maxFileSize, allowedFileTypes, onUploadStart, onUploadComplete, onUploadError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  return (
    <div className={`document-upload ${className}`}>
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : isUploading
            ? 'border-gray-300 bg-gray-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="space-y-4">
            <div className="text-blue-600">
              <svg className="mx-auto h-12 w-12 animate-spin" fill="none" viewBox="0 0 24 24">
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
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">Processing document...</p>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {Math.round(uploadProgress)}% complete
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-gray-400">
              <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                {isDragging ? 'Drop your file here' : 'Upload documents'}
              </p>
              <p className="text-gray-500">
                Drag and drop your files here, or{' '}
                <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
                  browse
                  <input
                    type="file"
                    className="hidden"
                    accept={allowedFileTypes.map(type => `.${type}`).join(',')}
                    onChange={(e) => handleFileSelect(e.target.files)}
                    disabled={isUploading}
                  />
                </label>
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Supported: {allowedFileTypes.join(', ').toUpperCase()} • Max size: {Math.round(maxFileSize / (1024 * 1024))}MB
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentUpload; 
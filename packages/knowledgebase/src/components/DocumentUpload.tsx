'use client';

import React, { useState, useCallback, useRef } from 'react';
import type { DocumentUploadProps, ProcessingResult } from '../lib/types';

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  message?: string;
  documentId?: string;
}

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
  uploadEndpoint = '/api/documents/upload',
  enableMultiple = true,
  showRequirements = true,
}: DocumentUploadProps & {
  uploadEndpoint?: string;
  enableMultiple?: boolean;
  showRequirements?: boolean;
}) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, title?: string, version?: string): Promise<string> => {
    // Add to uploads list
    setUploads(prev => [...prev, {
      file,
      progress: 0,
      status: 'uploading'
    }]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      formData.append('organizationId', organizationId);
      if (title) formData.append('title', title);
      if (version) formData.append('version', version);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploads(prev => prev.map(upload => 
          upload.file === file && upload.progress < 90
            ? { ...upload, progress: upload.progress + Math.random() * 15 }
            : upload
        ));
      }, 200);

      // Call upload start callback
      onUploadStart?.(file.name);

      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Upload failed');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update upload status to completed
      setUploads(prev => prev.map(upload => 
        upload.file === file 
          ? { 
              ...upload, 
              progress: 100, 
              status: 'completed',
              message: 'Upload completed successfully',
              documentId: result.fileId || result.data?.id
            }
          : upload
      ));

      // Call progress callback
      onUploadProgress?.({
        stage: 'completing',
        current: 100,
        total: 100,
        message: 'Upload completed successfully',
        percentage: 100,
      });

      return result.fileId || result.data?.id || file.name;

    } catch (error) {
      setUploads(prev => prev.map(upload => 
        upload.file === file 
          ? { 
              ...upload, 
              status: 'error',
              message: error instanceof Error ? error.message : 'Upload failed'
            }
          : upload
      ));
      throw error;
    }
  };

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || isUploading) {
      return;
    }
    
    console.log(`📁 File Upload: Selected ${files.length} files`);
    setIsUploading(true);
    
    try {
      let successCount = 0;
      const processedResults: ProcessingResult[] = [];
      
      // Upload files sequentially to avoid overwhelming the server
      for (const file of Array.from(files)) {
        // Validate file
        if (file.size > maxFileSize) {
          const error = `File ${file.name} exceeds maximum size of ${Math.round(maxFileSize / (1024 * 1024))}MB`;
          onUploadError?.(error);
          setUploads(prev => [...prev, {
            file,
            progress: 0,
            status: 'error',
            message: error
          }]);
          continue;
        }

        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        if (fileExtension && !allowedFileTypes.includes(fileExtension as any)) {
          const error = `File type .${fileExtension} is not allowed. Allowed types: ${allowedFileTypes.join(', ')}`;
          onUploadError?.(error);
          setUploads(prev => [...prev, {
            file,
            progress: 0,
            status: 'error',
            message: error
          }]);
          continue;
        }

        try {
          const documentId = await uploadFile(file);
          successCount++;
          
          // Convert to ProcessingResult format
          const processingResult: ProcessingResult = {
            success: true,
            fileId: documentId,
            processingId: `proc_${Date.now()}`,
            documentsProcessed: 1,
            chunksCreated: 0, // Will be updated during processing
            embeddingsGenerated: 0, // Will be updated during processing
            sectionsIdentified: 0, // Will be updated during processing
            processingTime: 0,
          };
          
          processedResults.push(processingResult);
          console.log(`✅ File Upload: Successfully uploaded ${file.name}`);
        } catch (error) {
          console.error(`❌ File Upload: Failed to upload ${file.name}:`, error);
          onUploadError?.(error instanceof Error ? error.message : 'Upload failed');
        }
      }
      
      // Call completion callback for successful uploads
      if (successCount > 0) {
        console.log(`🎉 File Upload: ${successCount} files uploaded successfully`);
        // Call success callback for each successful upload
        processedResults.forEach(result => {
          onUploadComplete?.(result);
        });
      }
      
    } finally {
      setIsUploading(false);
      
      // Reset file input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [maxFileSize, allowedFileTypes, onUploadStart, onUploadComplete, onUploadError, isUploading]);

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

  const handleUploadClick = (event?: React.MouseEvent) => {
    if (isUploading) {
      console.log('🚫 File Upload: Upload in progress, ignoring click');
      return;
    }
    
    console.log('📂 File Upload: Opening file dialog');
    fileInputRef.current?.click();
  };

  const handleButtonClick = (event: React.MouseEvent) => {
    // Only prevent default for button clicks to avoid form submission
    event.preventDefault();
    event.stopPropagation();
    handleUploadClick();
  };

  const clearUploads = () => {
    setUploads([]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={`document-upload space-y-6 ${className}`}>
      {/* Upload Area */}
      <div
        onClick={handleUploadClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragging
            ? 'border-blue-400 bg-blue-50'
            : isUploading 
            ? 'border-gray-300 bg-gray-100 cursor-not-allowed' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedFileTypes.map(type => `.${type}`).join(',')}
          multiple={enableMultiple}
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={isUploading}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
            isUploading ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            {isUploading ? (
              <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
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
            ) : (
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {isUploading 
                ? 'Processing Files...' 
                : isDragging 
                ? 'Drop files here' 
                : 'Upload Documents'
              }
            </h3>
            <p className="text-gray-600">
              {isUploading 
                ? 'Please wait while your documents are being processed'
                : isDragging
                ? 'Release to upload your files'
                : enableMultiple
                ? 'Drag and drop files here, or click to select'
                : 'Drag and drop a file here, or click to select'
              }
            </p>
            
            {!isUploading && !isDragging && (
              <button 
                type="button"
                onClick={handleButtonClick}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Select Files
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-gray-900">Upload Progress</h4>
              <button
                onClick={clearUploads}
                disabled={isUploading}
                className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {uploads.map((upload, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {upload.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(upload.file.size)}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {upload.status === 'completed' && (
                      <div className="flex items-center text-green-600">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-medium">Completed</span>
                      </div>
                    )}
                    
                    {upload.status === 'error' && (
                      <div className="flex items-center text-red-600">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-medium">Error</span>
                      </div>
                    )}
                    
                    {upload.status === 'uploading' && (
                      <div className="flex items-center text-blue-600">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                        <span className="text-xs font-medium">{Math.round(upload.progress)}%</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Progress Bar */}
                {upload.status === 'uploading' && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
                
                {/* Status Message */}
                {upload.message && (
                  <p className={`text-xs mt-2 ${
                    upload.status === 'error' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {upload.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Requirements */}
      {showRequirements && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">File Requirements</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Supported formats: {allowedFileTypes.join(', ').toUpperCase()}</li>
            <li>• Maximum file size: {Math.round(maxFileSize / (1024 * 1024))}MB</li>
            <li>• Files will be processed automatically after upload</li>
            <li>• AI extraction and indexing may take a few moments for large files</li>
            {enableMultiple && <li>• Multiple files can be uploaded simultaneously</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

export default DocumentUpload; 
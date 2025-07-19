'use client';

import React, { useState, useCallback, useRef } from 'react';

interface DocumentUploadProps {
  onUploadSuccess: () => void;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  message?: string;
  documentId?: string;
}

export function DocumentUpload({ onUploadSuccess }: DocumentUploadProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (file: File, title?: string, version?: string) => {
    // Add to uploads list
    setUploads(prev => [...prev, {
      file,
      progress: 0,
      status: 'uploading'
    }]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (title) formData.append('title', title);
      if (version) formData.append('version', version);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploads(prev => prev.map(upload => 
          upload.file === file && upload.progress < 90
            ? { ...upload, progress: upload.progress + 10 }
            : upload
        ));
      }, 200);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
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
              documentId: result.data.id
            }
          : upload
      ));

      return result.data.id;

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || isUploading) {
      return;
    }
    
    console.log(`📁 File Upload: Selected ${files.length} files`);
    setIsUploading(true);
    
    try {
      let successCount = 0;
      
      // Upload files sequentially to avoid overwhelming the server
      for (const file of Array.from(files)) {
        try {
          await uploadFile(file);
          successCount++;
          console.log(`✅ File Upload: Successfully uploaded ${file.name}`);
        } catch (error) {
          console.error(`❌ File Upload: Failed to upload ${file.name}:`, error);
        }
      }
      
      // Only call onUploadSuccess if at least one file was uploaded successfully
      if (successCount > 0) {
        console.log(`🎉 File Upload: ${successCount} files uploaded successfully`);
        // Call success callback after a short delay to let UI update
        setTimeout(() => {
          onUploadSuccess();
        }, 500);
      }
      
    } finally {
      setIsUploading(false);
      
      // Reset file input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        onClick={handleUploadClick}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isUploading 
            ? 'border-gray-300 bg-gray-100 cursor-not-allowed' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          multiple
          onChange={handleFileSelect}
          disabled={isUploading}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {isUploading ? 'Processing Files...' : 'Upload Security Policy Documents'}
            </h3>
            <p className="text-gray-600">
              {isUploading 
                ? 'Please wait while your documents are being processed'
                : 'Click to select PDF, DOCX, or TXT files'
              }
            </p>
            
            {!isUploading && (
              <button 
                type="button"
                onClick={handleButtonClick}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
        <div className="bg-white border rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-gray-900">Upload Progress</h4>
              <button
                onClick={clearUploads}
                disabled={isUploading}
                className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                Clear All
              </button>
            </div>
          </div>
          
          <div className="divide-y">
            {uploads.map((upload, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {upload.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(upload.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {upload.status === 'completed' && (
                      <div className="flex items-center text-green-600">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs">Completed</span>
                      </div>
                    )}
                    
                    {upload.status === 'error' && (
                      <div className="flex items-center text-red-600">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs">Error</span>
                      </div>
                    )}
                    
                    {upload.status === 'uploading' && (
                      <div className="text-blue-600">
                        <span className="text-xs">{upload.progress}%</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Progress Bar */}
                {upload.status === 'uploading' && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">File Requirements</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Supported formats: PDF, DOCX, TXT</li>
          <li>• Maximum file size: 100MB</li>
          <li>• Files will be processed automatically after upload</li>
          <li>• AI extraction and indexing may take a few moments for large files</li>
        </ul>
      </div>
    </div>
  );
} 
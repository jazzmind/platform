'use client';

import React from 'react';

interface TextDiffViewerProps {
  originalText: string;
  cleanedText: string;
  fileName?: string;
  onAccept: () => void;
  onReject: () => void;
  isApplying?: boolean;
  className?: string;
}

export function TextDiffViewer({
  originalText = '',
  cleanedText = '',
  fileName,
  onAccept,
  onReject,
  isApplying = false,
  className = '',
}: TextDiffViewerProps) {
  const originalLength = originalText.length;
  const cleanedLength = cleanedText.length;
  const lengthDiff = cleanedLength - originalLength;

  return (
    <div className={`text-diff-viewer ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              🤖 AI Text Cleanup Results
            </h3>
            <p className="text-sm text-gray-600">
              {fileName && `${fileName} • `}
              Original: {originalLength.toLocaleString()} chars • 
              Cleaned: {cleanedLength.toLocaleString()} chars
              {lengthDiff !== 0 && (
                <span className={`ml-2 ${lengthDiff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ({lengthDiff > 0 ? '+' : ''}{lengthDiff})
                </span>
              )}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onReject}
              disabled={isApplying}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onAccept}
              disabled={isApplying}
              className={`px-4 py-2 text-sm rounded-lg flex items-center gap-2 ${
                isApplying
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isApplying ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Applying...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Apply Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Diff Content */}
      <div className="flex h-100">
        {/* Original Text */}
        <div className="flex-1 border-r border-gray-200">
          <div className="bg-red-50 border-b border-red-200 px-4 py-2">
            <h4 className="text-sm font-medium text-red-800">
              Original Text (with spacing issues)
            </h4>
          </div>
          <div className="p-4 h-full overflow-y-auto bg-red-50/30">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
              {originalText}
            </pre>
          </div>
        </div>

        {/* Cleaned Text */}
        <div className="flex-1">
          <div className="bg-green-50 border-b border-green-200 px-4 py-2">
            <h4 className="text-sm font-medium text-green-800">
              AI-Cleaned Text (fixed spacing)
            </h4>
          </div>
          <div className="p-4 h-full overflow-y-auto bg-green-50/30">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
              {cleanedText}
            </pre>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <span className="w-3 h-3 bg-red-200 rounded mr-2"></span>
              Original with issues
            </span>
            <span className="flex items-center">
              <span className="w-3 h-3 bg-green-200 rounded mr-2"></span>
              AI-cleaned text
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 
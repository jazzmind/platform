"use client";

import React from 'react';

interface PresentationIframeProps {
  src: string;
}

export default function PresentationIframe({ src }: PresentationIframeProps) {
  const [iframeError, setIframeError] = React.useState(false);
  
  return (
    <div className="w-full aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden relative">
      {!iframeError && (
        <iframe 
          src={src}
          className="w-full h-full border-0" 
          title="Presentation"
          allowFullScreen
          onError={() => {
            console.error("Error loading iframe");
            setIframeError(true);
          }}
        ></iframe>
      )}
      
      {iframeError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 bg-opacity-90 p-4">
          <div className="text-center">
            <svg 
              className="w-12 h-12 mx-auto text-red-500 mb-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
            <p className="text-red-600 dark:text-red-400 font-medium">Failed to load the presentation.</p>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Please try the &quot;View in New Window&quot; button above.</p>
          </div>
        </div>
      )}
    </div>
  );
} 
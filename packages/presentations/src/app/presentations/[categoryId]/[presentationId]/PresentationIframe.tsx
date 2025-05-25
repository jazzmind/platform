"use client";

import { useState, useEffect, useRef } from "react";

interface PresentationIframeProps {
  url: string;
  title: string;
}

export default function PresentationIframe({ url, title }: PresentationIframeProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const [iframeHeight, setIframeHeight] = useState("400px");

  const onError = () => {
    console.log("Iframe failed to load");
    setHasError(true);
    setIsLoading(false);
  };

  const onLoad = () => {
    console.log("Iframe loaded successfully");
    setIsLoading(false);
  };

  // Adjust iframe height to fit viewport
  useEffect(() => {
    const updateIframeHeight = () => {
      if (iframeContainerRef.current) {
        // Calculate available height (viewport height minus header and tabs)
        // 180px accounts for header, tabs, and some padding
        const availableHeight = window.innerHeight - 300;
        setIframeHeight(`${Math.max(400, availableHeight)}px`);
      }
    };

    // Set initial height
    updateIframeHeight();
    
    // Update on window resize
    window.addEventListener('resize', updateIframeHeight);
    
    return () => {
      window.removeEventListener('resize', updateIframeHeight);
    };
  }, []);

  // For PDFs, we'll use an iframe with a direct link instead of the object tag
  // This is more compatible across browsers and deployment environments
  return (
    <div ref={iframeContainerRef} className="relative">
      {hasError ? (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-100 dark:bg-gray-700 rounded-lg" style={{ height: iframeHeight }}>
          <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            Unable to load presentation
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The presentation could not be loaded. Please try the &quot;View in New Window&quot; button above.
          </p>
        </div>
      ) : (
        <>
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg z-10" style={{ height: iframeHeight }}>
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600 dark:border-red-400 mb-4"></div>
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                Loading presentation...
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                This may take a few moments
              </p>
            </div>
          )}
          
          <iframe
            src={url}
            title={title}
            className="w-full border-0"
            style={{ height: iframeHeight }}
            onLoad={onLoad}
            onError={onError}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </>
      )}
    </div>
  );
} 
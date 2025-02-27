"use client";

import React from 'react';

interface PresentationIframeProps {
  url: string;
  title: string;
}

export default function PresentationIframe({ url, title }: PresentationIframeProps) {
  const [iframeError, setIframeError] = React.useState(false);
  
  return (
    <div className="w-full aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
      <iframe 
        src={url}
        className="w-full h-full border-0" 
        title={title}
        allowFullScreen
        onError={(e) => {
          console.error("Error loading iframe:", e);
          setIframeError(true);
        }}
      ></iframe>
      {iframeError && (
        <div className="absolute inset-0 flex items-center justify-center text-red-600 bg-gray-100 bg-opacity-90 p-4">
          <p>Failed to load the presentation. Please try the &quot;View Presentation in New Window&quot; button above.</p>
        </div>
      )}
    </div>
  );
} 
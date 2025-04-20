"use client";

import { useState, useEffect } from "react";
import NotesPanel from "./NotesPanel";
import dynamic from "next/dynamic";
import ToggleableChatPanel from "../../../../components/ToggleableChatPanel";
import { askQuestion } from "./actions";

// Dynamically import the DynamicTab component with no SSR
const DynamicTab = dynamic(() => import('./DynamicTab/DynamicTab'), { ssr: false });

// Component to render the iframe
function PresentationIframe({ url, title }: { url: string; title: string }) {
  return (
    <iframe 
      src={url} 
      title={title} 
      className="w-full h-full border-0" 
      allowFullScreen
    />
  );
}

interface TabsContainerProps {
  presentationUrl: string;
  presentationTitle: string;
  categoryId: string;
  presentationId: string;
  hasNotes: boolean;
}

export default function TabsContainer({
  presentationUrl,
  presentationTitle,
  categoryId,
  presentationId,
  hasNotes
}: TabsContainerProps) {
  const [activeTab, setActiveTab] = useState("presentation");
  const [iframeHeight, setIframeHeight] = useState("600px");
  
  // Update iframe height on window resize and initial load
  useEffect(() => {
    const updateHeight = () => {
      // Calculate height based on viewport
      const height = Math.max(window.innerHeight - 250, 400);
      setIframeHeight(`${height}px`);
    };
    
    // Set initial height
    updateHeight();
    
    // Add listener for resize
    window.addEventListener("resize", updateHeight);
    
    // Cleanup
    return () => {
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  // Custom icon for presentation chat
  const presentationChatIcon = (
    <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );

  return (
    <div className="w-full">
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab("presentation")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "presentation" 
                ? "border-red-600 text-red-600 dark:text-red-400 dark:border-red-400" 
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Presentation
          </button>
          
          {hasNotes && (
            <button
              onClick={() => setActiveTab("notes")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "notes" 
                  ? "border-red-600 text-red-600 dark:text-red-400 dark:border-red-400" 
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              Notes
            </button>
          )}
        </div>
        
        <div className="flex items-center">
          <a
            href={presentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center mr-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
          >
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View in New Window
          </a>
          
          {/* Chat toggle button */}
          <div className="px-2">
            <ToggleableChatPanel
              contentType="presentation"
              contentId={categoryId}
              secondaryId={presentationId}
              title="Chat with Presentation"
              icon={presentationChatIcon}
              askQuestion={askQuestion}
            />
          </div>
        </div>
      </div>
      
      <div style={{ height: iframeHeight }}>
        {activeTab === "presentation" && (
          <div className="h-full">
            <PresentationIframe url={presentationUrl} title={presentationTitle} />
          </div>
        )}
        
        {activeTab === "notes" && (
          <div className="h-full overflow-y-auto">
            <NotesPanel categoryId={categoryId} presentationId={presentationId} />
          </div>
        )}
        
        {activeTab === "dynamic" && (
          <div className="h-full">
            <DynamicTab categoryId={categoryId} presentationId={presentationId} />
          </div>
        )}
      </div>
    </div>
  );
} 
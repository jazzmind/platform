"use client";

import { useState, useEffect } from "react";
import PresentationIframe from "./PresentationIframe";
import NotesPanel from "./NotesPanel";
import dynamic from "next/dynamic";

// Dynamically import the DynamicTab component with no SSR
// This is important since it uses browser-only features like speech recognition
const DynamicTab = dynamic(
  () => import('./DynamicTab/DynamicTab'),
  { ssr: false }
);

type Tab = "presentation" | "notes" | "dynamic";

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
  const [activeTab, setActiveTab] = useState<Tab>("presentation");
  const [contentHeight, setContentHeight] = useState("400px");

  // Adjust content height to fit viewport
  useEffect(() => {
    const updateContentHeight = () => {
      // Calculate available height (viewport height minus header and tabs)
      // 180px accounts for header, tabs, and some padding
      const availableHeight = window.innerHeight - 300;
      setContentHeight(`${Math.max(400, availableHeight)}px`);
    };

    // Set initial height
    updateContentHeight();
    
    // Update on window resize
    window.addEventListener('resize', updateContentHeight);
    
    return () => {
      window.removeEventListener('resize', updateContentHeight);
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex space-x-4">
          <TabButton 
            isActive={activeTab === "presentation"} 
            onClick={() => setActiveTab("presentation")}
          >
            Presentation
          </TabButton>
          {hasNotes && (
            <TabButton 
              isActive={activeTab === "notes"} 
              onClick={() => setActiveTab("notes")}
            >
              Notes
            </TabButton>
          )}
          <TabButton 
            isActive={activeTab === "dynamic"} 
            onClick={() => setActiveTab("dynamic")}
          >
            <div className="flex items-center">
              <span className="mr-1">Dynamic</span>
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">New</span>
            </div>
          </TabButton>
        </div>
        <a 
          href={presentationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center text-sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          View in New Window
        </a>
      </div>
      
      {/* Tab content - with controlled height */}
      <div className="overflow-hidden" style={{ height: contentHeight }}>
        {activeTab === "presentation" && (
          <div className="h-full">
            <PresentationIframe url={presentationUrl} title={presentationTitle} />
          </div>
        )}
        
        {activeTab === "notes" && (
          <div className="h-full overflow-auto p-4">
            <NotesPanel categoryId={categoryId} presentationId={presentationId} />
          </div>
        )}

        {activeTab === "dynamic" && (
          <div className="h-full overflow-auto">
            <DynamicTab categoryId={categoryId} presentationId={presentationId} />
          </div>
        )}
      </div>
    </div>
  );
}

// Tab Button Component
function TabButton({ 
  children, 
  isActive,
  onClick
}: { 
  children: React.ReactNode, 
  isActive: boolean,
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
        isActive 
          ? "text-red-600 border-b-2 border-red-600 dark:text-red-400 dark:border-red-400" 
          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
      }`}
    >
      {children}
    </button>
  );
} 
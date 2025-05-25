"use client";

import { useState, useEffect } from "react";
import NotesPanel from "../../../../../../shared/src/components/NotesPanel";
import dynamic from "next/dynamic";
import ToggleableChatPanel from "@sonnenreich/shared/src/components/AIChat/ToggleableAIChatPanel";
import { askQuestion } from "./actions";
import { Laptop, Smartphone, Info } from "lucide-react";

// Dynamically import the presentation components with no SSR
const RealtimePresentationContainer = dynamic(() => import('@/components/RealtimePresentationContainer'), { ssr: false });
const RemoteScreen = dynamic(() => import('@/components/Remote/RemoteScreen'), { ssr: false });
const RemoteController = dynamic(() => import('@/components/Remote/RemoteController'), { ssr: false });

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
  const [prompts, setPrompts] = useState([]);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [remoteMode, setRemoteMode] = useState<"controller" | "screen" | null>(null);
  
  // Load prompts and content for the realtime presentation
  useEffect(() => {
    async function loadPresentationData() {
      try {
        setIsLoading(true);
        // Fetch prompts
        const response = await fetch(`/api/presentations/${categoryId}/${presentationId}/prompts`);
        if (response.ok) {
          const promptsData = await response.json();
          setPrompts(promptsData);
        }
        
        // Fetch content
        const contentResponse = await fetch(`/api/presentations/${categoryId}/${presentationId}/content`);
        if (contentResponse.ok) {
          const contentData = await contentResponse.json();
          setContent(contentData.content || "");
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading presentation data:", error);
        setIsLoading(false);
      }
    }
    
    // Load data when needed for remote modes or dynamic presentation
    if (activeTab === "dynamic" || activeTab === "remote") {
      loadPresentationData();
    }
  }, [activeTab, categoryId, presentationId]);
  
  // Update iframe height on window resize and initial load
  useEffect(() => {
    const updateHeight = () => {
      // Calculate height based on viewport
      //const height = Math.max(window.innerHeight - 250, 400);
      setIframeHeight(`70vh`);
      //  setIframeHeight(`${height}px`);
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

          <button
            onClick={() => setActiveTab("dynamic")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "dynamic" 
                ? "border-red-600 text-red-600 dark:text-red-400 dark:border-red-400" 
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            AI Presentation
          </button>
          
          {/* New Remote option */}
          <button
            onClick={() => setActiveTab("remote")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "remote" 
                ? "border-red-600 text-red-600 dark:text-red-400 dark:border-red-400" 
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Remote Mode
          </button>
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
      
      <div style={{ height: iframeHeight, overflow: 'scroll' }}>
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
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600"></div>
                <p className="ml-4 text-gray-600 dark:text-gray-300">Loading presentation data...</p>
              </div>
            ) : (
              <RealtimePresentationContainer 
                prompts={prompts} 
                referenceContent={content} 
              />
            )}
          </div>
        )}
        
        {activeTab === "remote" && remoteMode === null && (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <h2 className="text-2xl font-bold mb-8 text-gray-800 dark:text-white">Remote Presentation Mode</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">

              {/* Screen Option */}
              <div className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-6 flex flex-col items-center text-center hover:shadow-xl transition-shadow">
                <div className="w-20 h-20 mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <Laptop className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">Screen</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Display this on your main screen or projector to show the presentation.
                </p>
                <button 
                  onClick={() => setRemoteMode("screen")}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Start Screen
                </button>
              </div>

              {/* Controller Option */}
              <div className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-6 flex flex-col items-center text-center hover:shadow-xl transition-shadow">
                <div className="w-20 h-20 mb-4 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <Smartphone className="w-12 h-12 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">Controller</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Use your phone or tablet to control the presentation, see notes, and manage the timer.
                </p>
                <button 
                  onClick={() => setRemoteMode("controller")}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Start Controller
                </button>
              </div>
              

            </div>
            
            <div className="mt-12 text-gray-600 dark:text-gray-400 max-w-2xl text-center">
              <p>
                <Info className="inline h-5 w-5 text-yellow-500 mr-2 align-text-bottom" />
                The Controller and Screen modes will pair automatically using a 4-digit code.
                Start the Screen mode first, then enter the displayed code into your Controller device.
              </p>
            </div>
          </div>
        )}
        
        {activeTab === "remote" && remoteMode === "screen" && (
          <div className="h-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
                <p className="ml-4 text-gray-600 dark:text-gray-300">Loading presentation data...</p>
              </div>
            ) : prompts.length === 0 ? (
              <div className="flex items-center justify-center h-full flex-col">
                <p className="text-gray-600 dark:text-gray-300 text-xl mb-4">No presentation prompts found</p>
                <button 
                  onClick={() => setRemoteMode(null)} 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Go Back
                </button>
              </div>
            ) : (
              <RemoteScreen 
                prompts={prompts} 
                referenceContent={content}
                onExit={() => setRemoteMode(null)}
                categoryId={categoryId}
                presentationId={presentationId}
              />
            )}
          </div>
        )}
        
        {activeTab === "remote" && remoteMode === "controller" && (
          <div className="h-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600"></div>
                <p className="ml-4 text-gray-600 dark:text-gray-300">Loading presentation data...</p>
              </div>
            ) : prompts.length === 0 ? (
              <div className="flex items-center justify-center h-full flex-col">
                <p className="text-gray-600 dark:text-gray-300 text-xl mb-4">No presentation prompts found</p>
                <button 
                  onClick={() => setRemoteMode(null)} 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Go Back
                </button>
              </div>
            ) : (
              <RemoteController 
                prompts={prompts} 
                onExit={() => setRemoteMode(null)}
                presentationId={presentationId}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
} 
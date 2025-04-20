"use client";

import { useState, useEffect } from "react";
import { ChatPanelProps } from "../app/presentations/[categoryId]/[presentationId]/ChatPanel";
import dynamic from 'next/dynamic';

// Dynamically import the ChatPanel to avoid server/client hydration issues
const ChatPanel = dynamic(
  () => import('../app/presentations/[categoryId]/[presentationId]/ChatPanel'),
  { ssr: false }
);

interface ToggleableChatPanelProps extends ChatPanelProps {
  isInitiallyOpen?: boolean;
}

export default function ToggleableChatPanel({
  isInitiallyOpen = false,
  ...chatPanelProps
}: ToggleableChatPanelProps) {
  const [isOpen, setIsOpen] = useState(isInitiallyOpen);
  const [isVisible, setIsVisible] = useState(isInitiallyOpen);

  // Handle transitions properly
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      // Delay hiding the panel until after the transition
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300); // match transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <>
      {/* Chat toggle button - can be positioned in a tab bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 focus:outline-none transition-colors"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d={isOpen 
              ? "M6 18L18 6M6 6l12 12" // X icon when open
              : "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" // Chat icon when closed
            } 
          />
        </svg>
        <span className="ml-2 md:inline hidden">
          {isOpen ? "Close Chat" : "AI Chat"}
        </span>
      </button>

      {/* Chat panel overlay */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sliding chat panel */}
      <div 
        className={`fixed right-0 top-0 bottom-0 w-full md:w-96 bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ display: isVisible || isOpen ? 'block' : 'none' }}
      >
        <div className="h-full">
          {/* Only render the ChatPanel when visible for performance */}
          {(isVisible || isOpen) && <ChatPanel {...chatPanelProps} />}
        </div>
      </div>
    </>
  );
} 
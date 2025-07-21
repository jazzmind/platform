'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import DashboardChatContainer from './DashboardChatContainer';

interface DashboardChatWrapperProps {
  onWidthStateChange?: (state: 'normal' | 'collapsed' | 'fullscreen') => void;
  onWidthChange?: (width: number) => void;
}

export default function DashboardChatWrapper({ onWidthStateChange, onWidthChange }: DashboardChatWrapperProps) {
  // Initialize state based on screen size
  const getInitialState = () => {
    if (typeof window === 'undefined') return 'collapsed';
    
    const width = window.innerWidth;
    if (width >= 1024) return 'normal'; // Desktop and tablet landscape: start open
    return 'collapsed'; // Tablet portrait and mobile: start collapsed
  };

  const [viewState, setViewState] = useState<'normal' | 'collapsed' | 'fullscreen'>(getInitialState);
  const [customWidth, setCustomWidth] = useState<number | null>(null);

  // Initialize custom width on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const width = window.innerWidth;
    let initialWidth: number;
    
    if (width >= 1024) {
      // Desktop and tablet landscape: 50% of screen width
      initialWidth = Math.floor(width * 0.5);
    } else {
      return; // No custom width for smaller screens
    }
    
    if (viewState === 'normal') {
      setCustomWidth(initialWidth);
    }
  }, []); // Only run on mount

  // Handle responsive behavior on window resize
  useEffect(() => {
    const updateStateAndWidth = () => {
      const width = window.innerWidth;
      
      if (width < 1024) {
        // Tablet portrait and mobile: collapse if currently normal
        if (viewState === 'normal') {
          setViewState('collapsed');
        }
             } else {
         // Desktop and tablet landscape: update custom width if in normal state
         // Both use 50% of screen width
         const targetWidth = Math.floor(width * 0.5);

        // Update custom width for desktop and tablet landscape when in normal state
        if (viewState === 'normal') {
          setCustomWidth(targetWidth);
        }
      }
    };

    window.addEventListener('resize', updateStateAndWidth);
    return () => window.removeEventListener('resize', updateStateAndWidth);
  }, [viewState]);

  // Notify parent when width state changes
  useEffect(() => {
    onWidthStateChange?.(viewState);
  }, [viewState]);

  // Notify parent of actual width
  useEffect(() => {
    const getActualWidth = () => {
      const isMobile = window.innerWidth < 1280;
      
      switch (viewState) {
        case 'collapsed':
          return 24; // 6 * 4 = 24px (w-6)
        case 'fullscreen':
          return isMobile ? window.innerWidth : window.innerWidth - 32; // Full width on mobile, minus margin on desktop
        default:
          // Use custom width when available, otherwise default
          return customWidth || 448; // Custom responsive width or default 28rem = 448px
      }
    };
    
    onWidthChange?.(getActualWidth());
    
    // Handle window resize for fullscreen mode
    const handleResize = () => {
      if (viewState === 'fullscreen') {
        const isMobile = window.innerWidth < 1280;
        onWidthChange?.(isMobile ? window.innerWidth : window.innerWidth - 32);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewState, onWidthChange, customWidth]);

  // Get the appropriate width classes based on state
  const getWidthClasses = () => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1280;
    
    switch (viewState) {
      case 'collapsed':
        return 'w-6'; // Just enough for the tab
      case 'fullscreen':
        return isMobile ? 'w-full right-0' : 'w-[calc(100vw-2rem)] right-4';
      default:
        // Use custom width when available, otherwise default
        return customWidth ? '' : 'w-[28rem]'; // Empty string means we'll use inline style
    }
  };

  // Get inline styles for custom width
  const getInlineStyles = () => {
    if (customWidth && viewState === 'normal') {
      return { width: `${customWidth}px` };
    }
    return {};
  };

  return (
    <>
      {/* Collapsed State Tab */}
      {viewState === 'collapsed' && (
        <div 
          className="dashboard-chat-wrapper fixed top-16 right-0 h-[calc(100vh-4rem)] z-10 transition-all duration-300 w-6"
          onClick={() => {
            // On mobile, go directly to fullscreen; on desktop, go to normal
            const isMobile = window.innerWidth < 1280;
            setViewState(isMobile ? 'fullscreen' : 'normal');
          }}
        >
                     <div className="absolute left-0 top-1/2 transform -translate-y-1/2 cursor-pointer">
             <div className="w-6 h-16 bg-gray-300 dark:bg-gray-600 rounded-l-lg shadow-md flex flex-col items-center justify-center hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors">
               <MessageSquare className="w-3 h-3 text-gray-600 dark:text-gray-300 mb-1" />
               <div className="flex flex-col space-y-1">
                 <div className="w-1 h-1 bg-gray-600 dark:bg-gray-300 rounded-full"></div>
                 <div className="w-1 h-1 bg-gray-600 dark:bg-gray-300 rounded-full"></div>
                 <div className="w-1 h-1 bg-gray-600 dark:bg-gray-300 rounded-full"></div>
               </div>
             </div>
           </div>
        </div>
      )}

      {/* Full Chat Panel */}
      {viewState !== 'collapsed' && (
        <div 
          className={`dashboard-chat-wrapper fixed top-16 right-0 h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 z-10 transition-all duration-300 ${getWidthClasses()}`}
          style={getInlineStyles()}
        >
                  <DashboardChatContainer 
          viewState={viewState}
          onViewStateChange={setViewState}
          onWidthChange={(width) => {
            // Update our custom width when dragging
            if (viewState === 'normal') {
              setCustomWidth(width);
            }
            // Also notify parent
            onWidthChange?.(width);
          }}
        />
        </div>
      )}
    </>
  );
} 
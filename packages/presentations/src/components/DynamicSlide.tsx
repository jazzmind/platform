"use client";

import { useState, useEffect, useRef } from 'react';
import { ProcessedContent, CodeBlock } from './types';

interface DynamicSlideProps {
  content: ProcessedContent | null;
  isVisible?: boolean;
  isTransitioning?: boolean;
  transitionDirection?: 'next' | 'previous';
  transitionPhase?: 'out' | 'in';
  voiceTranscript?: string;
  isTranscriptFinal?: boolean;
}

export default function DynamicSlide({ 
  content, 
  isVisible = true, 
  isTransitioning = false, 
  transitionDirection = 'next',
  transitionPhase = 'out',
  voiceTranscript = '',
  isTranscriptFinal = false
}: DynamicSlideProps) {
  const [initialLoad, setInitialLoad] = useState(true);
  const [slideContent, setSlideContent] = useState<ProcessedContent | null>(null);
  const [animatingElements, setAnimatingElements] = useState<{
    new: string[];
    keep: string[];
    remove: string[];
  }>({
    new: [],
    keep: [],
    remove: []
  });
  
  const previousContentRef = useRef<ProcessedContent | null>(null);
  const lastTransitionPhaseRef = useRef<'out' | 'in'>('out');
  
  // Handle content changes with animation
 
  useEffect(() => {
    console.log('DynamicSlide received content update:', content);
    console.log('DynamicSlide visibility:', isVisible);
    console.log('Transition state:', isTransitioning, transitionDirection, transitionPhase);
    
    if (!content) return;
    
    // Handle transitions between slides
    if (isTransitioning) {
      // During the 'in' phase of a transition, we want to update the content
      if (transitionPhase === 'in' && lastTransitionPhaseRef.current === 'out') {
        console.log('Transition phase changed from out to in, updating slide content');
        setSlideContent(content);
        previousContentRef.current = content;
        
        // Reset animation state for the new slide
        setAnimatingElements({
          new: [],
          keep: [],
          remove: []
        });
      }
      
      // Store the current transition phase
      lastTransitionPhaseRef.current = transitionPhase;
      
      // Don't do other content updates during transition
      return;
    }
    
    // Regular content updates (not during transitions)
    // Determine which elements are new, kept, or removed
    const newAnimationState = {
      new: content.animationDirections?.new || [],
      keep: content.animationDirections?.keep || [],
      remove: previousContentRef.current ? (content.animationDirections?.remove || []) : []
    };
    
    // If no animation directions provided, try to infer them
    if (!content.animationDirections && previousContentRef.current) {
      // Compare with previous content and infer changes
      const prev = previousContentRef.current;
      
      // For bullets, check what's new and what's removed
      if (prev.bullets && content.bullets) {
        newAnimationState.new = content.bullets.filter(b => !prev.bullets?.includes(b));
        newAnimationState.keep = content.bullets.filter(b => prev.bullets?.includes(b));
        newAnimationState.remove = prev.bullets?.filter(b => content.bullets && !content.bullets.includes(b)) || [];
      }
      
      // For code blocks, do similar comparison
      if (prev.codeBlocks && content.codeBlocks) {
        const prevCodeStrings = prev.codeBlocks.map(c => 
          typeof c === 'object' ? (c as CodeBlock).code : String(c)
        );
        const currentCodeStrings = content.codeBlocks.map(c => 
          typeof c === 'object' ? (c as CodeBlock).code : String(c)
        );
        
        const newCodes = currentCodeStrings.filter(c => !prevCodeStrings.includes(c));
        const removedCodes = prevCodeStrings.filter(c => !currentCodeStrings.includes(c));
        
        newAnimationState.new = [...newAnimationState.new, ...newCodes];
        newAnimationState.remove = [...newAnimationState.remove, ...removedCodes];
      }
      
      // If title changed, add animation for it
      if (prev.title !== content.title && content.title) {
        newAnimationState.new.push(`title:${content.title}`);
        if (prev.title) {
          newAnimationState.remove.push(`title:${prev.title}`);
        }
      }
    }
    
    if (initialLoad) {
      // First load - no animations needed
      setSlideContent(content);
      previousContentRef.current = content;
      setInitialLoad(false);
    } else if (isVisible) {
      // For incremental updates, we DON'T fade out the entire slide
      // Instead we update immediately and let individual elements animate
      console.log('Applying incremental updates with animation state:', newAnimationState);
      
      // First mark items for removal
      setAnimatingElements({
        new: [],
        keep: newAnimationState.keep,
        remove: newAnimationState.remove
      });
      
      // Short delay before adding new elements to allow removal animations to start
      setTimeout(() => {
        setSlideContent(content);
        previousContentRef.current = content;
        
        // After content update, set animation state for new elements
        setAnimatingElements({
          new: newAnimationState.new,
          keep: newAnimationState.keep,
          remove: []
        });
      }, 100);
    } else {
      // If not visible, just update without animation
      console.log('DynamicSlide updating content without animation (not visible)');
      setSlideContent(content);
      previousContentRef.current = content;
      setAnimatingElements(newAnimationState);
    }
  }, [content, isVisible, initialLoad, isTransitioning, transitionDirection, transitionPhase]);
  
  console.debug('[DynamicSlide] rendering', { slideContent, isVisible, isTransitioning, transitionDirection, transitionPhase });
  if (!slideContent) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          Start speaking to generate slides
        </p>
      </div>
    );
  }
  
  // Check if a string element is a title animation element
  const isTitleElement = (str: string) => str.startsWith('title:');
  const getTitleFromElement = (str: string) => str.substring(6); // remove 'title:' prefix
  
  // Determine slide transition classes
  const getTransitionClasses = () => {
    if (!isTransitioning) return "";
    
    if (transitionPhase === 'out') {
      return transitionDirection === 'next' 
        ? 'animate-slide-out-left'
        : 'animate-slide-out-right';
    } else {
      return transitionDirection === 'next' 
        ? 'animate-slide-in-right'
        : 'animate-slide-in-left';
    }
  };
  
  return (
    <div 
      className={`dynamic-slide h-full bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-lg p-8 transition-opacity duration-500 overflow-hidden opacity-100 ${getTransitionClasses()}`}
    >
      {slideContent.title && (
        <h2 
          className="text-3xl md:text-4xl font-bold mb-6 text-center text-red-400"
          style={{ 
            animation: animatingElements.new.some(item => isTitleElement(item) && getTitleFromElement(item) === slideContent.title) 
              ? 'titleFadeIn 0.8s ease forwards' 
              : 'none'
          }}
        >
          {slideContent.title}
        </h2>
      )}
      
      {slideContent.bullets && slideContent.bullets.length > 0 ? (
        <ul className="space-y-4 mb-6 max-w-3xl mx-auto">
          {slideContent.bullets.map((bullet, index) => {
            const isNew = animatingElements.new.includes(bullet);
            const isRemoved = animatingElements.remove.includes(bullet);
            
            // Don't render elements marked for removal
            if (isRemoved) return null;
            
            return (
              <li 
                key={`bullet-${index}-${bullet.substring(0, 20)}`}
                className="flex items-start"
                style={{ 
                  animationDelay: `${index * 0.15}s`,
                  animation: isNew ? 'slideInRight 0.5s ease forwards' : 'none'
                }}
              >
                <span className="text-red-400 mr-2">•</span>
                <span className="text-xl md:text-2xl">{bullet}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p 
          className="text-xl md:text-2xl mb-6 text-center max-w-3xl mx-auto"
          style={{
            animation: animatingElements.new.includes(slideContent.content) ? 'fadeIn 0.5s ease forwards' : 'none'
          }}
        >
          {slideContent.content}
        </p>
      )}
      
      {slideContent.codeBlocks && slideContent.codeBlocks.length > 0 && (
        <div className="mb-6 space-y-4">
          {slideContent.codeBlocks.map((codeBlock, index) => {
            // Check if code is an object (with language and code properties) or just a string
            const codeContent = typeof codeBlock === 'object' && codeBlock !== null 
              ? ((codeBlock as CodeBlock).code || JSON.stringify(codeBlock))
              : String(codeBlock);
            
            const isNew = animatingElements.new.includes(codeContent);
            const isRemoved = animatingElements.remove.includes(codeContent);
            
            // Don't render elements marked for removal
            if (isRemoved) return null;
            
            return (
              <pre 
                key={`code-${index}-${codeContent.substring(0, 20)}`}
                className="bg-gray-800 p-4 rounded-lg overflow-auto text-sm text-gray-300 font-mono"
                style={{ 
                  animationDelay: `${index * 0.2}s`,
                  animation: isNew ? 'fadeIn 0.8s ease forwards' : 'none'
                }}
              >
                <code>{codeContent}</code>
              </pre>
            );
          })}
        </div>
      )}
      
      {slideContent.imagePrompt && (
        <div 
          className="mt-6 p-4 bg-gray-700 bg-opacity-30 rounded-lg text-center max-w-md mx-auto"
          style={{
            animation: animatingElements.new.includes(slideContent.imagePrompt) ? 'fadeIn 0.5s ease forwards' : 'none'
          }}
        >
          <p className="text-sm text-gray-300">
            <span className="font-semibold text-red-400">Image suggestion:</span> {slideContent.imagePrompt}
          </p>
        </div>
      )}
      
      {/* Voice transcript overlay */}
      {voiceTranscript && (
        <div className={`fixed bottom-8 left-0 right-0 mx-auto max-w-4xl bg-black/70 text-white p-4 rounded-lg transition-opacity ${isTranscriptFinal ? 'opacity-50' : 'opacity-90'}`}>
          <p className="text-lg">
            {isTranscriptFinal ? '✓ ' : '🎤 '}
            {voiceTranscript}
          </p>
        </div>
      )}
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes titleFadeIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-out-left {
          animation: slideOutLeft 0.4s ease forwards;
        }
        .animate-slide-out-right {
          animation: slideOutRight 0.4s ease forwards;
        }
        .animate-slide-in-right {
          animation: slideInFromRight 0.4s ease forwards;
        }
        .animate-slide-in-left {
          animation: slideInFromLeft 0.4s ease forwards;
        }
        @keyframes slideOutLeft {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(-50px); opacity: 0; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(50px); opacity: 0; }
        }
        @keyframes slideInFromRight {
          from { transform: translateX(50px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInFromLeft {
          from { transform: translateX(-50px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
} 
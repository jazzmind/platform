"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Prompt } from './PromptsReader';
import RealtimePresentationSlide from './RealtimePresentationSlide';
import { ProcessedContent } from './types';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface RealtimePresentationContainerProps {
  prompts: Prompt[];
  referenceContent: string;
}

export default function RealtimePresentationContainer({
  prompts,
  referenceContent
}: RealtimePresentationContainerProps) {
  console.debug('[RealtimePresentationContainer] mounted', { prompts, referenceContent });
  const isInitialRender = useRef(true);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [slideContent, setSlideContent] = useState<ProcessedContent | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [transitionState, setTransitionState] = useState<{
    isTransitioning: boolean;
    direction: 'next' | 'previous';
    phase: 'out' | 'in';
  }>({
    isTransitioning: false,
    direction: 'next',
    phase: 'out'
  });
  
  // Store slides for each talking point
  const [slideHistory, setSlideHistory] = useState<Map<number, ProcessedContent>>(new Map());
  
  // Create an initial slide from a prompt
  const createInitialSlide = (prompt: Prompt, id?: string): ProcessedContent => {
    return {
      id: id || currentPromptIndex.toString(),
      title: prompt.text,
      content: prompt.notes || 'Start speaking to add content to this slide',
      bullets: [], // Start with empty bullets
      codeBlocks: [],
      imagePrompt: `Image related to ${prompt.text}`,
      animationDirections: {
        new: [],
        keep: [],
        remove: []
      }
    };
  };
  
  // Handle content updates from the realtime presentation
  const handleContentChange = useCallback((content: ProcessedContent) => {
    setSlideContent(content);
    
    // Also update the slide history
    setSlideHistory(prev => {
      const newMap = new Map(prev);
      newMap.set(currentPromptIndex, content);
      return newMap;
    });
  }, [currentPromptIndex]);
  
  // Set initial slide content when prompts change
  useEffect(() => {
    // Only run this effect once on initial render
    if (isInitialRender.current && prompts.length > 0 && !slideContent) {
      isInitialRender.current = false;
      const initialSlide = createInitialSlide(prompts[0], '0');
      setSlideContent(initialSlide);
    }
  }, [prompts, slideContent]);
  
  // Handle moving to the next prompt
  const handleNextPrompt = () => {
    console.debug('[RealtimePresentationContainer] handleNextPrompt called', { currentPromptIndex });
    if (currentPromptIndex < prompts.length - 1) {
      // Save current slide state before moving
      if (slideContent) {
        setSlideHistory(prev => {
          const newMap = new Map(prev);
          newMap.set(currentPromptIndex, slideContent);
          return newMap;
        });
      }
      
      // Clear any existing slide content for the next slide to ensure a fresh start
      const nextIndex = currentPromptIndex + 1;
      setSlideHistory(prev => {
        const newMap = new Map(prev);
        // Remove the next slide from history to ensure we start fresh
        newMap.delete(nextIndex);
        return newMap;
      });
      
      // Start transition out phase
      setTransitionState({
        isTransitioning: true,
        direction: 'next',
        phase: 'out'
      });
      
      // Update the index after a short delay
      setTimeout(() => {
        setCurrentPromptIndex(prev => prev + 1);
        
        // Start slide-in phase
        setTransitionState({
          isTransitioning: true,
          direction: 'next',
          phase: 'in'
        });
        
        // End transition after animation completes
        setTimeout(() => {
          setTransitionState({
            isTransitioning: false,
            direction: 'next',
            phase: 'in'
          });
        }, 400);
      }, 300); // Match this with the animation duration in CSS
    }
  };
  
  // Handle moving to the previous prompt
  const handlePreviousPrompt = () => {
    console.debug('[RealtimePresentationContainer] handlePreviousPrompt called', { currentPromptIndex });
    if (currentPromptIndex > 0) {
      // Save current slide state
      if (slideContent) {
        setSlideHistory(prev => {
          const newMap = new Map(prev);
          newMap.set(currentPromptIndex, slideContent);
          return newMap;
        });
      }
      
      // Clear any existing slide content for the previous slide to ensure a fresh start
      const prevIndex = currentPromptIndex - 1;
      setSlideHistory(prev => {
        const newMap = new Map(prev);
        // Remove the previous slide from history to ensure we start fresh
        newMap.delete(prevIndex);
        return newMap;
      });
      
      // Start transition out phase
      setTransitionState({
        isTransitioning: true,
        direction: 'previous',
        phase: 'out'
      });
      
      // Update the index after a short delay
      setTimeout(() => {
        setCurrentPromptIndex(prev => prev - 1);
        
        // Start slide-in phase
        setTransitionState({
          isTransitioning: true,
          direction: 'previous',
          phase: 'in'
        });
        
        // End transition after animation completes
        setTimeout(() => {
          setTransitionState({
            isTransitioning: false,
            direction: 'previous',
            phase: 'in'
          });
        }, 400);
      }, 300);
    }
  };
  
  // When prompt index changes, load the previous slide if available
  useEffect(() => {
    console.log('Current prompt index changed to:', currentPromptIndex);
    console.log('Slide history keys:', Array.from(slideHistory.keys()));
    
    // Don't update content during the transition-out phase
    if (transitionState.isTransitioning && transitionState.phase === 'out') {
      console.log('Skipping slide content update during transition-out phase');
      return;
    }
    
    // Don't update if the slide content already matches what we expect for this prompt index
    // This prevents unnecessary re-renders
    const currentPromptId = currentPromptIndex.toString();
    if (slideContent && slideContent.id === currentPromptId) {
      console.log('Slide content already matches current prompt index, skipping update');
      return;
    }
    
    // Check if we have a stored slide for this prompt
    if (slideHistory.has(currentPromptIndex)) {
      console.log('Loading saved slide for talking point', currentPromptIndex);
      const savedSlide = slideHistory.get(currentPromptIndex);
      console.log('Saved slide content:', savedSlide);
      
      // Add ID to the saved slide to help with optimization
      if (savedSlide) {
        savedSlide.id = currentPromptId;
        setSlideContent(savedSlide);
      }
    } else {
      // Otherwise create an initial slide for this talking point
      if (prompts.length > 0 && currentPromptIndex < prompts.length) {
        console.log('Creating initial slide for talking point', currentPromptIndex);
        
        // Get the current prompt
        const prompt = prompts[currentPromptIndex];
        
        // Create an initial slide for this prompt with ID
        const newSlide = createInitialSlide(prompt, currentPromptId);
        setSlideContent(newSlide);
      }
    }
  }, [currentPromptIndex, prompts, slideHistory, transitionState]);
  
  // Get the current prompt data
  const getCurrentPrompt = (): Prompt | null => {
    if (prompts.length === 0 || currentPromptIndex >= prompts.length) {
      return null;
    }
    return prompts[currentPromptIndex];
  };
  
  const currentPrompt = getCurrentPrompt();
  console.debug('[RealtimePresentationContainer] rendering RealtimePresentationSlide', { currentPromptIndex, currentPrompt });
  
  return (
    <div className="h-full flex flex-col">
      {/* Current slide indicator */}
      <div className="flex justify-between items-center mb-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
        <div className="text-sm">
          <span className="font-bold">Current talking point:</span> {currentPrompt?.text || 'None'}
        </div>
        <div className="flex items-center">
          <button 
            onClick={handlePreviousPrompt}
            disabled={currentPromptIndex === 0}
            className="p-1 mr-2 rounded disabled:opacity-50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:hover:bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm mx-1">{currentPromptIndex + 1} of {prompts.length}</span>
          <button 
            onClick={handleNextPrompt}
            disabled={currentPromptIndex >= prompts.length - 1}
            className="p-1 ml-2 rounded disabled:opacity-50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:hover:bg-transparent"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* The main slide */}
      <div className="flex-grow">
        <RealtimePresentationSlide
          presentationNotes={referenceContent}
          initialTitle={currentPrompt?.text}
          initialContent={currentPrompt?.notes || ''}
          onContentChange={handleContentChange}
          onConnectionError={setConnectionError}
          onNextSlide={handleNextPrompt}
        />
      </div>
      
      {/* Connection error display */}
      {connectionError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
          <strong>Connection Error:</strong> {connectionError}
        </div>
      )}
    </div>
  );
} 
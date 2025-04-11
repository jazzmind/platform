"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Prompt } from './PromptsReader';
import SpeechProcessor, { ProcessedContent } from './SpeechProcessor';
import PromptDisplay from './PromptDisplay';
import DynamicSlide from './DynamicSlide';

interface DynamicTabProps {
  categoryId: string;
  presentationId: string;
}

export default function DynamicTab({ categoryId, presentationId }: DynamicTabProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechText, setSpeechText] = useState("");
  const [processedContent, setProcessedContent] = useState<ProcessedContent | null>(null);
  const [referenceContent, setReferenceContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Store slides for each talking point to restore when navigating
  const [slideHistory, setSlideHistory] = useState<Map<number, ProcessedContent>>(new Map());
  
  // Track the last talking point for transitions
  const lastPromptIndexRef = useRef<number>(0);
  
  // Flag to prevent immediate content processing after slide transition
  const isTransitioningRef = useRef<boolean>(false);
  
  // Transition state
  const [transitionState, setTransitionState] = useState<{
    isTransitioning: boolean;
    direction: 'next' | 'previous';
    phase: 'out' | 'in';
  }>({
    isTransitioning: false,
    direction: 'next',
    phase: 'out'
  });
  
  // Speech context window for maintaining recent speech history
  const [speechHistory, setSpeechHistory] = useState<string[]>([]);
  const SPEECH_WINDOW_SIZE = 5; // Keep last 5 significant speech segments
 
    // Handle moving to the next prompt
    const handleNextPrompt = useCallback(() => {
      if (currentPromptIndex < prompts.length - 1) {
        // Save current slide state before moving
        if (processedContent) {
          setSlideHistory(prev => {
            const newMap = new Map(prev);
            newMap.set(currentPromptIndex, processedContent);
            return newMap;
          });
        }
        
        // Set transition flag to prevent content updates during transition
        isTransitioningRef.current = true;
        
        // Start transition out phase
        setTransitionState({
          isTransitioning: true,
          direction: 'next',
          phase: 'out'
        });
        
        // Update the index after the slide-out animation
        setTimeout(() => {
          // Mark last index for transition effect
          lastPromptIndexRef.current = currentPromptIndex;
          setCurrentPromptIndex(prev => prev + 1);
          
          // Start slide-in phase
          setTransitionState({
            isTransitioning: true,
            direction: 'next',
            phase: 'in'
          });
          
          // End transition after the slide-in animation
          setTimeout(() => {
            setTransitionState({
              isTransitioning: false,
              direction: 'next',
              phase: 'in'
            });
            
            // Clear transition flag
            isTransitioningRef.current = false;
          }, 400);
        }, 300); // Match this with the animation duration in CSS
      } else {
        // End of presentation
        setIsActive(false);
      }
    }, [currentPromptIndex, prompts.length, processedContent]);
    
    // Handle moving to the previous prompt
    const handlePreviousPrompt = useCallback(() => {
      if (currentPromptIndex > 0) {
        // Save current slide state
        if (processedContent) {
          setSlideHistory(prev => {
            const newMap = new Map(prev);
            newMap.set(currentPromptIndex, processedContent);
            return newMap;
          });
        }
        
        // Set transition flag to prevent content updates during transition
        isTransitioningRef.current = true;
        
        // Start transition out phase
        setTransitionState({
          isTransitioning: true,
          direction: 'previous',
          phase: 'out'
        });
        
        // Update the index after the slide-out animation
        setTimeout(() => {
          // Mark last index for transition effect
          lastPromptIndexRef.current = currentPromptIndex;
          setCurrentPromptIndex(prev => prev - 1);
          
          // Start slide-in phase
          setTransitionState({
            isTransitioning: true,
            direction: 'previous',
            phase: 'in'
          });
          
          // End transition after the slide-in animation
          setTimeout(() => {
            setTransitionState({
              isTransitioning: false,
              direction: 'previous',
              phase: 'in'
            });
            
            // Clear transition flag
            isTransitioningRef.current = false;
          }, 400);
        }, 300); // Match this with the animation duration in CSS
      }
    }, [currentPromptIndex, processedContent]);
    
  // Load prompts and reference content on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Load prompts from prompts.md
        try {
          // Client-side can't directly access the file system
          // We need to fetch the prompts via an API route
          const response = await fetch(`/api/presentations/${categoryId}/${presentationId}/prompts`);
          if (!response.ok) {
            throw new Error(`Failed to load prompts: ${response.statusText}`);
          }
          const promptsData = await response.json();
          setPrompts(promptsData);
          
          // Generate initial slide from first talking point
          if (promptsData && promptsData.length > 0) {
            const firstPrompt = promptsData[0];
            createInitialSlide(firstPrompt);
          }
        } catch (err) {
          console.error('Error loading prompts:', err);
          setError('Failed to load prompts. Using default prompts instead.');
          // Create default prompts
          setPrompts([
            {
              id: 'introduction',
              text: 'Welcome to my talk',
              duration: 30,
              notes: 'Begin with a general introduction to the topic and your background'
            },
            {
              id: 'key-points',
              text: 'Key Points',
              duration: 120,
              notes: 'Cover the main concepts and ideas'
            },
            {
              id: 'conclusion',
              text: 'Conclusion',
              duration: 30,
              notes: 'Summarize the key takeaways and next steps'
            }
          ]);
          
          // Generate initial slide from default first talking point
          createInitialSlide({
            id: 'introduction',
            text: 'Welcome to my talk',
            duration: 30,
            notes: 'Begin with a general introduction to the topic and your background'
          });
        }
        
        // Load presentation.md for reference content
        try {
          const response = await fetch(`/api/presentations/${categoryId}/${presentationId}/content`);
          if (!response.ok) {
            throw new Error(`Failed to load presentation content: ${response.statusText}`);
          }
          const contentData = await response.json();
          setReferenceContent(contentData.content || "");
        } catch (err) {
          console.error('Error loading reference content:', err);
          setError('Failed to load presentation content for reference.');
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error in loadData:', err);
        setError('An error occurred while loading presentation data.');
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [categoryId, presentationId, handleNextPrompt, handlePreviousPrompt]);
  
  // Create an initial slide from the first talking point
  const createInitialSlide = (prompt: Prompt) => {
    console.log('Creating initial slide from talking point:', prompt.text);
    
    setProcessedContent({
      title: prompt.text,
      content: prompt.notes || 'Start speaking to add content to this slide',
      bullets: prompt.notes ? [prompt.notes] : [],
      codeBlocks: [],
      imagePrompt: `Image related to ${prompt.text}`,
      animationDirections: {
        new: prompt.notes ? [prompt.notes] : [],
        keep: [],
        remove: []
      }
    });
  };
  
  // Handle speech recognition results
  const handleSpeechResult = (text: string) => {
    console.log('Speech result received in DynamicTab:', text.substring(0, 50) + '...');
    setSpeechText(text);
    
    // Store only significant speech segments (more than 20 chars)
    if (text.length > 20) {
      setSpeechHistory(prev => {
        const newHistory = [...prev, text];
        // Keep only the most recent SPEECH_WINDOW_SIZE entries
        return newHistory.slice(-SPEECH_WINDOW_SIZE);
      });
    }
  };
  
  // Handle processed content from OpenAI
  const handleProcessedContent = (content: ProcessedContent) => {
    console.log('Processed content received in DynamicTab:', content);
    
    // Only update content if we're not in the middle of a transition
    if (!isTransitioningRef.current) {
      setProcessedContent(content);
      
      // Also update the slide history
      setSlideHistory(prev => {
        const newMap = new Map(prev);
        newMap.set(currentPromptIndex, content);
        return newMap;
      });
    } else {
      console.log('Ignoring content update during slide transition');
    }
  };
  
  // Handle navigation between talking points
  const handleNavigationCommand = useCallback((command: 'next' | 'previous') => {
    if (command === 'next' && currentPromptIndex < prompts.length - 1) {
      handleNextPrompt();
    } else if (command === 'previous' && currentPromptIndex > 0) {
      handlePreviousPrompt();
    }
  }, [currentPromptIndex, prompts.length, handleNextPrompt, handlePreviousPrompt]);
  

  // When prompt index changes, load the previous slide if available
  useEffect(() => {
    console.log('Current prompt index changed to:', currentPromptIndex);
    console.log('Slide history keys:', Array.from(slideHistory.keys()));
    
    // Don't update content during the transition-out phase
    if (transitionState.isTransitioning && transitionState.phase === 'out') {
      console.log('Skipping slide content update during transition-out phase');
      return;
    }
    
    // Check if we have a stored slide for this prompt
    if (slideHistory.has(currentPromptIndex)) {
      console.log('Loading saved slide for talking point', currentPromptIndex);
      const savedSlide = slideHistory.get(currentPromptIndex);
      console.log('Saved slide content:', savedSlide);
      setProcessedContent(savedSlide || null);
    } else {
      // Otherwise create an initial slide for this talking point
      if (prompts.length > 0 && currentPromptIndex < prompts.length) {
        console.log('Creating initial slide for talking point', currentPromptIndex);
        
        // Get the current prompt
        const prompt = prompts[currentPromptIndex];
        
        // Create an initial slide for this prompt
        createInitialSlide(prompt);
      }
    }
  }, [currentPromptIndex, prompts, slideHistory, transitionState]);
  
  // Toggle active state
  const toggleActive = () => {
    setIsActive(prev => !prev);
  };
  
  // Toggle pause state
  const togglePause = () => {
    setIsPaused(prev => !prev);
  };
  
  // Get the current talking point data
  const getCurrentTalkingPoint = () => {
    if (prompts.length === 0 || currentPromptIndex >= prompts.length) {
      return { title: "", notes: "" };
    }
    
    const currentPrompt = prompts[currentPromptIndex];
    return {
      title: currentPrompt.text,
      notes: currentPrompt.notes || ""
    };
  };
  
  // Get the speech context window as a single string
  const getSpeechContext = () => {
    return speechHistory.join("\n\n");
  };
  
  // Build the reference content by combining the presentation content and speech history
  const getEnhancedReferenceContent = () => {
    const speechContext = getSpeechContext();
    return `${referenceContent}\n\nRECENT SPEECH HISTORY:\n${speechContext}`;
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600"></div>
        <p className="ml-4 text-gray-600 dark:text-gray-300">Loading presentation data...</p>
      </div>
    );
  }
  
  if (error && prompts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-red-500 mb-4">⚠️</div>
        <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
          Error Loading Dynamic Presentation
        </h3>
        <p className="text-center text-gray-600 dark:text-gray-400">
          {error}
        </p>
      </div>
    );
  }
  
  return (
    <div className="dynamic-tab h-full flex flex-col">
      {/* Error notification */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Content area */}
      <div className="flex flex-col h-full overflow-hidden">
        {/* Controls bar */}
        <div className="bg-gray-100 dark:bg-gray-800 p-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center">
            <button
              onClick={toggleActive}
              className={`mr-2 font-bold py-2 px-4 rounded-lg ${
                isActive 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isActive ? 'Stop' : 'Start'}
            </button>
            
            <button
              onClick={togglePause}
              className={`font-bold py-2 px-4 rounded-lg ${
                isPaused
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
              }`}
              disabled={!isActive}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          </div>
          
          <div className="flex items-center">
            <button
              onClick={handlePreviousPrompt}
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-lg mr-2"
              disabled={currentPromptIndex === 0}
            >
              Previous
            </button>
            
            <button
              onClick={handleNextPrompt}
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-lg"
              disabled={currentPromptIndex === prompts.length - 1}
            >
              Next
            </button>
            
            <span className="ml-4 text-sm text-gray-600 dark:text-gray-300">
              {currentPromptIndex + 1} / {prompts.length}
            </span>
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex flex-col lg:flex-row p-4 bg-gray-50 dark:bg-gray-900 h-full overflow-auto">
          {/* Left side - Prompt and Speech */}
          <div className="lg:w-1/3 mb-4 lg:mb-0 lg:mr-4 flex flex-col">
            {/* Current prompt display */}
            {prompts.length > 0 && (
              <PromptDisplay
                prompt={prompts[currentPromptIndex]}
                onPromptComplete={handleNextPrompt}
                isPaused={isPaused || !isActive}
              />
            )}
            
            {/* Speech recognition status */}
            <div className="mt-4 bg-white dark:bg-gray-800 p-4 rounded-lg flex-1 overflow-auto">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                Speech Recognition
              </h3>
              
              <SpeechProcessor
                onSpeechResult={handleSpeechResult}
                onProcessedContent={handleProcessedContent}
                onNavigationCommand={handleNavigationCommand}
                isActive={isActive && !isPaused}
                referenceContent={getEnhancedReferenceContent()}
                currentSlide={processedContent || undefined}
                talkingPoint={getCurrentTalkingPoint().title}
                talkingPointNotes={getCurrentTalkingPoint().notes}
              />
              
              <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 overflow-auto max-h-40">
                <p className="font-mono whitespace-pre-wrap">{speechText || "No speech detected yet..."}</p>
              </div>
            </div>
          </div>
          
          {/* Right side - Generated Slide */}
          <div className="lg:w-2/3 flex-1 bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
            <DynamicSlide
              content={processedContent}
              isVisible={isActive && !isPaused}
              isTransitioning={transitionState.isTransitioning}
              transitionDirection={transitionState.direction}
              transitionPhase={transitionState.phase}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 
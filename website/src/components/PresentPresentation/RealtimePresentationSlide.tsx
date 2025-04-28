"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { RealtimeClient, setupPresentationTools, setupPresentationInstructions } from './RealtimeClient';
import { ProcessedContent, CodeBlock } from './types';
import { Info, AlertCircle, Minimize2, Volume2, VolumeX } from 'lucide-react';

interface RealtimePresentationSlideProps {
  presentationNotes: string;
  initialTitle?: string;
  initialContent?: string;
  onContentChange?: (content: ProcessedContent) => void;
  onConnectionError?: (error: string) => void;
  onNextSlide?: () => void;
}

interface FullscreenDocument extends Document {
  mozCancelFullScreen?: () => Promise<void>;
  webkitExitFullscreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
}

interface FullscreenElement extends HTMLDivElement {
  mozRequestFullScreen?: () => Promise<void>;
  webkitRequestFullscreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

export default function RealtimePresentationSlide({
  presentationNotes,
  initialTitle = 'Start your presentation',
  initialContent = 'Click start to begin presenting with AI assistance',
  onContentChange,
  onConnectionError,
  onNextSlide
}: RealtimePresentationSlideProps) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assistantStatus, setAssistantStatus] = useState<'idle' | 'listening' | 'calling_tool' | 'tool_error'>('idle');
  const [vadSettings, setVadSettings] = useState<{
    type: 'server_vad' | 'semantic_vad';
    // For semantic VAD
    eagerness?: 'low' | 'medium' | 'high' | 'auto';
    // For server VAD
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
    interrupt_response?: boolean;
  }>({
    type: 'semantic_vad',
    eagerness: 'high',
    interrupt_response: false
  });
  const [slideContent, setSlideContent] = useState<ProcessedContent>({
    title: initialTitle,
    content: initialContent,
    bullets: [],
    codeBlocks: []
  });
  // Add fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Add timer state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [maxTime] = useState<number>(60); // Default 60 seconds before slide change
  const [timerActive, setTimerActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const clientRef = useRef<RealtimeClient | null>(null);
  // Add container ref for fullscreen
  const containerRef = useRef<HTMLDivElement>(null);
  // Add a ref to prevent double connection in dev/strict mode
  const startingRef = useRef(false);
  // Add ref to track initial render for slide context
  const isInitialRender = useRef(true);
  
  // CSS for animations
  const animationStyles = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideInRight {
      from { transform: translateX(30px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes emphasis {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    
    .animate-fade-in {
      animation: fadeIn 0.8s ease-in-out;
    }
    
    .animate-slide-in-right {
      animation: slideInRight 0.8s ease-out;
    }
    
    .animate-emphasis {
      animation: emphasis 1.5s ease-in-out;
    }
  `;
  
  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as FullscreenElement).mozRequestFullScreen) {
        (containerRef.current as FullscreenElement).mozRequestFullScreen?.();
      } else if ((containerRef.current as FullscreenElement).webkitRequestFullscreen) {
        (containerRef.current as FullscreenElement).webkitRequestFullscreen?.();
      } else if ((containerRef.current as FullscreenElement).msRequestFullscreen) {
        (containerRef.current as FullscreenElement).msRequestFullscreen?.();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as FullscreenDocument).mozCancelFullScreen) {
        (document as FullscreenDocument).mozCancelFullScreen?.();
      } else if ((document as FullscreenDocument).webkitExitFullscreen) {
        (document as FullscreenDocument).webkitExitFullscreen?.();
      } else if ((document as FullscreenDocument).msExitFullscreen) {
        (document as FullscreenDocument).msExitFullscreen?.();
      }
    }
  };
  
  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const newFullscreenState = !!document.fullscreenElement;
      setIsFullscreen(newFullscreenState);
      
      // If entering fullscreen mode, set a timer to auto-mute after 5 seconds
      if (newFullscreenState && isActive) {
        console.log('Entered fullscreen, will auto-mute in 5 seconds');
        const autoMuteTimer = setTimeout(() => {
          if (!isMuted) {
            console.log('Auto-muting after fullscreen');
            setIsMuted(true);
            if (audioRef.current) {
              audioRef.current.muted = true;
            }
            
            // Inform the AI about the auto-mute
            if (clientRef.current && clientRef.current.isConnected()) {
              clientRef.current.sendMuteStateUpdate(true);
            }
          }
        }, 5000);
        
        // Clean up the timer if fullscreen exits before it triggers
        return () => clearTimeout(autoMuteTimer);
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [isActive, isMuted]);
  
  // Use callback to prevent recreation of the handler on each render
  const handleContentChange = useCallback((content: ProcessedContent) => {
    if (onContentChange) {
      onContentChange(content);
    }
  }, [onContentChange]);

  // Use callback for the next slide handler to prevent unnecessary re-renders
  const handleNextSlideCallback = useCallback(() => {
    // Reset the timer for the next slide
    setTimeRemaining(maxTime);
    
    // Call the parent's onNextSlide if provided
    if (onNextSlide) {
      onNextSlide();
    }
  }, [maxTime, onNextSlide]);

  // Add handler for next slide that resets timer
  const handleNextSlide = handleNextSlideCallback;

  // Update VAD settings during active presentation
  const updateVadSettings = (newSettings: Partial<typeof vadSettings>) => {
    const updatedSettings = {
      ...vadSettings,
      ...newSettings
    };
    
    setVadSettings(updatedSettings);
    
    // Apply settings to active client if connected
    if (clientRef.current && clientRef.current.isConnected()) {
      clientRef.current.updateVadSettings(updatedSettings);
    }
  };

  // --- NEW: Send slide context to AI on slide change ---
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      
      // Just update UI on initial render
      setSlideContent((prev) => ({
        ...prev,
        title: initialTitle,
        content: initialContent,
        bullets: [], // Reset bullets when moving to a new slide
        codeBlocks: [] // Also reset code blocks
      }));
      return;
    }
    
    // Only send context if client is connected and it's not the initial render
    if (clientRef.current && clientRef.current.isConnected()) {
      console.log('📝 SLIDE CHANGE: Sending new slide context to AI', { 
        title: initialTitle, 
        content: initialContent,
        reminders: 'Remain silent unless addressed, use animated bullets (fade, slide, bounce, emphasis)' 
      });
      try {
        clientRef.current.sendCurrentSlideContext(initialTitle, initialContent);
      } catch (err) {
        console.error('Error sending slide context:', err);
      }
    }
    
    // Always update UI when props change - COMPLETELY RESET bullets for new slides
    const newContent = {
      title: initialTitle,
      content: initialContent,
      bullets: [], // Reset bullets when moving to a new slide
      codeBlocks: [] // Also reset code blocks
    };
    
    setSlideContent(newContent);
    
    // Notify parent component about the change in a separate effect to avoid updating during render
    if (onContentChange) {
      const timeoutId = setTimeout(() => {
        onContentChange(newContent);
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [initialTitle, initialContent, onContentChange, isActive, isMuted]);

  // --- MODIFIED: Append bullets and clear if too many ---
  const setupTools = (client: RealtimeClient) => {
    setupPresentationTools(client, {
      onUpdateSlide: (args) => {
        // Update local state first
        const updatedContent = updateSlideContent(args);
        
        // Then notify parent in a safe way using the memoized callback
        if (onContentChange) {
          setTimeout(() => {
            handleContentChange(updatedContent);
          }, 0);
        }
        
        return { success: true };
      },
      
      onClearSlide: () => {
        const emptyContent: ProcessedContent = {
          title: '',
          content: '',
          bullets: [],
          codeBlocks: []
        };
        
        // Update local state
        setSlideContent(emptyContent);
        
        // Notify parent component if needed using the memoized callback
        if (onContentChange) {
          setTimeout(() => {
            handleContentChange(emptyContent);
          }, 0);
        }
        
        return { success: true };
      },
      
      onNextSlide: () => {
        // Call our handler that resets the timer
        handleNextSlide();
        
        // Return success
        return { success: true };
      }
    });
  };
  
  // Separate function to update slide content
  const updateSlideContent = (args: {
    title?: string;
    content?: string;
    bullets?: string[];
    codeBlocks?: string[];
    imagePrompt?: string;
    bulletAnimations?: { 
      text: string;
      animation: string; 
    }[];
  }) => {
    // Create new content object based on current state without setState
    const newContent: ProcessedContent = { ...slideContent };
    
    // Title: update only if prev title is empty 
    newContent.title = newContent.title ? newContent.title : args.title !== undefined ? args.title : '';
    
    // Content: append if new and not empty
    if (args.content && args.content !== newContent.content) {
      newContent.content = newContent.content ? newContent.content + '\n' + args.content : args.content;
    }
    
    // Process animation information first
    let bulletAnimations = newContent.bulletAnimations || {};
    if (!(bulletAnimations instanceof Map)) {
      // Convert to Map if it's an object
      bulletAnimations = new Map(Object.entries(bulletAnimations));
    }
    
    // If bulletAnimations array is provided, process it
    if (Array.isArray(args.bulletAnimations)) {
      for (const bulletAnim of args.bulletAnimations) {
        if (bulletAnim.text && bulletAnim.animation) {
          bulletAnimations.set(bulletAnim.text, bulletAnim.animation);
        }
      }
    }
    
    // Bullets: append new bullets, avoid duplicates
    let bullets = newContent.bullets ? [...newContent.bullets] : [];
    
    // Process both regular bullets and animated bullets
    const newBullets: string[] = [];
    
    if (Array.isArray(args.bullets)) {
      for (const bullet of args.bullets) {
        if (bullet && !bullets.includes(bullet)) {
          newBullets.push(bullet);
          bullets.push(bullet);
          // Default animation if not specified
          if (!bulletAnimations.has(bullet)) {
            bulletAnimations.set(bullet, 'fade');
          }
        }
      }
    }
    
    if (Array.isArray(args.bulletAnimations)) {
      for (const bulletAnim of args.bulletAnimations) {
        if (bulletAnim.text && !bullets.includes(bulletAnim.text)) {
          newBullets.push(bulletAnim.text);
          bullets.push(bulletAnim.text);
        }
      }
    }
    
    // If too many bullets, clear all except the title
    const MAX_BULLETS = 5;
    if (bullets.length > MAX_BULLETS) {
      bullets = [];
      // Don't modify content when clearing bullets
      // content = newContent.content; - this was causing issues
    }
    
    // Code blocks: append new code blocks, avoid duplicates
    const codeBlocks = newContent.codeBlocks ? [...newContent.codeBlocks] : [];
    if (Array.isArray(args.codeBlocks)) {
      for (const code of args.codeBlocks) {
        if (code && !codeBlocks.includes(code)) {
          codeBlocks.push(code);
        }
      }
    }
    
    // Image prompt: use latest if provided
    const imagePrompt = args.imagePrompt !== undefined ? args.imagePrompt : newContent.imagePrompt;
    
    // Update the newContent object with all the changes
    newContent.bullets = bullets;
    newContent.codeBlocks = codeBlocks;
    newContent.imagePrompt = imagePrompt;
    newContent.bulletAnimations = bulletAnimations;
    
    // Set state once at the end
    setSlideContent(newContent);
    
    return newContent;
  };
  
  // Toggle mute state
  const toggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    
    if (audioRef.current) {
      audioRef.current.muted = newMuteState;
    }
    
    // Inform the AI about the mute state change
    if (clientRef.current && clientRef.current.isConnected()) {
      console.log(`📢 ${newMuteState ? 'Muting' : 'Unmuting'} AI audio and notifying the assistant`);
      clientRef.current.sendMuteStateUpdate(newMuteState);
    }
  };
  
  // Apply mute state to audio element when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);
  
  // Start the presentation
  const startPresentation = async () => {
    console.debug('[RealtimePresentationSlide] startPresentation called', { isActive, isConnecting, startingRef: startingRef.current, clientRef: !!clientRef.current });
    if (isActive || isConnecting || startingRef.current) return false;
    startingRef.current = true;
    try {
      if (clientRef.current) {
        console.debug('[RealtimePresentationSlide] Disconnecting previous client');
        try {
          await clientRef.current.disconnect();
          clientRef.current = null;
        } catch (err) {
          console.error('Error cleaning up previous client:', err);
        }
      }
      setIsConnecting(true);
      setError(null);
      const errorStateRef = { hasError: false };
      console.debug('[RealtimePresentationSlide] Creating new RealtimeClient');
      clientRef.current = new RealtimeClient({
        vadOptions: vadSettings
      });
      const client = clientRef.current;
      
      // Set up event listeners first, before attempting connection
      client.on('error', (error) => {
        console.error('Realtime client error:', error);
        errorStateRef.hasError = true;
        
        setAssistantStatus('tool_error');
        
        // If error is an object with an error property (from server), log it
        if (typeof error === 'object' && error !== null && 'error' in error) {
          console.error('Server error details:', error.error);
          const serverError = error.error;
          // Extract error message from server response if possible
          const errorMessage = typeof serverError === 'object' && serverError !== null && 'message' in serverError 
            ? String(serverError.message)
            : 'Server returned an error';
          setError(errorMessage);
          if (onConnectionError) {
            onConnectionError(errorMessage);
          }
        } else {
          // Regular error handling
          const errorMessage = error instanceof Error ? error.message : String(error);
          setError(errorMessage);
          if (onConnectionError) {
            onConnectionError(errorMessage);
          }
        }
        
        setIsActive(false);
        setIsConnecting(false);
        setTimerActive(false); // Stop timer on error
        
        // Clean up the client on error
        setTimeout(async () => {
          if (clientRef.current) {
            try {
              await clientRef.current.disconnect();
              clientRef.current = null;
            } catch (err) {
              console.error('Error cleaning up client after error:', err);
            }
          }
        }, 1000);
      });
      
      client.on('message', (message) => {
        console.log('Received message:', message);
        
        // Set status based on message type
        if (message.type === 'response.function_call_arguments.done') {
          setAssistantStatus('calling_tool');
        } else if (message.type === 'conversation.item.created' && 
                   typeof message.item === 'object' && 
                   message.item.type === 'function_call_output') {
          setAssistantStatus('listening');
        } else if (message.type === 'response.text.delta' || 
                   message.type === 'response.text.start' || 
                   message.type === 'response.text.end') {
          // AI is talking or processing text
          setAssistantStatus('listening');
        }
        
        // Handle server error messages
        if (message && typeof message === 'object' && message.type === 'error') {
          console.error('Server sent error message:', message);
          errorStateRef.hasError = true;
          setAssistantStatus('tool_error');
          
          // Extract error message from OpenAI's response
          const serverError = message.error;
          let errorMessage = 'Server returned an error';
          
          if (typeof serverError === 'object' && serverError !== null) {
            if ('message' in serverError) {
              errorMessage = String(serverError.message);
            } else if ('code' in serverError) {
              errorMessage = `Error code: ${serverError.code}`;
            }
          }
          
          setError(errorMessage);
          if (onConnectionError) {
            onConnectionError(errorMessage);
          }
        }
      });
      
      client.on('connected', () => {
        console.log('WebRTC connection established');
      });
      
      client.on('datachannel_open', () => {
        console.log('Data channel is now open and ready');
        setAssistantStatus('listening');
        
        // Don't proceed if we've already encountered an error
        if (errorStateRef.hasError) {
          console.log('Not setting up session due to previous error');
          return;
        }
        
        try {
          // Apply session parameters and instructions now that the data channel is open
          setupPresentationInstructions(client, presentationNotes, {
            voice: 'coral',
            temperature: 0.7,
            role: 'silent'
          });
          
          // Set up tools after connection
          setupTools(client);
          
          // Wait a short time for session parameters to be applied
          setTimeout(() => {
            try {
              // Check if we've had an error in the meantime
              if (errorStateRef.hasError || !clientRef.current || !clientRef.current.isConnected()) {
                console.log('Not sending initial message due to error or disconnect');
                return;
              }
              
              // Send an initial greeting from the AI
              client.createResponse('Say ready to begin.');
              
              // If starting with audio muted, inform the AI
              if (isMuted && audioRef.current) {
                audioRef.current.muted = true;
                console.log('Starting presentation with audio muted, informing AI');
                setTimeout(() => {
                  if (clientRef.current && clientRef.current.isConnected()) {
                    clientRef.current.sendMuteStateUpdate(true);
                  }
                }, 1000); // Slight delay to ensure initial greeting processes first
              }
              
              setIsActive(true);
              setIsConnecting(false);
              
              // Start the timer
              setTimeRemaining(maxTime);
              setTimerActive(true);
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error('Error sending initial message:', message);
              setError(`Failed to send initial message: ${message}`);
              if (onConnectionError) {
                onConnectionError(`Failed to send initial message: ${message}`);
              }
              setIsConnecting(false);
              setTimerActive(false);
            }
          }, 2000); // Increase delay for more reliability
        } catch (setupError) {
          const message = setupError instanceof Error ? setupError.message : String(setupError);
          console.error('Error during session setup:', message);
          setError(`Setup error: ${message}`);
          if (onConnectionError) {
            onConnectionError(`Setup error: ${message}`);
          }
          setIsConnecting(false);
          setTimerActive(false);
        }
      });
      
      client.on('datachannel_close', () => {
        console.log('Data channel closed');
        errorStateRef.hasError = true;
        setIsActive(false);
        setIsConnecting(false);
        setTimerActive(false);
        if (onConnectionError) {
          onConnectionError('WebRTC data channel closed unexpectedly');
        }
        
        // Reset client reference on data channel close
        setTimeout(async () => {
          if (clientRef.current) {
            try {
              await clientRef.current.disconnect();
              clientRef.current = null;
            } catch (err) {
              console.error('Error cleaning up client after channel close:', err);
            }
          }
        }, 1000);
      });
      
      // Listen for tool-related events
      client.on('tool_call_start', (data) => {
        console.log('Tool call started:', data);
        setAssistantStatus('calling_tool');
      });
      
      client.on('tool_call_complete', (data) => {
        console.log('Tool call completed:', data);
        setAssistantStatus('listening');
      });
      
      client.on('tool_call_error', (data) => {
        console.log('Tool call error:', data);
        setAssistantStatus('tool_error');
        
        // Automatically revert to listening state after a delay
        setTimeout(() => {
          if (isActive) {
            setAssistantStatus('listening');
          }
        }, 3000);
      });
      
      // Check if we have audio element before connecting
      if (!audioRef.current) {
        const message = 'Audio element not found';
        setError(message);
        if (onConnectionError) {
          onConnectionError(message);
        }
        setIsConnecting(false);
        return false;
      }
      
      // Make sure audio is muted if the mute setting is enabled
      audioRef.current.muted = isMuted;
      
      // Connect to the OpenAI Realtime API
      try {
        console.debug('[RealtimePresentationSlide] Calling client.connect');
        await client.connect(audioRef.current);
        return true;
      } catch (connError) {
        const message = connError instanceof Error ? connError.message : String(connError);
        console.error('WebRTC connection error:', message);
        setError(`Connection failed: ${message}`);
        if (onConnectionError) {
          onConnectionError(`Connection failed: ${message}`);
        }
        setIsConnecting(false);
        setTimerActive(false);
        
        // Clean up after connection error
        setTimeout(async () => {
          if (clientRef.current) {
            try {
              await clientRef.current.disconnect();
              clientRef.current = null;
            } catch (err) {
              console.error('Error cleaning up client after connection error:', err);
            }
          }
        }, 1000);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error starting presentation:', errorMessage);
      setError(errorMessage);
      if (onConnectionError) {
        onConnectionError(errorMessage);
      }
      setIsConnecting(false);
      setTimerActive(false);
      clientRef.current = null;
      return false;
    } finally {
      startingRef.current = false;
      console.debug('[RealtimePresentationSlide] startPresentation finally', { startingRef: startingRef.current, clientRef: !!clientRef.current });
    }
  };
  
  // Start presentation with fullscreen
  const startPresentationWithFullscreen = async () => {
    const success = await startPresentation();
    if (success && !isFullscreen) {
      setTimeout(() => toggleFullscreen(), 500);
    }
  };
  
  // Timer effect
  useEffect(() => {
    if (!timerActive || timeRemaining === null) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(interval);
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [timerActive, timeRemaining]);
  
  // Stop the presentation
  const stopPresentation = async () => {
    console.debug('[RealtimePresentationSlide] stopPresentation called', { isActive, clientRef: !!clientRef.current });
    if (!isActive) return;
    
    setIsActive(false);
    setError(null);
    setAssistantStatus('idle');
    setTimerActive(false); // Stop timer
    
    // Exit fullscreen if active
    if (isFullscreen) {
      toggleFullscreen();
    }
    
    try {
      if (clientRef.current) {
        await clientRef.current.disconnect();
        clientRef.current = null;
        console.debug('[RealtimePresentationSlide] Client disconnected and cleared');
      }
    } catch (error) {
      console.error('Error stopping presentation:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      if (onConnectionError) {
        onConnectionError(errorMessage);
      }
    }
  };
  
  return (
    <div className="realtime-presentation-slide flex flex-col h-full relative" ref={containerRef}>
      {/* Animation styles */}
      <style>{animationStyles}</style>
      
      {/* Timer progress bar */}
      {isActive && timeRemaining !== null && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-300 z-10">
          <div 
            className="h-full bg-red-500 transition-all duration-1000"
            style={{ 
              width: `${(timeRemaining / maxTime) * 100}%`, 
              transformOrigin: 'right',
              marginLeft: 'auto'
            }}
          ></div>
        </div>
      )}
      
      {/* Controls and Settings Panel */}
      {!isFullscreen ? (
        <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          {/* VAD Settings Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                VAD Mode
              </label>
              <select
                value={vadSettings.type}
                onChange={(e) => updateVadSettings({
                  type: e.target.value as 'server_vad' | 'semantic_vad'
                })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="server_vad">Server (Turn-taking)</option>
                <option value="semantic_vad">Semantic (Context-aware)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Server: Basic pause detection. Semantic: Understands natural pauses in conversation.
              </p>
            </div>
            
            {vadSettings.type === 'server_vad' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Threshold ({vadSettings.threshold})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={vadSettings.threshold || 0.5}
                    onChange={(e) => updateVadSettings({
                      threshold: parseFloat(e.target.value)
                    })}
                    className="w-full"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Higher values mean less sensitive to speech.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prefix Padding ({vadSettings.prefix_padding_ms} ms)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={vadSettings.prefix_padding_ms || 300}
                    onChange={(e) => updateVadSettings({
                      prefix_padding_ms: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Adds extra silence before speech to prevent false positives.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Silence Duration ({vadSettings.silence_duration_ms} ms)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={vadSettings.silence_duration_ms || 500}
                    onChange={(e) => updateVadSettings({
                      silence_duration_ms: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Defines how long of a pause is considered silence.
                  </p>
                </div>
              </>
            )}
            
            {vadSettings.type === 'semantic_vad' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Eagerness
                </label>
                <select
                  value={vadSettings.eagerness || 'medium'}
                  onChange={(e) => updateVadSettings({
                    eagerness: e.target.value as 'low' | 'medium' | 'high' | 'auto'
                  })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low (Fewer interruptions)</option>
                  <option value="medium">Medium (Balanced)</option>
                  <option value="high">High (Quick responses)</option>
                  <option value="auto">Auto (Context-dependent)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Controls how quickly the AI responds to your speech based on semantic understanding.
                </p>
              </div>
            )}
            
            {isActive && (
              <div className="mt-4 p-2 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-800 dark:text-blue-200">
                <Info className="h-4 w-4 inline-block mr-1 align-text-bottom" />
                Changes to VAD settings will be applied immediately to the active session.
              </div>
            )}
          </div>
          
          {/* Presentation Controls */}
          <div className="flex justify-center items-center">
            <button
              onClick={isActive ? stopPresentation : startPresentationWithFullscreen}
              disabled={isConnecting}
              className={`px-6 py-3 rounded-lg text-lg ${
                isActive 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isConnecting ? 'Connecting...' : isActive ? 'Stop' : 'Start'} Presentation
            </button>
            
            {/* Mute toggle button */}
            {isActive && (
              <button 
                onClick={toggleMute}
                className="ml-2 p-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                title={isMuted ? "Unmute AI" : "Mute AI"}
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            )}
            
            {/* Status Indicator */}
            {isActive && (
              <div className="ml-4 flex items-center">
                <div 
                  className={`w-3 h-3 rounded-full mr-2 ${
                    assistantStatus === 'listening' ? 'bg-green-500 animate-pulse' : 
                    assistantStatus === 'calling_tool' ? 'bg-blue-500 animate-ping' :
                    assistantStatus === 'tool_error' ? 'bg-red-500' : 'bg-gray-400'
                  }`}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {assistantStatus === 'listening' ? 'Listening' : 
                   assistantStatus === 'calling_tool' ? 'Processing' :
                   assistantStatus === 'tool_error' ? 'Error' : 'Idle'}
                </span>
              </div>
            )}
            
            {error && (
              <div className="ml-4 text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {error}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="absolute top-4 right-4 z-20 flex space-x-2">
          {/* Mute toggle button in fullscreen mode */}
          <button 
            onClick={toggleMute}
            className="text-white opacity-50 hover:opacity-100 bg-black bg-opacity-50 p-2 rounded-full"
            title={isMuted ? "Unmute AI" : "Mute AI"}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          
          <button 
            onClick={toggleFullscreen}
            className="text-white opacity-50 hover:opacity-100 bg-black bg-opacity-50 p-2 rounded-full"
            title="Exit Fullscreen"
          >
            <Minimize2 className="h-5 w-5" />
          </button>
        </div>
      )}
      
      {/* Main presentation content area */}
      <div className={`flex-grow bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-lg p-8 overflow-auto relative ${isFullscreen ? 'flex flex-col justify-center' : ''}`}>
        {slideContent.title && (
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center text-red-400">
            {slideContent.title}
          </h2>
        )}
        
        {slideContent.bullets && slideContent.bullets.length > 0 ? (
          <ul className="space-y-4 mb-6 max-w-3xl mx-auto">
            {slideContent.bullets.map((bullet, index) => {
              // Get animation type for this bullet
              let animationClass = '';
              const animation = slideContent.bulletAnimations instanceof Map 
                ? slideContent.bulletAnimations.get(bullet)
                : slideContent.bulletAnimations?.[bullet];
              
              switch(animation) {
                case 'fade':
                  animationClass = 'animate-fade-in';
                  break;
                case 'slide':
                  animationClass = 'animate-slide-in-right';
                  break;
                case 'bounce':
                  animationClass = 'animate-bounce';
                  break;
                case 'emphasis':
                  animationClass = 'animate-emphasis';
                  break;
                default:
                  animationClass = 'animate-fade-in'; // Default animation
              }
              
              return (
                <li 
                  key={`bullet-${index}`}
                  className={`flex items-start ${animationClass}`}
                >
                  <span className="text-red-400 mr-2">•</span>
                  <span className="text-xl md:text-2xl">{bullet}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xl md:text-2xl mb-6 text-center max-w-3xl mx-auto">
            {slideContent.content}
          </p>
        )}
        
        {slideContent.codeBlocks && slideContent.codeBlocks.length > 0 && (
          <div className="mb-6 space-y-4">
            {slideContent.codeBlocks.map((codeBlock, index) => {
              // Handle both string and CodeBlock objects
              const codeContent = typeof codeBlock === 'object' && codeBlock !== null 
                ? (codeBlock as CodeBlock).code || JSON.stringify(codeBlock) 
                : String(codeBlock);
              
              return (
                <pre 
                  key={`code-${index}`}
                  className="bg-gray-800 p-4 rounded-lg overflow-auto text-sm text-gray-300 font-mono"
                >
                  <code>{codeContent}</code>
                </pre>
              );
            })}
          </div>
        )}
        
        {slideContent.imagePrompt && (
          <div className="mt-6 p-4 bg-gray-700 bg-opacity-30 rounded-lg text-center max-w-md mx-auto">
            <p className="text-sm text-gray-300">
              <span className="font-semibold text-red-400">Image suggestion:</span> {slideContent.imagePrompt}
            </p>
          </div>
        )}
      </div>
      
      {/* Hidden audio element for WebRTC audio playback */}
      <audio ref={audioRef} className="hidden" autoPlay />
    </div>
  );
} 
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Prompt } from '../Prompt/PromptsReader';
import { ProcessedContent } from '../types';
import { WebRTCConnection, RTCMessage } from '../WebRTC/WebRTCConnection';
import DynamicSlide from '../DynamicSlide';

interface RemoteScreenProps {
  prompts: Prompt[];
  presentationId: string;
  onExit?: () => void;
  categoryId?: string;
  referenceContent?: string;
}

export default function RemoteScreen({ prompts, presentationId, categoryId = '' }: RemoteScreenProps) {
  const [isPaired, setIsPaired] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [isVoiceTranscriptFinal, setIsVoiceTranscriptFinal] = useState(false);
  const [slideContent, setSlideContent] = useState<ProcessedContent | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Reference to the WebRTC connection
  const webrtcRef = useRef<WebRTCConnection | null>(null);
  const presentationSessionId = useRef<string>('');
  const hasInitialized = useRef<boolean>(false);
  const pairingCallInProgress = useRef<boolean>(false);
  
  // Reference to the container element for fullscreen
  const containerRef = useCallback((node: HTMLDivElement) => {
    if (node !== null) {
      // Save reference to the container element
      (window as Window & typeof globalThis & { presentationContainer: HTMLDivElement }).presentationContainer = node;
    }
  }, []);
  
  // Function to reset state and retry connection
  const retryConnection = () => {
    setError(null);
    setPairingCode('');
    setIsRetrying(true);
    hasInitialized.current = false;
    
    // Clean up existing connection if any
    if (webrtcRef.current) {
      webrtcRef.current.disconnect()
        .catch(err => console.error('Error disconnecting during retry:', err))
        .finally(() => {
          webrtcRef.current = null;
          // Force a new pairing code creation
          setTimeout(() => {
            setIsRetrying(false);
          }, 500);
        });
    } else {
      setIsRetrying(false);
    }
  };

    
  // Update slide content based on the current prompt index
  const updateSlideContent = useCallback((index: number) => {
    if (index >= 0 && index < prompts.length) {
      const prompt = prompts[index];
      
      const processedContent: ProcessedContent = {
        title: prompt.text || '',
        content: prompt.notes || '',
        bullets: [],
        codeBlocks: []
      };
      
      // If notes contain bullet points, extract them
      if (prompt.notes) {
        const bulletMatches = prompt.notes.match(/^[•\-*]\s.+$/gm);
        if (bulletMatches && bulletMatches.length > 0) {
          processedContent.bullets = bulletMatches.map(b => b.replace(/^[•\-*]\s/, ''));
          
          // Remove bullet points from content to avoid duplication
          processedContent.content = prompt.notes
            .split('\n')
            .filter(line => !line.match(/^[•\-*]\s.+$/))
            .join('\n')
            .trim();
        }
        
        // Extract code blocks
        const codeMatches = prompt.notes.match(/```(?:\w+)?\n([\s\S]*?)```/g);
        if (codeMatches && codeMatches.length > 0) {
          processedContent.codeBlocks = codeMatches.map(c => {
            return c.replace(/```(?:\w+)?\n/, '').replace(/```$/, '');
          });
          
          // Remove code blocks from content to avoid duplication
          let tempContent = processedContent.content;
          codeMatches.forEach(code => {
            tempContent = tempContent.replace(code, '');
          });
          processedContent.content = tempContent.trim();
        }
      }
      
      setSlideContent(processedContent);
    }
  }, [prompts]);
  
   // Process commands from the controller via WebRTC
   const processCommand = useCallback((message: RTCMessage) => {
    const { type, data } = message;
    
    switch (type) {
      case 'next':
        if (currentPromptIndex < prompts.length - 1) {
          setCurrentPromptIndex(prev => prev + 1);
          updateSlideContent(currentPromptIndex + 1);
        }
        break;
        
      case 'previous':
        if (currentPromptIndex > 0) {
          setCurrentPromptIndex(prev => prev - 1);
          updateSlideContent(currentPromptIndex - 1);
        }
        break;
        
      case 'goto':
        if (data?.index !== undefined && 
            typeof data.index === 'number' && 
            data.index >= 0 && 
            data.index < prompts.length) {
          setCurrentPromptIndex(data.index as number);
          updateSlideContent(data.index as number);
        }
        break;
        
      case 'startTimer':
        if (data?.minutes !== undefined && typeof data.minutes === 'number') {
          setTimeLeft((data.minutes as number) * 60);
          setStartTime(Date.now());
        }
        break;
        
      case 'pauseTimer':
        setStartTime(null);
        break;
        
      case 'resumeTimer':
        if (timeLeft) {
          setStartTime(Date.now());
        }
        break;
        
      case 'resetTimer':
        setTimeLeft(null);
        setStartTime(null);
        break;
        
      case 'updateSlide':
        if (data?.content) {
          const content = data.content as Record<string, unknown>;
          
          // Update slide with provided content
          const processedContent: ProcessedContent = {
            title: content.title as string || '',
            content: content.content as string || '',
            bullets: content.bullets as string[] || [],
            codeBlocks: content.code ? [content.code as string] : []
          };
          
          setSlideContent(processedContent);
        }
        break;
        
      case 'updateVoiceTranscript':
        if (data?.transcript) {
          setVoiceTranscript(data.transcript as string);
          setIsVoiceTranscriptFinal(!!data.isFinal);
          
          // If final, clear after 5 seconds
          if (data.isFinal) {
            setTimeout(() => {
              setVoiceTranscript('');
              setIsVoiceTranscriptFinal(false);
            }, 5000);
          }
        }
        break;
        
      case 'disconnect':
        setIsPaired(false);
        if (webrtcRef.current) {
          webrtcRef.current.disconnect();
        }
        break;
    }
  }, [currentPromptIndex, prompts.length, timeLeft, updateSlideContent]);

  // Create a pairing code when the component mounts
  useEffect(() => {
    // Prevent the effect from running if already paired or initialized
    if (isPaired || hasInitialized.current || isRetrying) {
      console.log('Already paired, initialized, or retrying, skipping pairing creation');
      return;
    }
    
    // Also prevent concurrent API calls
    if (pairingCallInProgress.current) {
      console.log('Pairing API call already in progress, skipping');
      return;
    }
    
    // Clean up any orphaned connections first to prevent issues
    WebRTCConnection.cleanupOrphanedConnections('/api/remote-presentation/signaling')
      .catch(err => console.error('Failed to cleanup orphaned connections:', err));
    
    async function createPairing() {
      // Set flag to prevent concurrent calls
      pairingCallInProgress.current = true;
      hasInitialized.current = true;
      
      console.log('Starting RemoteScreen initialization...');
      
      try {
        console.log('Creating pairing for presentation:', presentationId, 'category:', categoryId);
        
        // Clean up any existing WebRTC connection first
        if (webrtcRef.current) {
          console.log('Cleaning up existing WebRTC connection before creating new pairing');
          webrtcRef.current.disconnect();
          webrtcRef.current = null;
        }
        
        const response = await fetch('/api/remote-presentation/create-pairing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            presentationId,
            categoryId
          }),
        });

        console.log('Create pairing response status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          setError(errorText);
          console.error('Failed to create pairing:', errorText);
          hasInitialized.current = false; // Reset to allow retry
          pairingCallInProgress.current = false;
          return;
        }

        const data = await response.json();
        console.log('Pairing data received:', data);
        
        // Store the pairing code and sessionId
        const newPairingCode = data.pairingCode;
        const sessionId = `${presentationId}-${newPairingCode}`;
        
        console.log(`Setting up RemoteScreen with sessionId: ${sessionId}, pairingCode: ${newPairingCode}`);
        
        setPairingCode(newPairingCode);
        presentationSessionId.current = sessionId;

        try {
          console.log(`Creating WebRTC connection as SCREEN with sessionId: ${sessionId}`);
          
          // Create new WebRTC connection
          const webrtc = new WebRTCConnection({
            sessionId: sessionId,
            pairingCode: newPairingCode,
            role: 'screen', 
          });
          
          console.log('WebRTC connection object created, setting up event listeners');
          
          // Set up event listeners
          webrtc.addListener('connected', () => {
            console.log('WebRTC connected - screen is now paired with controller');
            setIsPaired(true);
            setError(null); // Clear any previous error
          });
          
          webrtc.addListener('disconnected', () => {
            console.log('WebRTC disconnected - screen is now unpaired');
            setIsPaired(false);
            
            // Reset any slides or content if needed
            updateSlideContent(currentPromptIndex);
          });
          
          webrtc.addListener('error', (error) => {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('WebRTC error:', errorMessage);
            setIsPaired(false);
            
            // Set appropriate error message
            if (errorMessage.includes('timed out') || errorMessage.includes('inactivity')) {
              setError('Connection timed out. No controller connected within the timeout period.');
            } else {
              setError(`Connection error: ${errorMessage}`);
            }
            
            // Clean up the connection properly when there's an error
            if (webrtcRef.current) {
              console.log('Cleaning up WebRTC connection due to error');
              webrtcRef.current.disconnect()
                .catch(err => console.error('Error during disconnect after error:', err));
              webrtcRef.current = null;
            }
          });
          
          webrtc.addListener('message', (message) => {
            console.log('WebRTC message received:', message);
            processCommand(message as RTCMessage);
          });

          // Store the WebRTC connection reference first to ensure it's available 
          // when signals are received during the connection process
          webrtcRef.current = webrtc;
          console.log('WebRTC connection stored in webrtcRef');
          
          // Connect without microphone for screen
          console.log('Calling webrtc.connect() to initialize peer connection');
          await webrtc.connect(false);
          console.log('webrtc.connect() completed successfully');
          
          // Force processing of any pending signals after a short delay
          // This ensures any offer received during initialization is processed
          setTimeout(() => {
            if (webrtcRef.current) {
              console.log('Manually triggering processing of any pending signaling messages');
              webrtcRef.current.processPendingSignalingMessages();
            }
          }, 1000);
        } catch (err) {
          console.error('Failed to initialize WebRTC:', err);
          setError(`Failed to initialize connection: ${err instanceof Error ? err.message : String(err)}`);
          hasInitialized.current = false; // Reset flag on error to allow retry
          pairingCallInProgress.current = false;
        }
      } catch (err) {
        console.error('Error creating pairing:', err);
        setError(`Error creating pairing: ${err instanceof Error ? err.message : String(err)}`);
        hasInitialized.current = false; // Reset flag on error to allow retry
        pairingCallInProgress.current = false;
      } finally {
        // Clear the in-progress flag
        pairingCallInProgress.current = false;
      }
    }
    
    console.log('Checking for existing pairing code:', pairingCode);
    if (!pairingCode) {
      console.log('No pairing code exists, creating one');
      createPairing();
    } else {
      console.log('Pairing code already exists:', pairingCode);
    }
    
    // Add cleanup function
    return () => {
      console.log('Component unmounting, cleaning up WebRTC');
      if (webrtcRef.current) {
        webrtcRef.current.disconnect();
        webrtcRef.current = null;
      }
      hasInitialized.current = false;
      pairingCallInProgress.current = false;
    };
  }, [presentationId, categoryId, isRetrying, currentPromptIndex, isPaired, pairingCode, updateSlideContent, processCommand]); // Add isRetrying as a dependency
  
 
  // Clean up WebRTC connection on unmount
  useEffect(() => {
    return () => {
      if (webrtcRef.current) {
        webrtcRef.current.disconnect();
        webrtcRef.current = null;
      }
      
      // Clean up signaling data
      if (presentationSessionId.current) {
        fetch(`/api/remote-presentation/signaling?sessionId=${presentationSessionId.current}`, {
          method: 'DELETE'
        }).catch(error => {
          console.error('Error cleaning up signaling data:', error);
        });
      }
    };
  }, []);
  
  // Timer functionality
  useEffect(() => {
    if (!isPaired) return;
    
    let interval: NodeJS.Timeout | null = null;
    
    if (startTime && timeLeft !== null) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, timeLeft - elapsed);
        
        if (remaining <= 0) {
          setTimeLeft(0);
          setStartTime(null);
          if (interval) clearInterval(interval);
        } else {
          setTimeLeft(remaining);
        }
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [startTime, timeLeft, isPaired]);
  
  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Toggle fullscreen
  const toggleFullscreen = () => {
    // Use the stored reference from containerRef
    const container = (window as Window & typeof globalThis & { presentationContainer?: HTMLDivElement }).presentationContainer;
    if (!container) return;
    
    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if ((container as HTMLDivElement & { mozRequestFullScreen?: () => Promise<void> }).mozRequestFullScreen) { /* Firefox */
        (container as HTMLDivElement & { mozRequestFullScreen: () => Promise<void> }).mozRequestFullScreen();
      } else if ((container as HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) { /* Chrome, Safari and Opera */
        (container as HTMLDivElement & { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
      } else if ((container as HTMLDivElement & { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen) { /* IE/Edge */
        (container as HTMLDivElement & { msRequestFullscreen: () => Promise<void> }).msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as Document & { mozCancelFullScreen?: () => Promise<void> }).mozCancelFullScreen) { /* Firefox */
        (document as Document & { mozCancelFullScreen: () => Promise<void> }).mozCancelFullScreen();
      } else if ((document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) { /* Chrome, Safari and Opera */
        (document as Document & { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
      } else if ((document as Document & { msExitFullscreen?: () => Promise<void> }).msExitFullscreen) { /* IE/Edge */
        (document as Document & { msExitFullscreen: () => Promise<void> }).msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };
  
  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
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
  }, []);
  
  return (
    <div className="h-full w-full flex flex-col relative" ref={containerRef}>
      {/* Main content area */}
      <div className={`flex-grow flex flex-col ${isFullscreen ? 'bg-black' : 'bg-gray-900'}`}>
      
        {/* When paired, show the presentation content */}
        {isPaired && (
          <div className="flex-grow flex flex-col">
            {/* Current slide content */}
            <DynamicSlide 
              content={slideContent || { 
                title: prompts[currentPromptIndex]?.text || '', 
                content: prompts[currentPromptIndex]?.notes || '',
                bullets: [],
                codeBlocks: []
              }}
              voiceTranscript={voiceTranscript}
              isTranscriptFinal={isVoiceTranscriptFinal}
            />
          </div>
        )}
        
        {/* When not paired, show pairing code or error */}
        {!isPaired && (
          <div className="flex-grow flex items-center justify-center">
            {isRetrying ? (
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-xl">Resetting connection...</p>
              </div>
            ) : (
              <div className="text-center p-8 max-w-md">
                {error ? (
                  <div className="bg-red-800 p-6 rounded-lg shadow-lg text-white">
                    <h3 className="text-xl font-bold mb-4">Connection Error</h3>
                    <p className="mb-6">{error}</p>
                    <button 
                      className="px-4 py-2 bg-white text-red-800 font-bold rounded-md hover:bg-gray-200 transition-colors"
                      onClick={retryConnection}
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-800 p-8 rounded-lg shadow-lg text-white">
                    <h2 className="text-3xl font-bold mb-4">Remote Presentation</h2>
                    <p className="mb-8 text-gray-300">Use this code to connect your controller:</p>
                    <div className="text-6xl font-mono font-bold tracking-wider mb-6 bg-gray-900 p-4 rounded-lg">
                      {pairingCode || '----'}
                    </div>
                    <p className="text-sm text-gray-400">
                      Enter this code on your controller device to begin the presentation.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Footer with controls - only show when paired and not in fullscreen */}
      {isPaired && !isFullscreen && (
        <div className="bg-gray-800 px-4 py-2 flex justify-between items-center">
          <div className="text-white">
            <span className="mr-4">Slide {currentPromptIndex + 1}/{prompts.length}</span>
            {timeLeft !== null && (
              <span className="bg-gray-700 px-2 py-1 rounded">
                {formatTime(timeLeft)}
              </span>
            )}
          </div>
          
          <button 
            onClick={toggleFullscreen}
            className="text-white px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"
          >
            Enter Fullscreen
          </button>
        </div>
      )}
      
      {/* Fullscreen toggle button - only show when in fullscreen */}
      {isFullscreen && (
        <button 
          onClick={toggleFullscreen}
          className="absolute bottom-4 right-4 text-white opacity-50 hover:opacity-100 bg-black bg-opacity-50 p-2 rounded-full"
        >
          Exit Fullscreen
        </button>
      )}
    </div>
  );
} 
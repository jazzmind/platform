"use client";

import { useState, useEffect, useRef } from 'react';
import { Prompt } from '../Prompt/PromptsReader';
import { WebRTCConnection, RTCMessage } from '../WebRTC/WebRTCConnection';
import { RealtimeClient, setupPresentationTools, setupPresentationInstructions } from '../RealtimeClient';

interface RemoteControllerProps {
  prompts: Prompt[];
  onExit: () => void;
  presentationId: string;
}

// Define message types for WebRTC communication
type MessageType = 
  | 'next'
  | 'previous'
  | 'goto'
  | 'startTimer'
  | 'pauseTimer'
  | 'resumeTimer'
  | 'resetTimer'
  | 'updateSlide'
  | 'updateVoiceTranscript'
  | 'disconnect';


export default function RemoteController({
  prompts,
  onExit,
  presentationId
}: RemoteControllerProps) {
  const [pairingCode, setPairingCode] = useState<string>('');
  const [isPaired, setIsPaired] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  
  // References for WebRTC and RealtimeClient
  const webrtcRef = useRef<WebRTCConnection | null>(null);
  const realtimeClientRef = useRef<RealtimeClient | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const presentationSessionId = useRef<string>('');
  const connectionAttemptInProgress = useRef<boolean>(false);
  
  // Handle pairing code input
  const handlePairingCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 4);
    setPairingCode(value);
  };
  
  // Connect to the screen using the pairing code
  const connectToScreen = async () => {
    if (!pairingCode || pairingCode.length !== 4) {
      setErrorMessage('Please enter a valid 4-digit pairing code');
      return;
    }

    // Prevent concurrent connection attempts
    if (connectionAttemptInProgress.current) {
      console.log('Connection attempt already in progress, skipping');
      return;
    }

    connectionAttemptInProgress.current = true;
    setIsConnecting(true);
    setErrorMessage(null);
    console.log('Attempting to connect with pairing code:', pairingCode);

    try {
      // Clean up any existing WebRTC connection first
      if (webrtcRef.current) {
        console.log('Cleaning up existing WebRTC connection before creating new connection');
        webrtcRef.current.disconnect();
        webrtcRef.current = null;
      }

      // First verify the pairing code is valid
      const url = `/api/remote-presentation/check-pairing/${presentationId}-${pairingCode}`;
      console.log('Checking pairing code at URL:', url);
      
      const response = await fetch(url);
      console.log('Pairing check response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          setErrorMessage('Invalid pairing code. Please try again.');
        } else if (response.status === 410) {
          setErrorMessage('This pairing code has expired. Please ask the presenter for a new code.');
        } else {
          setErrorMessage('Failed to connect. Please try again.');
        }
        setIsConnecting(false);
        connectionAttemptInProgress.current = false;
        return;
      }

      const data = await response.json();
      console.log('Pairing data retrieved:', data);
      
      // Generate a unique session ID for WebRTC signaling
      const sessionId = `${presentationId}-${pairingCode}`;
      presentationSessionId.current = sessionId;
      console.log('Using session ID for signaling:', sessionId);
      
      // Initialize WebRTC connection for controller
      console.log(`Creating WebRTC connection as CONTROLLER with sessionId: ${sessionId}`);
      webrtcRef.current = new WebRTCConnection({
        sessionId: sessionId,
        pairingCode: pairingCode,
        role: 'controller'
      });
      console.log('Created WebRTC connection as controller');
      
      // Set up event listeners for WebRTC connection
      webrtcRef.current.addListener('connected', () => {
        console.log('WebRTC connection successfully established!');
        setIsPaired(true);
        setIsConnecting(false);
        connectionAttemptInProgress.current = false;
        setCurrentPromptIndex(data.currentIndex || 0);
        
        // Initialize timer state if available
        if (data.timerStartTime) {
          setStartTime(data.timerStartTime);
          setIsRunning(data.timerIsRunning || false);
          setElapsedTime(data.timerElapsedTime || 0);
        }
        
        // Initialize OpenAI realtime client for voice
        initializeRealtimeClient();
      });
      
      webrtcRef.current.addListener('disconnected', () => {
        console.log('WebRTC connection closed or disconnected');
        setIsPaired(false);
        setIsConnecting(false);
        connectionAttemptInProgress.current = false;
        setErrorMessage('Connection to remote screen lost. Try connecting again.');
      });
      
      webrtcRef.current.addListener('error', (error) => {
        console.error('WebRTC error encountered:', error);
        
        // Check if this is a timeout error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('timed out') || errorMessage.includes('failed polling')) {
          setErrorMessage('Connection timed out. Please try connecting again.');
        } else {
          setErrorMessage('Connection error: ' + errorMessage);
        }
        
        setIsConnecting(false);
        connectionAttemptInProgress.current = false;
        
        // Ensure we properly clean up the WebRTC connection when an error occurs
        if (webrtcRef.current) {
          console.log('Cleaning up WebRTC connection due to error');
          webrtcRef.current.disconnect();
          webrtcRef.current = null;
        }
      });
      
      // Initialize the connection with microphone access
      console.log('Initializing WebRTC connection with microphone access');
      await webrtcRef.current.connect(true);
      console.log('WebRTC connect method completed, awaiting connection events');
      
      // Force processing of any pending signals that might have been received
      // This helps resolve race conditions where signals arrive before peer is ready
      setTimeout(() => {
        if (webrtcRef.current) {
          console.log('Manually triggering processing of any pending signaling messages');
          webrtcRef.current.processPendingSignalingMessages();
        }
      }, 5000);
      
      // Also update the API to mark this controller as paired
      console.log('Updating pairing status in database');
      await fetch('/api/remote-presentation/update-pairing/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          presentationId,
          pairingCode,
          action: 'pair',
          data: {
            controllerConnected: true,
            currentPromptIndex: 0,
            totalPrompts: prompts.length
          }
        })
      });
      console.log('Pairing update complete. Awaiting WebRTC connection...');
      
      // If connection doesn't establish within 10 seconds, show an error
      setTimeout(() => {
        if (!isPaired && isConnecting) {
          console.log('Connection timeout - WebRTC failed to establish connection within timeout period');
          setErrorMessage('Connection timed out. Please try again.');
          setIsConnecting(false);
          connectionAttemptInProgress.current = false;
        }
      }, 10000);
      
    } catch (error) {
      console.error('Error connecting to screen:', error);
      setErrorMessage('Failed to connect: ' + (error instanceof Error ? error.message : String(error)));
      setIsConnecting(false);
      connectionAttemptInProgress.current = false;
      
      // Ensure we clean up the WebRTC connection if an error occurs during setup
      if (webrtcRef.current) {
        console.log('Cleaning up WebRTC connection due to setup error');
        webrtcRef.current.disconnect();
        webrtcRef.current = null;
      }
    }
  };
  
  // Initialize OpenAI realtime client for voice processing
  const initializeRealtimeClient = () => {
    if (audioElementRef.current && !realtimeClientRef.current) {
      // Create new realtime client
      realtimeClientRef.current = new RealtimeClient({
        apiEndpoint: '/api/realtime-api',
        model: 'gpt-4o-mini-realtime-preview',
        vadOptions: {
          type: 'semantic_vad',
          eagerness: 'medium',
          interrupt_response: true
        }
      });
      
      // Set up event listeners
      realtimeClientRef.current.on('message', (message) => {
        console.log('Realtime message received:', message);
      });
      
      realtimeClientRef.current.on('transcript', (transcript) => {
        setTranscript(transcript.text);
        
        // Send transcript to remote screen for display
        sendCommandToRemote('updateVoiceTranscript', {
          transcript: transcript.text,
          isFinal: transcript.is_final
        });
      });
      
      realtimeClientRef.current.on('error', (error) => {
        console.error('Realtime client error:', error);
        setErrorMessage('Voice processing error: ' + error.message);
      });
      
      // Connect to OpenAI's realtime API
      realtimeClientRef.current.connect(audioElementRef.current)
        .then(() => {
          console.log('Connected to OpenAI realtime API');
          
          // Update session with presentation context and setup tools
          if (realtimeClientRef.current) {
            // Apply presentation instructions
            setupPresentationInstructions(realtimeClientRef.current, undefined, {
              role: 'silent',
              temperature: 0.7
            });
            
            // Setup the presentation tools
            setupPresentationTools(realtimeClientRef.current, {
              onUpdateSlide: (args) => {
                // Send updated slide content to remote screen
                sendCommandToRemote('updateSlide', {
                  content: {
                    title: args.title,
                    content: args.content,
                    bullets: args.bullets,
                    code: args.codeBlocks && args.codeBlocks.length > 0 ? args.codeBlocks[0] : undefined
                  }
                });
                return { success: true };
              },
              onNextSlide: () => {
                handleNext();
                return { success: true };
              },
              onPreviousSlide: () => {
                handlePrevious();
                return { success: true };
              },
              onClearSlide: () => {
                // Send command to clear the slide
                sendCommandToRemote('updateSlide', {
                  content: {
                    title: '',
                    content: '',
                    bullets: []
                  }
                });
                return { success: true };
              }
            });
          }
        })
        .catch((error) => {
          console.error('Failed to connect to OpenAI realtime API:', error);
          setErrorMessage('Failed to initialize voice processing');
        });
    }
  };
  
  // Clean up WebRTC and Realtime client connections
  useEffect(() => {
    return () => {
      // Reset connection flags
      connectionAttemptInProgress.current = false;
      
      // Clean up WebRTC connection
      if (webrtcRef.current) {
        console.log('Unmounting RemoteController - cleaning up WebRTC connection');
        webrtcRef.current.disconnect();
        webrtcRef.current = null;
      }
      
      // Clean up OpenAI realtime client
      if (realtimeClientRef.current) {
        console.log('Unmounting RemoteController - cleaning up realtime client');
        realtimeClientRef.current.disconnect();
        realtimeClientRef.current = null;
      }
      
      // Clean up signaling data from API
      if (presentationSessionId.current) {
        console.log('Unmounting RemoteController - cleaning up signaling data');
        fetch(`/api/remote-presentation/signaling?sessionId=${presentationSessionId.current}`, {
          method: 'DELETE'
        }).catch(error => {
          console.error('Error cleaning up signaling data:', error);
        });
        
        // Also remove pairing if needed
        if (isPaired && pairingCode) {
          console.log('Unmounting RemoteController - removing pairing');
          fetch('/api/remote-presentation/update-pairing', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              presentationId,
              pairingCode,
              action: 'unpair',
            }),
          }).catch(error => {
            console.error('Error unpairing controller:', error);
          });
        }
      }
    };
  }, [isPaired, pairingCode, presentationId]);
  
  // Send command to remote screen
  const sendCommandToRemote = (type: MessageType, data: Record<string, unknown> = {}) => {
    if (!webrtcRef.current || !webrtcRef.current.isConnected()) {
      console.warn('Cannot send command - WebRTC not connected');
      return false;
    }
    
    const message: RTCMessage = {
      type,
      data: {
        ...data,
        timestamp: Date.now()
      }
    };
    
    return webrtcRef.current.sendMessage(message);
  };
  
  // Handle navigation to next slide
  const handleNext = () => {
    if (currentPromptIndex < prompts.length - 1) {
      const nextIndex = currentPromptIndex + 1;
      const nextPrompt = prompts[nextIndex];
      
      // Send command to remote screen
      sendCommandToRemote('next', { 
        maxIndex: prompts.length - 1
      });
      
      // Update local state
      setCurrentPromptIndex(nextIndex);
      
      // Also send slide content
      sendCommandToRemote('updateSlide', { 
        content: {
          title: nextPrompt?.text || 'Slide',
          content: nextPrompt?.notes || '',
        }
      });
    }
  };
  
  // Handle navigation to previous slide
  const handlePrevious = () => {
    if (currentPromptIndex > 0) {
      const prevIndex = currentPromptIndex - 1;
      const prevPrompt = prompts[prevIndex];
      
      // Send command to remote screen
      sendCommandToRemote('previous', {
        maxIndex: prompts.length - 1
      });
      
      // Update local state
      setCurrentPromptIndex(prevIndex);
      
      // Also send slide content
      sendCommandToRemote('updateSlide', { 
        content: {
          title: prevPrompt?.text || 'Slide',
          content: prevPrompt?.notes || '',
        }
      });
    }
  };
  
  // Handle exit from presentation mode with improved cleanup
  const handleExit = async () => {
    // Set state immediately to update UI
    setIsConnecting(false);
    connectionAttemptInProgress.current = false;
    
    // Send disconnect command to remote screen if still connected
    if (webrtcRef.current && webrtcRef.current.isConnected()) {
      console.log('Sending disconnect command to remote screen');
      sendCommandToRemote('disconnect');
    }
    
    // Clean up WebRTC connection
    if (webrtcRef.current) {
      console.log('Disconnecting WebRTC connection during exit');
      try {
        await webrtcRef.current.disconnect();
      } catch (err) {
        console.error('Error disconnecting WebRTC:', err);
      } finally {
        webrtcRef.current = null;
      }
    }
    
    // Clean up OpenAI realtime client
    if (realtimeClientRef.current) {
      console.log('Disconnecting realtime client during exit');
      try {
        realtimeClientRef.current.disconnect();
      } catch (err) {
        console.error('Error disconnecting realtime client:', err);
      } finally {
        realtimeClientRef.current = null;
      }
    }
    
    // Also update the API to unpair if needed
    if (isPaired && pairingCode) {
      try {
        console.log('Unpairing controller from presentation');
        await fetch('/api/remote-presentation/update-pairing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            presentationId,
            pairingCode,
            action: 'unpair',
          }),
        });
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
    }
    
    // Call the parent's exit handler
    onExit();
  };
  
  // Timer functionality
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRunning && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, startTime]);
  
  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Toggle timer
  const toggleTimer = () => {
    if (isRunning) {
      setIsRunning(false);
      sendCommandToRemote('pauseTimer');
    } else {
      if (!startTime) {
        setStartTime(Date.now() - elapsedTime * 1000);
      }
      setIsRunning(true);
      sendCommandToRemote('resumeTimer');
    }
  };
  
  // Reset timer
  const resetTimer = () => {
    setIsRunning(false);
    setStartTime(null);
    setElapsedTime(0);
    sendCommandToRemote('resetTimer');
  };
  
  // Start timer with specific minutes
  const startTimerWithMinutes = (minutes: number) => {
    setIsRunning(true);
    setStartTime(Date.now());
    setElapsedTime(0);
    sendCommandToRemote('startTimer', { minutes });
  };
  
 
  return (
    <div className="h-full w-full bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 bg-gray-800 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Presentation Controller</h2>
        <button 
          onClick={handleExit}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
        >
          Exit
        </button>
      </div>
      
      {/* Pairing interface */}
      {!isPaired && (
        <>
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg max-w-md w-full">
            <h3 className="text-2xl font-bold mb-4 text-center">Connect to Presentation Screen</h3>
            
            <p className="mb-6 text-gray-300 text-center">
              Enter the 4-digit code displayed on the presentation screen
            </p>
            
            <div className="mb-6">
              <label htmlFor="pairingCode" className="block text-sm font-medium text-gray-400 mb-2">
                Pairing Code
              </label>
              <input
                id="pairingCode"
                type="text"
                value={pairingCode}
                onChange={handlePairingCodeChange}
                placeholder="Enter 4-digit code"
                maxLength={4}
                className="w-full p-3 bg-gray-700 text-white rounded-lg text-center text-2xl font-bold tracking-wider"
                autoFocus
              />
            </div>
            
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-900 bg-opacity-50 text-red-200 rounded-lg text-center">
                {errorMessage}
              </div>
            )}
            
            <button
              onClick={connectToScreen}
              disabled={isConnecting || pairingCode.length !== 4}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white transition ${
                pairingCode.length === 4 && !isConnecting
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-600 cursor-not-allowed'
              }`}
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
            
          </div>
        </div>
        
        {/* Hidden audio element for OpenAI realtime API */}
        <audio ref={audioElementRef} className="hidden" />
        </>
       )}
  
    {/* Render controller interface when paired */}
    {isPaired && (
    <div className="flex flex-col h-full bg-gray-100">
      <div className="bg-white p-4 shadow-md">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Remote Controller</h2>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm font-mono bg-green-100 text-green-800 py-1 px-2 rounded">
              Code: {pairingCode}
            </span>
            
            <button
              className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              onClick={handleExit}
              aria-label="Exit presentation mode"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-auto">
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium mb-2">Current Slide</h3>
          <p className="text-xl font-bold mb-4">{prompts[currentPromptIndex]?.text || 'No title'}</p>
          <p className="text-gray-600">{prompts[currentPromptIndex]?.notes || 'No notes'}</p>
        </div>
        
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium mb-2">Voice Transcription</h3>
          <div className="bg-gray-50 p-3 rounded min-h-20 max-h-40 overflow-y-auto">
            {transcript || <span className="text-gray-400">Start speaking to see transcription...</span>}
          </div>
        </div>
        
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium mb-2">Navigation</h3>
          <div className="flex justify-between">
            <button
              className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300"
              onClick={handlePrevious}
              disabled={currentPromptIndex === 0}
            >
              Previous
            </button>
            
            <div className="text-center">
              <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700">
                {currentPromptIndex + 1} / {prompts.length}
              </span>
            </div>
            
            <button
              className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300"
              onClick={handleNext}
              disabled={currentPromptIndex === prompts.length - 1}
            >
              Next
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium mb-2">Timer Controls</h3>
          
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl font-mono">
              {formatTime(elapsedTime)}
            </div>
            
            <div className="flex space-x-2">
              <button
                className={`p-2 rounded ${isRunning ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}
                onClick={toggleTimer}
              >
                {isRunning ? 'Pause' : 'Resume'}
              </button>
              
              <button
                className="p-2 bg-red-100 text-red-700 rounded"
                onClick={resetTimer}
              >
                Reset
              </button>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              className="flex-1 py-1 px-2 bg-blue-100 text-blue-700 rounded"
              onClick={() => startTimerWithMinutes(1)}
            >
              1 min
            </button>
            <button
              className="flex-1 py-1 px-2 bg-blue-100 text-blue-700 rounded"
              onClick={() => startTimerWithMinutes(2)}
            >
              2 min
            </button>
            <button
              className="flex-1 py-1 px-2 bg-blue-100 text-blue-700 rounded"
              onClick={() => startTimerWithMinutes(5)}
            >
              5 min
            </button>
            <button
              className="flex-1 py-1 px-2 bg-blue-100 text-blue-700 rounded"
              onClick={() => startTimerWithMinutes(10)}
            >
              10 min
            </button>
          </div>
        </div>
      </div>
      
      {/* Hidden audio element for OpenAI realtime API */}
      <audio ref={audioElementRef} className="hidden" />
    </div>
    )}
    </div>
  );
}
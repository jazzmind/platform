"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { ProcessedContent } from './types';

interface SpeechProcessorProps {
  onSpeechResult: (text: string) => void;
  onProcessedContent: (content: ProcessedContent) => void;
  onNavigationCommand?: (command: 'next' | 'previous') => void;
  isActive: boolean;
  referenceContent?: string;
  currentSlide?: ProcessedContent;
  talkingPoint?: string;
  talkingPointNotes?: string;
}

// Define types for Speech Recognition
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  onspeechstart?: () => void;
  onspeechend?: () => void;
  onnomatch?: () => void;
}

export default function SpeechProcessor({ 
  onSpeechResult, 
  onProcessedContent,
  onNavigationCommand,
  isActive,
  referenceContent,
  currentSlide,
  talkingPoint,
  talkingPointNotes
}: SpeechProcessorProps) {
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentTalkingPointRef = useRef<string | undefined>(talkingPoint);
  const lastProcessedTextRef = useRef<string>("");

  // When talking point changes, abort any pending API calls
  useEffect(() => {
    if (currentTalkingPointRef.current !== talkingPoint) {
      console.log('Talking point changed from', currentTalkingPointRef.current, 'to', talkingPoint);
      
      // Abort any pending API calls
      if (abortControllerRef.current) {
        console.log('Aborting pending API calls due to talking point change');
        abortControllerRef.current.abort();
      }
      
      // Clear any pending processing timeouts
      if (processingTimeoutRef.current) {
        console.log('Clearing processing timeout due to talking point change');
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
      
      // Reset transcript for the new talking point
      console.log('Resetting transcript due to talking point change');
      setTranscript("");
      lastProcessedTextRef.current = "";
      
      // Update the ref
      currentTalkingPointRef.current = talkingPoint;
    }
  }, [talkingPoint]);

  // Check for navigation commands in transcript
  const checkForNavigationCommands = useCallback((text: string) => {
    if (!onNavigationCommand) return false;
    
    const lowerText = text.toLowerCase().trim();
    
    // Check for "next slide" command (with some variations)
    if (
      lowerText.includes('next slide') || 
      lowerText.includes('go to next slide') ||
      lowerText.includes('move to next slide') ||
      lowerText.includes('show next slide') ||
      lowerText.endsWith('next')
    ) {
      console.log('Next slide command detected');
      onNavigationCommand('next');
      return true;
    }
    
    // Check for "previous slide" command (with some variations)
    if (
      lowerText.includes('previous slide') || 
      lowerText.includes('go to previous slide') ||
      lowerText.includes('move to previous slide') ||
      lowerText.includes('show previous slide') ||
      lowerText.includes('go back') ||
      lowerText.includes('go back to previous slide') ||
      lowerText.endsWith('previous') ||
      lowerText.endsWith('back')
    ) {
      console.log('Previous slide command detected');
      onNavigationCommand('previous');
      return true;
    }
    
    return false;
  }, [onNavigationCommand]);

  // Test API connection function
  const testApiConnection = useCallback(async () => {
    try {
      console.log('Testing API connection...');
      const response = await fetch('/api/test-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'This is a test message' }),
      });
      
      console.log('Test API status:', response.status);
      const result = await response.json();
      console.log('Test API response:', result);
      
      // Now test the speech process API with a minimal payload
      console.log('Testing speech process API...');
      const speechResponse = await fetch('/api/speech-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          recentText: 'This is a test of the speech process API. It should generate a simple slide.', 
          currentSlideText: 'This is a test of the speech process API. It should generate a simple slide.',
          referenceContent: '' 
        }),
      });
      
      console.log('Speech API status:', speechResponse.status);
      if (speechResponse.ok) {
        const speechResult = await speechResponse.json();
        console.log('Speech API response:', speechResult);
      } else {
        const errorText = await speechResponse.text();
        console.error('Speech API error:', errorText);
      }
    } catch (error) {
      console.error('Error testing API connection:', error);
    }
  }, []);
  
  // Use a ref to track whether API test has been run
  const hasTestedApiRef = useRef(false);
  
  // Run API test only once on component mount
  useEffect(() => {
    if (!hasTestedApiRef.current) {
      console.log('Running API test once');
      testApiConnection();
      hasTestedApiRef.current = true;
    }
  }, [testApiConnection]);

  // Process transcript with OpenAI to extract meaningful content
  const processWithOpenAI = useCallback(async (text: string) => {
    console.log('Attempting to process text with OpenAI:', text.substring(0, 50) + '...');
    
    if (text.trim().length < 10) {
      console.log('Text too short, not processing');
      return;
    }
    
    // Skip if this exact text was already processed (prevent duplicates during transitions)
    if (lastProcessedTextRef.current === text) {
      console.log('Skipping processing - text already processed');
      return;
    }
    
    // Check for navigation commands first
    if (checkForNavigationCommands(text)) {
      console.log('Navigation command processed, skipping OpenAI processing');
      return;
    }
    
    // Update last processed text
    lastProcessedTextRef.current = text;
    
    try {
      console.log('CRITICAL DEBUG - Sending request to speech-process API - THIS SHOULD APPEAR IN LOGS');
      const apiUrl = `/api/speech-process`;
      console.log('API URL:', apiUrl);
      
      // Create a new AbortController for this request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      
      const payload = { 
        recentText: text,
        currentSlideText: text,
        referenceContent,
        currentSlide,
        talkingPoint,
        talkingPointNotes
      };
      console.log('Payload size:', JSON.stringify(payload).length, 'characters');
      console.log('Payload text preview:', text.substring(0, 100) + '...');
      console.log('Using talking point:', talkingPoint || 'None');
      
      console.log('About to call fetch() - watch for network request in DevTools');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal
      });
      
      console.log('Fetch completed! Response status:', response.status);
      console.log('Response OK:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`API responded with status: ${response.status}, message: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Received API response:', result);
      onProcessedContent(result);
    } catch (error) {
      // Check if this was an abort error (which is expected behavior)
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('API request was aborted due to talking point change');
      } else {
        console.error('Error processing with OpenAI:', error);
      }
    }
  }, [referenceContent, currentSlide, talkingPoint, talkingPointNotes, onProcessedContent, checkForNavigationCommands]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setErrorMessage(null);
        console.log('Started speech recognition');
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setErrorMessage("Failed to start speech recognition.");
      }
    }
  }, []);
  
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        // Ignore errors when stopping
        console.log('Error stopping recognition', error);
      }
      setIsListening(false);
      console.log('Stopped speech recognition');
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    console.log('Initializing speech recognition, isActive:', isActive);
    
    if (typeof window !== 'undefined') {
      console.log('Browser detected, checking for SpeechRecognition API');
      
      // Get the appropriate SpeechRecognition constructor
      // @ts-expect-error - Browser specific implementations
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognitionAPI) {
        console.error('Speech recognition not supported in this browser');
        setErrorMessage("Speech recognition not supported in this browser. Try Chrome or Edge.");
        return;
      }
      
      console.log('SpeechRecognition API found');
      
      const initializeRecognition = () => {
        console.log('Initializing recognition instance');
        if (recognitionRef.current) {
          // Clean up previous instance
          try {
            recognitionRef.current.stop();
          } catch (error) {
            // Ignore errors when stopping
            console.log('Error stopping recognition', error);
          }
        }
      
        try {
          // Create a new instance
          recognitionRef.current = new SpeechRecognitionAPI();
          console.log('New recognition instance created');
          
          // Configure the recognition
          if (recognitionRef.current) {
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';
            
            // Add more event handlers for debugging
            recognitionRef.current.onspeechstart = () => {
              console.log('Speech has been detected');
            };
            
            recognitionRef.current.onspeechend = () => {
              console.log('Speech has stopped being detected');
            };
            
            recognitionRef.current.onnomatch = () => {
              console.log('No speech was recognized');
            };
            
            recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
              console.log('Speech recognition result received', event);
              
              let interimTranscript = '';
              let finalTranscript = '';
              
              // Log the structure of the event results
              console.log('Results length:', Object.keys(event.results).length);
              console.log('ResultIndex:', event.resultIndex);
              
              for (let i = event.resultIndex; i < Object.keys(event.results).length; i++) {
                const transcript = event.results[i][0].transcript;
                console.log(`Result ${i}:`, transcript, 'isFinal:', event.results[i].isFinal);
                
                if (event.results[i].isFinal) {
                  finalTranscript += transcript + ' ';
                } else {
                  interimTranscript += transcript;
                }
              }
              
              console.log('Final transcript:', finalTranscript);
              console.log('Interim transcript:', interimTranscript);
              
              // Update transcript (append to existing)
              if (finalTranscript) {
                console.log('Current transcript:', transcript);
                // Create a proper combined transcript
                const updatedTranscript = transcript ? `${transcript} ${finalTranscript}`.trim() : finalTranscript.trim();
                console.log('Updated transcript:', updatedTranscript);
                
                setTranscript(updatedTranscript);
                onSpeechResult(updatedTranscript + (interimTranscript ? ` (${interimTranscript})` : ''));
                
                // Process with OpenAI after a short delay if we have final results
                if (processingTimeoutRef.current) {
                  clearTimeout(processingTimeoutRef.current);
                  console.log('Cleared existing processing timeout');
                }
                
                console.log('Setting timeout to process transcript - this should appear in logs!');
                
                // Force immediate processing for debugging
                console.log('*** IMPORTANT: Forcing immediate processing of transcript ***');
                processWithOpenAI(updatedTranscript);
                
                // Also set the timeout as a backup
                processingTimeoutRef.current = setTimeout(() => {
                  console.log('Processing transcript with OpenAI after delay (timeout version)');
                  processWithOpenAI(updatedTranscript);
                }, 3000); // Increase to 3 seconds for better batching
              } else if (interimTranscript) {
                // Just update the ongoing speech text
                onSpeechResult(transcript + (interimTranscript ? ` (${interimTranscript})` : ''));
              }
            };
            
            recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
              console.error('Speech recognition error', event.error);
              setErrorMessage(`Error: ${event.error}`);
              
              // Restart recognition after error (except for no-speech or aborted)
              if (event.error !== 'no-speech' && event.error !== 'aborted' && isListening) {
                restartRecognition();
              }
            };
            
            recognitionRef.current.onend = () => {
              console.log('Speech recognition ended');
              
              // Restart if still supposed to be listening
              if (isListening) {
                console.log('Speech recognition ended, but we should still be listening. Restarting...');
                // Delay restart to avoid rapid restarts 
                restartTimeoutRef.current = setTimeout(() => {
                  console.log('Attempting to restart speech recognition');
                  if (recognitionRef.current) {
                    try {
                      // Cast to SpeechRecognition to fix TypeScript errors
                      (recognitionRef.current as SpeechRecognition).start();
                      console.log('Speech recognition restarted');
                    } catch (err) {
                      console.error('Error starting recognition:', err);
                    }
                  } else {
                    console.log('Recognition reference is null, reinitializing');
                    initializeRecognition();
                    if (recognitionRef.current) {
                      try {
                        // Cast to SpeechRecognition to fix TypeScript errors
                        (recognitionRef.current as SpeechRecognition).start();
                        console.log('Speech recognition initialized and started');
                      } catch (err) {
                        console.error('Error starting newly initialized recognition:', err);
                      }
                    }
                  }
                }, 300);
              }
            };
          }
        } catch (error) {
          console.error('Error initializing speech recognition:', error);
        }
      };
      
      // Initialize recognition
      initializeRecognition();
      
      // Function to restart recognition after it ends
      const restartRecognition = () => {
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
        }
        
        restartTimeoutRef.current = setTimeout(() => {
          if (isListening) {
            console.log('Restarting speech recognition');
            try {
              initializeRecognition();
              recognitionRef.current?.start();
            } catch (error) {
              console.error('Failed to restart speech recognition:', error);
            }
          }
        }, 300); // Small delay before restarting
      };
    }
    
    return () => {
      // Clean up
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // Ignore errors when stopping
          console.log('Error stopping recognition', error);
        }
      }
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [onSpeechResult, isListening, transcript, processWithOpenAI, isActive]);
  
  // Start/stop listening based on isActive prop  
  useEffect(() => {
    // Add debugging for speech activity
    console.log('Speech processor active state changed:', isActive);
    console.log('Current listening state:', isListening);
    
    if (isActive && !isListening && recognitionRef.current) {
      startListening();
    } else if (!isActive && isListening && recognitionRef.current) {
      stopListening();
    }
    
    return () => {
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // Ignore errors when stopping
          console.log('Error stopping recognition', error);
        }
        setIsListening(false);
      }
    };
  }, [isActive, isListening, startListening, stopListening]);
  
  // Test if the microphone is actually recording
  const testMicrophoneAudio = useCallback(() => {
    console.log('Testing microphone audio levels');
    
    // Request microphone access
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        // Create an audio context
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        const javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
        
        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;
        
        microphone.connect(analyser);
        analyser.connect(javascriptNode);
        javascriptNode.connect(audioContext.destination);
        
        // Listen for audio process events
        javascriptNode.onaudioprocess = () => {
          const array = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(array);
          
          // Calculate average volume
          let values = 0;
          for (let i = 0; i < array.length; i++) {
            values += array[i];
          }
          const average = values / array.length;
          
          console.log('Microphone volume level:', average);
          
          // Show a message if volume is too low
          if (average < 10) {
            setErrorMessage("Microphone volume appears to be very low. Please speak louder or check your microphone settings.");
          } else {
            setErrorMessage(null);
          }
          
          // Clean up after 3 seconds
          setTimeout(() => {
            javascriptNode.disconnect();
            analyser.disconnect();
            microphone.disconnect();
            stream.getTracks().forEach(track => track.stop());
          }, 3000);
        };
      })
      .catch(error => {
        console.error('Error accessing microphone:', error);
        setErrorMessage('Could not access microphone. Please check permissions.');
      });
  }, []);

  // Render UI for speech processor
  return (
    <div className="speech-processor">
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {errorMessage}
        </div>
      )}
      
      <div className="flex items-center gap-2 mb-4">
        <div 
          className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}
        />
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {isListening ? 'Listening...' : 'Not listening'}
        </span>
        
        {/* Manual microphone access trigger */}
        <button
          onClick={() => {
            console.log('Manual microphone trigger clicked');
            testMicrophoneAudio();
            // Request microphone permission explicitly
            navigator.mediaDevices.getUserMedia({ audio: true })
              .then(() => {
                console.log('Microphone permission granted');
                if (!isListening) {
                  startListening();
                }
              })
              .catch(error => {
                console.error('Microphone permission denied:', error);
                setErrorMessage('Microphone access denied. Please allow microphone access in your browser settings.');
              });
          }}
          className="ml-auto bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm"
        >
          Test Mic
        </button>
      </div>
    </div>
  );
} 
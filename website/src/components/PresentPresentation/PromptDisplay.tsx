"use client";

import { useEffect, useState } from 'react';
import { Prompt } from './PromptsReader';

interface PromptDisplayProps {
  prompt: Prompt;
  onPromptComplete: () => void;
  isPaused: boolean;
}

export default function PromptDisplay({ 
  prompt, 
  onPromptComplete,
  isPaused
}: PromptDisplayProps) {
  const [timeRemaining, setTimeRemaining] = useState(prompt.duration);
  const [progress, setProgress] = useState(100);
  
  // Reset timer when prompt changes
  useEffect(() => {
    setTimeRemaining(prompt.duration);
    setProgress(100);
  }, [prompt]);
  
  // Handle timer countdown
  useEffect(() => {
    if (isPaused) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onPromptComplete();
          return 0;
        }
        return prev - 1;
      });
      
      setProgress(() => {
        const newProgress = (timeRemaining / prompt.duration) * 100;
        return Math.max(0, newProgress);
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [prompt.duration, timeRemaining, onPromptComplete, isPaused]);
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  console.debug('[PromptDisplay] rendering', { prompt, isPaused, timeRemaining });
  return (
    <div className="prompt-display bg-gray-800 p-4 rounded-lg text-center">
      <div className="mb-4">
        <span className="text-xs text-gray-400">CURRENT PROMPT</span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">{prompt.text}</h2>
        
        {prompt.notes && (
          <p className="mt-2 text-gray-300 text-sm italic">
            {prompt.notes}
          </p>
        )}
      </div>
      
      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-red-500 transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="mt-2 flex justify-between text-xs text-gray-400">
        <span>Time remaining</span>
        <span>{formatTime(timeRemaining)}</span>
      </div>
    </div>
  );
} 
'use client';

import { useState, useEffect } from 'react';

interface PresentationControllerProps {
  pairingCode: string;
}

export default function PresentationController({ pairingCode }: PresentationControllerProps) {
  const [isPaired, setIsPaired] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    // Example of checking pairing status
    const checkPairingStatus = async () => {
      try {
        const response = await fetch(`/api/remote-presentation/check-pairing/${pairingCode}`);
        const data = await response.json();
        setIsPaired(data.isPaired);
      } catch (error) {
        console.error('Failed to check pairing status:', error);
      }
    };

    if (pairingCode) {
      checkPairingStatus();
      // Set up polling for status
      const interval = setInterval(checkPairingStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [pairingCode]);

  const handleNext = async () => {
    try {
      await fetch('/api/remote-presentation/update-pairing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pairingCode,
          command: 'next',
        }),
      });
      setCurrentSlide(prev => prev + 1);
    } catch (error) {
      console.error('Failed to send next command:', error);
    }
  };

  const handlePrevious = async () => {
    try {
      await fetch('/api/remote-presentation/update-pairing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pairingCode,
          command: 'previous',
        }),
      });
      setCurrentSlide(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to send previous command:', error);
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-lg bg-white dark:bg-gray-800">
      <h2 className="text-xl font-semibold mb-4">Presentation Controller</h2>
      <div className="flex items-center mb-4">
        <div className={`w-3 h-3 rounded-full mr-2 ${isPaired ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span>{isPaired ? 'Connected' : 'Disconnected'}</span>
      </div>
      <div className="mb-4">
        <p>Current Slide: {currentSlide}</p>
      </div>
      <div className="flex space-x-2">
        <button 
          onClick={handlePrevious}
          disabled={!isPaired || currentSlide === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Previous
        </button>
        <button 
          onClick={handleNext}
          disabled={!isPaired}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
} 
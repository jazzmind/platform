"use client";

import { useState } from "react";

// Define Collaborator type if not already defined globally
interface Collaborator {
  id: string;
  name: string;
  email: string;
}

interface CollaborationAuthProps {
  eventId: string;
  onAuthenticated: (user: Collaborator) => void;
}

export default function CollaborationAuth({ eventId, onAuthenticated }: CollaborationAuthProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [eventCode, setEventCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !eventCode) {
      setError("All fields are required");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/events/${eventId}/files/collaborate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          eventCode
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Authentication failed");
      }
      
      if (!data.authenticated) {
        throw new Error("Authentication failed - not authenticated");
      }

      if (!data.user || !data.user.id || !data.user.name || !data.user.email) {
        throw new Error("Authentication failed - invalid user data received");
      }
      
      // Close modal and notify parent
      setIsOpen(false);
      onAuthenticated(data.user);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      console.error("Authentication error:", err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
      >
        <svg 
          className="w-5 h-5 mr-2" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" 
          />
        </svg>
        Collaborate
      </button>

      {/* Modal backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          {/* Modal content */}
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              Join Collaboration
            </h2>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Enter your details to start collaborating on event documents.
            </p>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-white dark:bg-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-white dark:bg-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Event Code
                </label>
                <input
                  type="text"
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-white dark:bg-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter the event code"
                />
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  This code was provided by the event organizer.
                </p>
              </div>
              
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white mr-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? 'Submitting...' : 'Join Collaboration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
} 
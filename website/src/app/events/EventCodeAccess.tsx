"use client";

import { useState, useEffect } from "react";
import { PollQuestion } from "@/app/lib/types";

interface EventCodeAccessProps {
  eventId: string;
  accessCode: string;
}

export default function EventCodeAccess({ eventId, accessCode }: EventCodeAccessProps) {
  const [email, setEmail] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [error, setError] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pollResponses, setPollResponses] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [polls, setPolls] = useState<PollQuestion[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load polls from the hidden content when unlocked
  useEffect(() => {
    if (isUnlocked) {
      const pollsContainer = document.getElementById("event-polls-container");
      if (pollsContainer) {
        try {
          const polls = JSON.parse(pollsContainer.dataset.polls || "[]");
          setPolls(polls);
          
          // Initialize poll responses with empty values if not already populated
          if (Object.keys(pollResponses).length === 0) {
            const initialResponses: Record<string, string> = {};
            polls.forEach((poll: PollQuestion) => {
              const questionName = Object.keys(poll)[0];
              initialResponses[questionName] = "";
            });
            setPollResponses(initialResponses);
          }
        } catch (error) {
          console.error("Failed to parse polls data:", error);
        }
      }
    }
  }, [isUnlocked, pollResponses]);
  
  const fetchExistingResponses = async (email: string) => {
    setIsLoading(true);
    setError("");
    
    try {
      // Get the datahash from the hidden container
      const datahashContainer = document.getElementById("event-datahash-container");
      if (!datahashContainer || !datahashContainer.dataset.hash) {
        throw new Error("Could not find datahash");
      }
      
      const datahash = datahashContainer.dataset.hash;
      
      // Fetch the existing responses from the API
      const response = await fetch(`/api/events/${eventId}/polls?datahash=${datahash}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // No submissions yet - that's okay
          return false;
        }
        
        // Some other error
        const data = await response.json();
        throw new Error(data.message || 'Failed to retrieve previous submissions');
      }
      
      // Parse the CSV data
      const csvText = await response.text();
      const rows = csvText.trim().split('\n');
      
      if (rows.length < 2) {
        // Just the header row, no submissions
        return false;
      }
      
      // Parse the header row to get field names
      const headers = parseCSVRow(rows[0]);
      const emailIndex = headers.indexOf('email');
      
      if (emailIndex === -1) {
        throw new Error('Invalid CSV format: email column not found');
      }
      
      // Find the user's submission
      for (let i = 1; i < rows.length; i++) {
        const rowData = parseCSVRow(rows[i]);
        const rowEmail = rowData[emailIndex];
        
        if (rowEmail.toLowerCase() === email.toLowerCase()) {
          // Found the user's submission
          const userResponses: Record<string, string> = {};
          
          // Populate responses from CSV
          for (let j = 2; j < headers.length; j++) { // Skip email and timestamp
            if (j < rowData.length) {
              userResponses[headers[j]] = rowData[j];
            }
          }
          
          setPollResponses(userResponses);
          setIsUpdating(true);
          return true;
        }
      }
      
      // No existing submission for this email
      return false;
    } catch (error) {
      console.error("Error fetching existing responses:", error);
      setError(error instanceof Error ? error.message : 'Failed to retrieve existing responses');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to parse CSV rows (handles quoted values)
  const parseCSVRow = (row: string): string[] => {
    const result = [];
    let inQuotes = false;
    let currentValue = '';
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        // Toggle quote state
        inQuotes = !inQuotes;
        
        // Handle escaped quotes (two double quotes in a row)
        if (i < row.length - 1 && row[i + 1] === '"') {
          currentValue += '"';
          i++; // Skip the next quote
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Add the last field
    result.push(currentValue);
    return result;
  };
  
  const handleUnlock = async () => {
    // Clear any previous error
    setError("");
    
    // Validate email
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    
    // Verify access code
    if (inputCode.trim() === accessCode) {
      setIsUnlocked(true);
      
      // Unlock the content by showing the hidden div
      const eventPrivateContent = document.getElementById("event-private-content");
      if (eventPrivateContent) {
        eventPrivateContent.classList.remove("hidden");
        eventPrivateContent.classList.add("block");
      }
      
      // Hide the form
      const eventCodeForm = document.getElementById("event-code-form");
      if (eventCodeForm) {
        eventCodeForm.classList.add("hidden");
      }
      
      // Check for existing responses
      await fetchExistingResponses(email);
    } else {
      setError("Invalid access code. Please try again.");
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleUnlock();
    }
  };
  
  const handlePollChange = (questionName: string, value: string) => {
    setPollResponses(prev => ({
      ...prev,
      [questionName]: value
    }));
  };
  
  const handleSubmitPolls = async () => {
    // Validate that all polls have responses
    const unansweredQuestions = Object.entries(pollResponses)
      .filter(([, value]) => !value)
      .map(([key]) => key);
      
    if (unansweredQuestions.length > 0) {
      setError(`Please answer all poll questions before submitting.`);
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    
    try {
      const response = await fetch(`/api/events/${eventId}/polls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          responses: pollResponses,
          isUpdate: isUpdating
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to save poll responses');
      }
      
      setIsSubmitted(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isUnlocked && isSubmitted) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Thank You!</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Your responses have been {isUpdating ? 'updated' : 'recorded'}. We look forward to seeing you at the event!
        </p>
      </div>
    );
  }
  
  if (isUnlocked) {
    return (
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <svg className="animate-spin h-10 w-10 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="ml-3 text-gray-700 dark:text-gray-300">Checking for previous submissions...</span>
          </div>
        ) : (
          <>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
              <p className="text-gray-700 dark:text-gray-300 font-semibold">
                {isUpdating 
                  ? "We found your previous responses. You can review and update them below."
                  : "Please complete the following quick poll to help us prepare for the event."}
              </p>
            </div>
            
            {polls.map((poll, index) => {
              const questionName = Object.keys(poll)[0];
              const options = poll[questionName];
              
              return (
                <div key={index} className="mb-6">
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-3">{questionName}</h3>
                  
                  <div className="space-y-2">
                    {options.map((option: string, optionIndex: number) => (
                      <label key={optionIndex} className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name={`poll-${index}`}
                          value={option}
                          checked={pollResponses[questionName] === option}
                          onChange={() => handlePollChange(questionName, option)}
                          className="mt-1 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-gray-700 dark:text-gray-300">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="pt-4">
              <button
                type="button"
                onClick={handleSubmitPolls}
                disabled={isSubmitting}
                className={`w-full ${
                  isSubmitting 
                    ? "bg-gray-400 cursor-not-allowed" 
                    : "bg-red-600 hover:bg-red-700"
                } text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isUpdating ? "Updating..." : "Submitting..."}
                  </>
                ) : (
                  isUpdating ? "Update Responses" : "Submit Responses"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }
  
  return (
    <div id="event-code-form" className="space-y-4">
      <p className="text-gray-600 dark:text-gray-300">
        Enter your email and the access code provided after registration to view detailed event information and submit poll responses.
      </p>
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={`w-full px-4 py-2 border ${
            error && !email ? "border-red-500" : "border-gray-300 dark:border-gray-600"
          } rounded-lg focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
        />
      </div>
      
      <div>
        <label htmlFor="access-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Access Code <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="access-code"
          name="access-code"
          value={inputCode}
          onChange={(e) => setInputCode(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter code"
          className={`w-full px-4 py-2 border ${
            error && !inputCode ? "border-red-500" : "border-gray-300 dark:border-gray-600"
          } rounded-lg focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
        />
      </div>
      
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
      
      <button
        type="button"
        onClick={handleUnlock}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
      >
        Unlock Content
      </button>
    </div>
  );
} 
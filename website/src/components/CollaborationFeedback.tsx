"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Check, HelpCircle, User, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// Type definitions
type FeedbackType = 'endorse' | 'challenge';

interface Selection {
  text: string;
  startOffset: number;
  endOffset: number;
}

interface Feedback {
  id: string;
  fileId: string;
  userId: string;
  userName: string;
  isAnonymous: boolean;
  type: FeedbackType;
  text: string;
  selection: Selection | null;
  createdAt: string;
}

interface Collaborator {
  id: string;
  name: string;
  email: string;
}

interface CollaborationFeedbackProps {
  eventId: string;
  fileId: string;
  isAuthenticated: boolean;
  currentUser?: Collaborator;
  onRequireAuth?: () => void;
  onShowComments?: () => void;
  selection: Selection | null;
  onClearSelection: () => void;
  setHighlightedSelection: (selection: Selection | null) => void;
  feedbackItems: Feedback[];
  setFeedbackItems: (items: Feedback[] | ((prev: Feedback[]) => Feedback[])) => void;
  isLoading?: boolean; // The loading state from parent component
}

const CollaborationFeedback: React.FC<CollaborationFeedbackProps> = ({
  eventId,
  fileId,
  isAuthenticated,
  currentUser,
  onRequireAuth,
  onShowComments,
  selection,
  onClearSelection,
  setHighlightedSelection,
  feedbackItems,
  setFeedbackItems,
  isLoading = false, // Default to false if not provided
}) => {
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Feedback form state
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Handle feedback icon click
  const handleFeedbackIconClick = (feedbackId: string) => {
    setSelectedFeedback(feedbackId === selectedFeedback ? null : feedbackId);
    const element = document.getElementById(`feedback-${feedbackId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Handle feedback type selection
  const handleFeedbackTypeSelect = (type: FeedbackType) => {
    setFeedbackType(type);
    setShowFeedbackForm(true);
  };

  // Submit feedback
  const handleSubmitFeedback = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!feedbackText || !feedbackType) {
      setError('Please provide feedback text and select a feedback type');
      return;
    }

    if (!currentUser) {
      setError('You must be authenticated to submit feedback');
      return;
    }

    setError(null);
    setSubmitting(true);
    
    try {
      // Log detailed user info when submitting
      console.log('Submitting feedback as user:', currentUser);
      
      const payload = {
        fileId,
        type: feedbackType,
        selectedText: selection?.text || '',
        comment: feedbackText,
        isPublic: !isAnonymous,
        // Include userId in payload to ensure proper attribution
        collaboratorId: currentUser.id
      };

      console.log('Submitting feedback payload:', payload);

      const response = await fetch(`/api/events/${eventId}/files/collaborate/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to submit feedback');
      }
      
      const data = await response.json();
      console.log('Feedback submission response:', data);
      
      // Create a new feedback item with clear user information
      const newFeedback: Feedback = {
        id: data.feedbackId || `feedback-${Math.random().toString(36).substr(2, 9)}`,
        fileId,
        userId: currentUser.id, // Use currentUser.id directly
        userName: isAnonymous ? 'Anonymous' : currentUser.name || 'Unknown User',
        isAnonymous,
        type: feedbackType,
        text: feedbackText,
        selection,
        createdAt: new Date().toISOString()
      };
      
      console.log('Adding new feedback to UI:', newFeedback);
      setFeedbackItems(prev => [...prev, newFeedback]);
      
      // Reset form
      setShowFeedbackForm(false);
      setFeedbackType(null);
      setFeedbackText('');
      setIsAnonymous(false);
      onClearSelection();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      const message = error instanceof Error ? error.message : 'Failed to submit feedback. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete feedback handler
  const handleDeleteFeedback = async (feedbackIdToDelete: string, feedbackItem: Feedback) => {
    setDeletingId(feedbackIdToDelete);
    setError(null);

    // Log the detailed user information for debugging
    console.log('Delete attempt for feedback:', feedbackIdToDelete);
    console.log('Current user:', currentUser);
    console.log('Feedback author:', {
      userId: feedbackItem.userId, 
      userName: feedbackItem.userName,
      isAnonymous: feedbackItem.isAnonymous
    });

    try {
      const response = await fetch(`/api/events/${eventId}/files/collaborate/feedback?feedbackId=${feedbackIdToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete feedback');
      }

      console.log('Feedback deleted successfully, removing from UI');
      // Optimistically remove feedback from UI
      setFeedbackItems(prev => prev.filter(item => item.id !== feedbackIdToDelete));

    } catch (err) {
      console.error('Error deleting feedback:', err);
      const message = err instanceof Error ? err.message : 'Failed to delete feedback. Please try again.';
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  // Render feedback list
  const renderFeedbackList = () => {
    if (isLoading) {
      return <p className="text-center my-4 text-gray-500 dark:text-gray-400">Loading feedback...</p>;
    }
    
    if (error && !isLoading) {
      return <p className="text-center text-red-500 my-4">Error: {error}</p>;
    }
    
    if (feedbackItems.length === 0 && !isLoading) {
      return (
        <p className="text-center text-gray-500 dark:text-gray-400 my-4">
          No feedback yet. Highlight text to add a comment, or add a general comment below.
        </p>
      );
    }

    return (
      <div className="space-y-4 mt-4">
        {feedbackItems.map((item) => {
          // Use the isCommentAuthor function to check ownership
          const canDelete = isCommentAuthor(item);
          
          return (
            <div
              id={`feedback-${item.id}`}
              key={item.id}
              className={`bg-white dark:bg-gray-900 rounded-lg shadow p-4 transition-all duration-300 ${
                selectedFeedback === item.id
                  ? 'ring-2 ring-yellow-400 scale-105'
                  : 'ring-1 ring-gray-200 dark:ring-gray-700'
              } ${
                item.type === 'endorse'
                  ? 'border-l-4 border-l-green-500'
                  : 'border-l-4 border-l-blue-500'
              }`}
              onMouseEnter={() => item.selection && setHighlightedSelection(item.selection)}
              onMouseLeave={() => setHighlightedSelection(null)}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 p-1.5 rounded-full text-white ${ 
                  item.type === 'endorse' 
                    ? 'bg-green-500' 
                    : 'bg-blue-500'
                }`}>
                  {item.type === 'endorse' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <HelpCircle className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <div className="font-medium text-sm flex items-center gap-1 text-gray-800 dark:text-gray-200">
                      {item.isAnonymous ? (
                        <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 italic">
                          <User className="h-3 w-3" /> Anonymous
                        </span>
                      ) : (
                        item.userName || "Unknown User"
                      )}
                    </div>
                    <div className="flex items-center">
                      <div className="text-xs text-gray-400 dark:text-gray-500 mr-2">
                        {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      {/* Show delete button for all comments authored by the current user */}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteFeedback(item.id, item)}
                          disabled={deletingId === item.id}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed p-1 rounded"
                          title="Delete comment"
                        >
                          {deletingId === item.id ? (
                            <svg className="animate-spin h-4 w-4 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  {item.selection && (
                     <button 
                        className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded mb-2 italic text-left w-full block text-gray-600 dark:text-gray-400"
                        onClick={() => handleFeedbackIconClick(item.id)}
                        title="See related text"
                      >
                      &ldquo;{item.selection.text.length > 80 ? item.selection.text.substring(0, 80) + '...' : item.selection.text}&rdquo;
                    </button>
                  )}
                  <div className="text-sm text-gray-700 dark:text-gray-300 prose dark:prose-invert max-w-none prose-sm">
                    {item.text}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Use onRequireAuth when authentication is needed
  useEffect(() => {
    if (!isAuthenticated && onRequireAuth) {
      onRequireAuth();
    }
    
    // Log authentication state when component mounts
    console.log("CollaborationFeedback auth state:", {
      isAuthenticated,
      currentUser,
      fileId
    });
  }, [isAuthenticated, onRequireAuth, fileId, currentUser]);

  // Use onShowComments when comments are shown
  useEffect(() => {
    if (feedbackItems.length > 0 && onShowComments) {
      onShowComments();
    }
  }, [feedbackItems.length, onShowComments]);

  // Function to check if the current user is the author of a comment
  const isCommentAuthor = useCallback((item: Feedback) => {
    const idsMatch = currentUser?.id === item.userId;
    console.log(`Author check for ${item.id}:`, {
      commentUserId: item.userId,
      currentUserId: currentUser?.id,
      match: idsMatch
    });
    return idsMatch;
  }, [currentUser]);

  return (
    <div className="relative">
      {/* Selection Actions */}
      <AnimatePresence>
        {selection && (
          <motion.div
            className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="mb-2 italic text-sm text-gray-600 dark:text-gray-300">
              Selected text:
              <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                &ldquo;{selection.text}&rdquo;
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="flex-1 py-2 px-3 bg-green-100 hover:bg-green-200 dark:bg-green-800 dark:hover:bg-green-700 text-green-700 dark:text-green-300 rounded"
                onClick={() => handleFeedbackTypeSelect('endorse')}
              >
                <Check className="h-4 w-4 inline mr-1" /> Endorse
              </button>
              <button
                className="flex-1 py-2 px-3 bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-300 rounded"
                onClick={() => handleFeedbackTypeSelect('challenge')}
              >
                <HelpCircle className="h-4 w-4 inline mr-1" /> Challenge
              </button>
              <button
                className="py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                onClick={onClearSelection}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Feedback Form Modal */}
      <AnimatePresence>
        {showFeedbackForm && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black/60 dark:bg-black/80 z-[100] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFeedbackForm(false)}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                {feedbackType === 'endorse' ? 'Endorse Selection' : 'Challenge Selection'}
              </h3>
              
              {selection && (
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md mb-4 text-sm italic text-gray-700 dark:text-gray-300 max-h-24 overflow-y-auto">
                  &ldquo;{selection.text}&rdquo;
                </div>
              )}
              
              <div className="mb-4">
                <label htmlFor="feedbackText" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your Comment
                </label>
                <textarea
                  id="feedbackText"
                  placeholder={feedbackType === 'endorse' 
                    ? "Why do you endorse this?" 
                    : "What questions or challenges do you have?"}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm"
                  required
                />
              </div>
              
              <div className="flex items-center mb-5">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-offset-gray-800"
                />
                <label htmlFor="anonymous" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Submit anonymously
                </label>
              </div>
              
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
                  onClick={() => {
                    setShowFeedbackForm(false);
                    setFeedbackType(null);
                    setFeedbackText('');
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    submitting
                      ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                      : feedbackType === 'endorse' 
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  } disabled:opacity-70`}
                  onClick={() => handleSubmitFeedback()}
                  disabled={submitting || !feedbackText}
                >
                  {submitting ? "Submitting..." : "Submit Feedback"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Feedback List Section */}
      <div className="mt-6">
        {renderFeedbackList()}
      </div>
    </div>
  );
};

export default CollaborationFeedback; 
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import MarkdownRenderer from "./MarkdownRenderer";
import CollaborationAuth from "./CollaborationAuth";
import CollaborationFeedback from "./CollaborationFeedback";
import SocialShare from "./SocialShare";
import { Info, Check, HelpCircle } from "lucide-react";

// Define Collaborator type if not already defined globally
interface Collaborator {
  id: string;
  name: string;
  email: string;
}

interface FileInfo {
  filename: string;
  description: string;
  type: string;
  size: string;
}

interface Manifest {
  files: FileInfo[];
}

interface Feedback {
  id: string;
  fileId: string;
  userId: string;
  userName: string;
  isAnonymous: boolean;
  type: 'endorse' | 'challenge';
  text: string;
  selection: Selection | null;
  createdAt: string;
}

interface Selection {
  text: string;
  startOffset: number;
  endOffset: number;
}

// Remove the unused RawFeedbackData interface and add a more specific one
interface FeedbackApiItem {
  id?: string;
  type: 'endorse' | 'challenge';
  fileId: string;
  selectedText?: string;
  comment?: string;
  startOffset?: number;
  endOffset?: number;
  timestamp?: string;
  collaboratorId?: string;
  collaboratorName?: string;
  userId?: string;
  userName?: string;
  authorId?: string;
  author?: string;
  isPublic?: boolean;
}

interface FeedbackApiResponse {
  feedback: FeedbackApiItem[];
}

export default function EventFiles({ eventId }: { eventId: string }) {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<Collaborator | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeRightTab, setActiveRightTab] = useState<'files' | 'comments'>('files');
  const [selection, setSelection] = useState<{
    text: string;
    startOffset: number;
    endOffset: number;
  } | null>(null);
  const [feedbackItems, setFeedbackItems] = useState<Feedback[]>([]);
  const [highlightedSelection, setHighlightedSelection] = useState<Selection | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);

  // Check if user is already authenticated for collaboration
  useEffect(() => {
    async function checkAuth() {
      setIsAuthLoading(true);
      try {
        const response = await fetch(`/api/events/${eventId}/files/collaborate`);
        if (response.ok) {
          const data = await response.json();
          console.log('Authentication data:', data);
          setIsAuthenticated(data.authenticated);
          if (data.authenticated && data.user) {
            setCurrentUser(data.user as Collaborator);
            console.log('Current user set:', data.user);
          } else {
            setCurrentUser(null);
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("Error checking authentication:", err);
        setIsAuthenticated(false);
        setCurrentUser(null);
      } finally {
        setIsAuthLoading(false);
      }
    }

    checkAuth();
  }, [eventId]);

  useEffect(() => {
    async function loadManifest() {
      try {
        const response = await fetch(`/api/events/${eventId}/files/manifest`);
        if (!response.ok) {
          throw new Error("Failed to load file manifest");
        }
        const data = await response.json();
        setManifest(data);
      } catch (err) {
        setError("Unable to load files information");
        console.error(err);
      }
    }

    loadManifest();
  }, [eventId]);

  // Previous approach caused race conditions with multiple fetches
  // Let's consolidate feedback fetching and add a loading state
  const fetchFeedback = useCallback(async (targetFileId: string) => {
    if (!targetFileId || !eventId) return;
    
    // Log authentication state for debugging
    console.log("Authentication state when fetching:", {
      isAuthenticated, 
      currentUser,
      eventId,
      targetFileId
    });
    
    // Prevent duplicate fetches
    setIsFeedbackLoading(true);
    
    try {
      // Clear previous feedback before fetching new data
      setFeedbackItems([]);
      
      const response = await fetch(`/api/events/${eventId}/files/collaborate/feedback?fileId=${targetFileId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch feedback');
      }
      
      const data = await response.json() as FeedbackApiResponse;
      console.log('Raw API feedback data:', JSON.stringify(data));
      
      // Wait before updating state to ensure the file is loaded
      if (data.feedback) {
        // First, get the current authenticated collaborator info to cross-reference IDs
        let authInfoResponse;
        try {
          authInfoResponse = await fetch(`/api/events/${eventId}/files/collaborate`);
          const authData = await authInfoResponse.json();
          console.log("Authentication data for ID mapping:", authData);
        } catch (err) {
          console.error("Error fetching auth info for ID mapping:", err);
        }
        
        const transformedFeedback = data.feedback.map((item: FeedbackApiItem) => {
          console.log('Raw feedback item:', item);
          
          // Try to get the user ID from various potential fields
          const feedbackUserId = item.collaboratorId || item.userId || item.authorId || 'anonymous';
          
          const feedbackItem: Feedback = {
            id: item.id || `feedback-${Math.random().toString(36).substr(2, 9)}`,
            fileId: targetFileId,
            userId: feedbackUserId,
            userName: item.collaboratorName || item.userName || item.author || 'Anonymous',
            isAnonymous: !(item.isPublic || false),
            type: item.type as 'endorse' | 'challenge',
            text: item.comment || '',
            selection: item.selectedText ? {
              text: item.selectedText,
              startOffset: item.startOffset || 0,
              endOffset: item.endOffset || (item.startOffset || 0) + item.selectedText.length
            } : null,
            createdAt: item.timestamp || new Date().toISOString()
          };
          
          console.log('Transformed feedback item with userId:', feedbackItem);
          return feedbackItem;
        });
        
        // Only set feedback items if the selected file still matches
        // This prevents race conditions when rapidly switching between files
        if (selectedFile === targetFileId) {
          console.log('Setting feedback items:', transformedFeedback);
          setFeedbackItems(transformedFeedback);
        }
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setIsFeedbackLoading(false);
    }
  }, [eventId, selectedFile, currentUser, isAuthenticated]);

  // Replace the useEffect with a more controlled approach
  useEffect(() => {
    // Reset feedback when file changes
    setFeedbackItems([]);
    
    if (selectedFile) {
      fetchFeedback(selectedFile);
    }
  }, [selectedFile, fetchFeedback]);

  async function loadFileContent(filename: string) {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/events/${eventId}/files/content?filename=${encodeURIComponent(filename)}`);
      if (!response.ok) {
        throw new Error("Failed to load file content");
      }
      
      const content = await response.text();
      setFileContent(content);
      setSelectedFile(filename);
    } catch (err) {
      setError("Error loading file content");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleAuthSuccess = (user: Collaborator) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    if (selectedFile) {
      setActiveRightTab('comments');
    }
  };
  
  const handleShowComments = () => {
    setActiveRightTab('comments');
  };

  const handleAuthRequest = () => {
    // Implementation of handleAuthRequest
  };

  // Handle text selection in the document pane
  const handleTextSelection = () => {
    if (!isAuthenticated || activeRightTab !== 'comments') return;
    
    const currentSelection = window.getSelection();
    if (!currentSelection || currentSelection.isCollapsed) {
      return;
    }
    
    const range = currentSelection.getRangeAt(0);
    const content = currentSelection.toString();
    
    // Calculate offsets relative to the full document
    const preSelectionRange = document.createRange();
    const contentElement = range.commonAncestorContainer.parentElement;
    if (!contentElement) return;
    
    preSelectionRange.selectNodeContents(contentElement);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preSelectionRange.toString().length;
    
    setSelection({
      text: content,
      startOffset: startOffset,
      endOffset: startOffset + content.length
    });
  };

  // Memoized function to render document content with highlights and feedback markers
  const renderDocumentContent = useMemo(() => {
    if (!fileContent) return null;

    // Use a different approach - render the markdown normally
    // and overlay highlights using absolute positioning
    return (
      <div className="relative markdown-content">
        {/* Base markdown content */}
        <div className="prose prose-lg dark:prose-invert max-w-none relative z-10">
          <MarkdownRenderer content={fileContent} />
        </div>
        
        {/* Highlight overlays */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {feedbackItems
            .filter(item => item.selection)
            .map(item => {
              // This is a placeholder - in a real implementation, we would need
              // to calculate the actual position based on character offsets
              // For now, we'll just show indicator buttons that when clicked
              // will highlight the corresponding feedback in the comments pane
              return (
                <div 
                  key={item.id}
                  className="absolute right-0 mt-1"
                  style={{
                    // Simple approach - just place indicators in the margin
                    // A more complex approach would actually highlight the text
                    top: `${(item.selection?.startOffset || 0) / (fileContent.length) * 100}%`,
                  }}
                >
                  <button
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full 
                      ${item.type === 'endorse' ? 'bg-green-500' : 'bg-blue-500'} 
                      text-white cursor-pointer align-middle pointer-events-auto`}
                    onClick={() => {
                      setActiveRightTab('comments');
                      // Scroll to the comment in the right pane
                      const element = document.getElementById(`feedback-${item.id}`);
                      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    title={item.type === 'endorse' ? 'View Endorsement' : 'View Challenge'}
                  >
                    {item.type === 'endorse' ? 
                      <Check className="h-4 w-4" /> : 
                      <HelpCircle className="h-4 w-4" />
                    }
                  </button>
                </div>
              );
            })}
            
          {/* Highlighted selection overlay for hovering */}
          {highlightedSelection && (
            <div
              className="absolute bg-yellow-200 dark:bg-yellow-900 opacity-30 pointer-events-none"
              style={{
                // Simple positioning based on document percentage
                // A real implementation would need more sophisticated positioning
                top: `${(highlightedSelection.startOffset) / (fileContent.length) * 100}%`,
                height: `${(highlightedSelection.endOffset - highlightedSelection.startOffset) / (fileContent.length) * 100}%`,
                left: 0,
                right: 0,
              }}
            />
          )}
        </div>
      </div>
    );
  }, [fileContent, feedbackItems, highlightedSelection, setActiveRightTab]);

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  if (!manifest) {
    return <div className="p-4">Loading document information...</div>;
  }

  if (manifest.files.length === 0) {
    return <div className="p-4">No documents available for this event.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Document Content - now on the left side (2 columns) */}
      <div className="md:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        {selectedFile ? (
          loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">{selectedFile}</h3>
                
                {/* Action buttons */}
                <div className="flex space-x-2">
                  {!isAuthLoading && (
                    <>
                      {!isAuthenticated && (
                        <CollaborationAuth 
                          eventId={eventId}
                          onAuthenticated={handleAuthSuccess}
                        />
                      )}
                      
                      <SocialShare 
                        eventId={eventId}
                        fileId={selectedFile}
                      />
                    </>
                  )}
                </div>
              </div>
              
              <div 
                className="prose prose-lg dark:prose-invert max-w-none markdown-improved selection:bg-red-200 dark:selection:bg-red-800/70"
                onMouseUp={handleTextSelection}
              >
                {renderDocumentContent}
              </div>
            </>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>Select a file to view its content</p>
          </div>
        )}
      </div>

      {/* Right Panel with Tabs - Files & Comments (1 column) */}
      <div className="md:col-span-1 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex" aria-label="Tabs">
            <button
              onClick={() => setActiveRightTab('files')}
              className={`py-3 px-4 text-sm font-medium ${
                activeRightTab === 'files'
                  ? 'border-b-2 border-red-600 text-red-600 dark:text-red-400 dark:border-red-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Files
            </button>
            <button
              onClick={() => setActiveRightTab('comments')}
              className={`py-3 px-4 text-sm font-medium ${
                activeRightTab === 'comments'
                  ? 'border-b-2 border-red-600 text-red-600 dark:text-red-400 dark:border-red-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Comments
              {feedbackItems.length > 0 && (
                <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-100">
                  {feedbackItems.length}
                </span>
              )}
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Files List Tab */}
          {activeRightTab === 'files' && (
            <div>
              <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Available Documents</h3>
              <ul className="space-y-3">
                {manifest.files.map((file) => (
                  <li key={file.filename} className="border-b border-gray-200 dark:border-gray-700 pb-3">
                    <div className="flex items-start">
                      <div className="flex-1">
                        <button
                          onClick={() => {
                            if (file.type === "markdown") {
                              loadFileContent(file.filename);
                              if (isAuthenticated) {
                                // Automatically show comments tab when an authenticated user views a document
                                setActiveRightTab('comments');
                              }
                            }
                          }}
                          className={`text-left ${selectedFile === file.filename ? 'text-red-600 font-bold' : 'text-gray-800 dark:text-white hover:text-red-600 dark:hover:text-red-400'}`}
                        >
                          {file.filename}
                        </button>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {file.description}
                        </p>
                        <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-500">
                          <span className="mr-2">{file.type}</span>
                          <span>{file.size}</span>
                        </div>
                      </div>
                      <div>
                        {file.type === "pdf" ? (
                          <Link 
                            href={`/api/events/${eventId}/files/download?filename=${encodeURIComponent(file.filename)}`} 
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <span className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Download
                            </span>
                          </Link>
                        ) : (
                          <button
                            onClick={() => loadFileContent(file.filename)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <span className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Comments Tab */}
          {activeRightTab === 'comments' && selectedFile && isAuthenticated && fileContent && (
            <CollaborationFeedback 
              eventId={eventId} 
              fileId={selectedFile}
              isAuthenticated={isAuthenticated}
              currentUser={currentUser ?? undefined}
              onRequireAuth={handleAuthRequest}
              onShowComments={handleShowComments}
              selection={selection}
              onClearSelection={() => setSelection(null)}
              setHighlightedSelection={setHighlightedSelection}
              feedbackItems={feedbackItems}
              setFeedbackItems={setFeedbackItems}
              isLoading={isFeedbackLoading}
            />
          )}
          
          {/* Instructions and Authentication Request */}
          {activeRightTab === 'comments' && (!selectedFile || !isAuthenticated) && (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-gray-50 dark:bg-gray-800 rounded-b-lg">
              <Info className="h-12 w-12 text-gray-400 mb-3" />
              <p className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                Collaboration Panel
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Highlight text in the document to endorse or challenge sections.
              </p>
              {!selectedFile ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a document from the &apos;Files&apos; tab to start collaborating.
                </p>
              ) : !isAuthenticated ? (
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Authentication is required to add comments.
                  </p>
                  <CollaborationAuth 
                    eventId={eventId}
                    onAuthenticated={handleAuthSuccess}
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
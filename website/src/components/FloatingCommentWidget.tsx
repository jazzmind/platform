'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Eye, EyeOff, User, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import ElementCommentModal from './ElementCommentModal';
import HelpBadge from './HelpBadge';

export interface CommentData {
  id: string;
  elementSelector: string;
  elementPath: string;
  commentType: 'ENDORSE' | 'CHALLENGE';
  content: string;
  isAnonymous: boolean;
  author: string;
  createdAt: string;
  position?: { x: number; y: number };
  parentId?: string;
  replies?: CommentData[];
}

interface ApiCommentResponse {
  id: string;
  elementSelector: string;
  elementPath: string;
  type: string;
  text: string;
  isAnonymous: boolean;
  userName: string;
  createdAt: string;
  position?: { x: number; y: number };
  parentId?: string;
}

export default function FloatingCommentWidget() {
  const pathname = usePathname();
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [showCommentPane, setShowCommentPane] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [hoveredComment, setHoveredComment] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<CommentData | null>(null);
  const [replyingToComment, setReplyingToComment] = useState<CommentData | null>(null);
  const [, setHighlightedElements] = useState<Map<string, { element: Element; originalStyle: string }>>(new Map());
  
  const highlightedElementRef = useRef<Element | null>(null);
  const originalStyleRef = useRef<string>('');

  // Get current page ID
  const getPageId = () => {
    return window.location.pathname;
  };

  // Check authentication status
  const checkAuth = async () => {
    try {
      const response = await fetch('/api/p3/auth/verify');
      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);
        setCurrentUser(data.email || 'Authenticated User');
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Load comments for current page
  const loadComments = async () => {
    try {
      const response = await fetch(`/api/p3/comments?pageId=${encodeURIComponent(getPageId())}`);
      if (response.ok) {
        const data = await response.json();
        // Transform API response to match CommentData interface
        const transformedComments: CommentData[] = (data.comments || []).map((comment: ApiCommentResponse) => ({
          id: comment.id,
          elementSelector: comment.elementSelector,
          elementPath: comment.elementPath,
          commentType: comment.type?.toUpperCase() as 'ENDORSE' | 'CHALLENGE',
          content: comment.text,
          isAnonymous: comment.isAnonymous,
          author: comment.userName || 'Unknown',
          createdAt: comment.createdAt,
          position: comment.position,
          parentId: comment.parentId
        }));
        
        // Validate that all comments can find their target elements
        const validComments = transformedComments.filter(comment => {
          const element = findElement(comment.elementSelector);
          if (!element) {
            console.warn(`Comment ${comment.id} cannot find target element: ${comment.elementSelector}`);
            return false;
          }
          return true;
        });
        
        if (validComments.length !== transformedComments.length) {
          console.log(`${transformedComments.length - validComments.length} comments could not find their target elements and were filtered out`);
        }
        
        setComments(validComments);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  // Initialize
  useEffect(() => {
    checkAuth();
    loadComments();
  }, []);

  // Reload comments when route changes
  useEffect(() => {
    // Clear existing comments first to prevent showing stale data
    setComments([]);
    
    // Load comments for new page
    loadComments();
    
    // Close comment mode when navigating
    setIsHighlightMode(false);
    setIsCommentModalOpen(false);
    setSelectedElement(null);
    setEditingComment(null);
    setReplyingToComment(null);
    
  }, [pathname]); // This will trigger when pathname changes

  // Custom element finder that handles :contains() selectors
  const findElement = (selector: string): Element | null => {
    // Handle :contains() pseudo-selector
    if (selector.includes(':contains(')) {
      const match = selector.match(/^(\w+):contains\("([^"]+)"\)$/);
      if (match) {
        const [, tagName, textContent] = match;
        const elements = document.querySelectorAll(tagName);
        for (const element of elements) {
          if (element.textContent?.trim() === textContent) {
            return element;
          }
        }
        return null;
      }
    }
    
    // Standard CSS selector
    return document.querySelector(selector);
  };

  // Apply subtle highlights to all commented elements
  const highlightAllCommentedElements = useCallback(() => {
    const newHighlightedElements = new Map();
    
    // Group comments by element selector to detect mixed feedback
    const commentsByElement = new Map<string, CommentData[]>();
    comments.forEach(comment => {
      const existing = commentsByElement.get(comment.elementSelector) || [];
      existing.push(comment);
      commentsByElement.set(comment.elementSelector, existing);
    });
    
    commentsByElement.forEach((elementComments, selector) => {
      const element = findElement(selector);
      if (element) {
        const originalStyle = element.getAttribute('style') || '';
        
        // Check for mixed feedback (both endorse and challenge)
        const hasEndorse = elementComments.some(c => c.commentType === 'ENDORSE');
        const hasChallenge = elementComments.some(c => c.commentType === 'CHALLENGE');
        
        let subtleHighlight: string;
        if (hasEndorse && hasChallenge) {
          // Mixed feedback - orange
          subtleHighlight = 'outline: 2px solid rgba(249, 115, 22, 0.3) !important; outline-offset: 1px !important; background-color: rgba(249, 115, 22, 0.05) !important;';
        } else if (hasEndorse) {
          // Endorse only - green
          subtleHighlight = 'outline: 2px solid rgba(34, 197, 94, 0.3) !important; outline-offset: 1px !important; background-color: rgba(34, 197, 94, 0.05) !important;';
        } else {
          // Challenge only - red
          subtleHighlight = 'outline: 2px solid rgba(239, 68, 68, 0.3) !important; outline-offset: 1px !important; background-color: rgba(239, 68, 68, 0.05) !important;';
        }
        
        element.setAttribute('style', `${originalStyle}; ${subtleHighlight}`);
        
        // Store for each comment ID pointing to the same element
        elementComments.forEach(comment => {
          newHighlightedElements.set(comment.id, { element, originalStyle });
        });
      }
    });
    
    setHighlightedElements(newHighlightedElements);
  }, [comments]);

  // Clear all highlights
  const clearAllHighlights = useCallback(() => {
    setHighlightedElements(prevHighlighted => {
      prevHighlighted.forEach(({ element, originalStyle }) => {
        element.setAttribute('style', originalStyle);
      });
      return new Map();
    });
  }, []); // No dependencies needed since we use the functional update pattern

  // Apply strong highlight to specific element
  const applyStrongHighlight = useCallback((comment: CommentData) => {
    const element = findElement(comment.elementSelector);
    if (element) {
      // Check if element has mixed feedback
      const elementComments = comments.filter(c => c.elementSelector === comment.elementSelector);
      const hasEndorse = elementComments.some(c => c.commentType === 'ENDORSE');
      const hasChallenge = elementComments.some(c => c.commentType === 'CHALLENGE');
      
      let strongHighlight: string;
      if (hasEndorse && hasChallenge) {
        // Mixed feedback - strong orange
        strongHighlight = 'outline: 3px solid rgba(249, 115, 22, 0.8) !important; outline-offset: 2px !important; background-color: rgba(249, 115, 22, 0.15) !important;';
      } else if (comment.commentType === 'ENDORSE') {
        // Endorse - strong green
        strongHighlight = 'outline: 3px solid rgba(34, 197, 94, 0.8) !important; outline-offset: 2px !important; background-color: rgba(34, 197, 94, 0.15) !important;';
      } else {
        // Challenge - strong red
        strongHighlight = 'outline: 3px solid rgba(239, 68, 68, 0.8) !important; outline-offset: 2px !important; background-color: rgba(239, 68, 68, 0.15) !important;';
      }
      
      setHighlightedElements(prevHighlighted => {
        const originalStyle = prevHighlighted.get(comment.id)?.originalStyle || '';
        element.setAttribute('style', `${originalStyle}; ${strongHighlight}`);
        
        // Store reference for cleanup
        highlightedElementRef.current = element;
        originalStyleRef.current = originalStyle;
        
        return prevHighlighted; // No changes to the map
      });
    }
  }, [comments]);

  // Restore subtle highlight for specific element
  const restoreSubtleHighlight = useCallback((comment: CommentData) => {
    const element = findElement(comment.elementSelector);
    if (element) {
      setHighlightedElements(prevHighlighted => {
        const originalStyle = prevHighlighted.get(comment.id)?.originalStyle || '';
        
        // Check if element has mixed feedback
        const elementComments = comments.filter(c => c.elementSelector === comment.elementSelector);
        const hasEndorse = elementComments.some(c => c.commentType === 'ENDORSE');
        const hasChallenge = elementComments.some(c => c.commentType === 'CHALLENGE');
        
        let subtleHighlight: string;
        if (hasEndorse && hasChallenge) {
          // Mixed feedback - subtle orange
          subtleHighlight = 'outline: 2px solid rgba(249, 115, 22, 0.3) !important; outline-offset: 1px !important; background-color: rgba(249, 115, 22, 0.05) !important;';
        } else if (hasEndorse) {
          // Endorse only - subtle green
          subtleHighlight = 'outline: 2px solid rgba(34, 197, 94, 0.3) !important; outline-offset: 1px !important; background-color: rgba(34, 197, 94, 0.05) !important;';
        } else {
          // Challenge only - subtle red
          subtleHighlight = 'outline: 2px solid rgba(239, 68, 68, 0.3) !important; outline-offset: 1px !important; background-color: rgba(239, 68, 68, 0.05) !important;';
        }
        
        element.setAttribute('style', `${originalStyle}; ${subtleHighlight}`);
        
        return prevHighlighted; // No changes to the map
      });
    }
  }, [comments]);

  // Handle comment pane opening/closing - show/hide all highlights
  useEffect(() => {
    if (showCommentPane && comments.length > 0) {
      highlightAllCommentedElements();
    } else {
      clearAllHighlights();
    }
    
    // Cleanup when component unmounts
    return () => {
      clearAllHighlights();
    };
  }, [showCommentPane, comments]); // Removed function dependencies to prevent infinite loop

  // Handle hover highlighting - strengthen highlight and scroll
  useEffect(() => {
    if (hoveredComment && showCommentPane) {
      const comment = comments.find(c => c.id === hoveredComment);
      if (comment) {
        // Scroll to element
        const element = findElement(comment.elementSelector);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // Apply strong highlight
        applyStrongHighlight(comment);
      }
    } else if (hoveredComment === null && showCommentPane) {
      // Restore all subtle highlights when not hovering
      if (highlightedElementRef.current && originalStyleRef.current !== undefined) {
        // Find the comment for this element to restore proper color
        const comment = comments.find(c => {
          const el = findElement(c.elementSelector);
          return el === highlightedElementRef.current;
        });
        
        if (comment) {
          restoreSubtleHighlight(comment);
        }
        
        highlightedElementRef.current = null;
        originalStyleRef.current = '';
      }
    }
  }, [hoveredComment, showCommentPane, comments]); // Removed function dependencies

  // Generate robust selector that works across page reloads
  const generateRobustSelector = (element: Element): string => {
    // Priority 1: Use existing stable identifiers
    if (element.id) {
      return `#${element.id}`;
    }
    
    // Priority 2: Use data attributes (common in React apps)
    const dataTestId = element.getAttribute('data-testid');
    if (dataTestId) {
      return `[data-testid="${dataTestId}"]`;
    }
    
    const dataId = element.getAttribute('data-id');
    if (dataId) {
      return `[data-id="${dataId}"]`;
    }
    
    // Priority 3: Use aria-label for accessibility-labeled elements
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      return `[aria-label="${ariaLabel}"]`;
    }
    
    // Priority 4: Use unique text content for buttons/links
    if (element.tagName === 'BUTTON' || element.tagName === 'A') {
      const textContent = element.textContent?.trim();
      if (textContent && textContent.length < 50) {
        return `${element.tagName.toLowerCase()}:contains("${textContent}")`;
      }
    }
    
    // Priority 5: Build path from stable parent + position
    return buildStablePathSelector(element);
  };
  
  // Build selector based on stable parents and structural position
  const buildStablePathSelector = (element: Element): string => {
    const path: string[] = [];
    let current = element;
    
    // Walk up the tree looking for stable anchors
    while (current && current !== document.body && path.length < 5) {
      let selector = current.tagName.toLowerCase();
      
      // Use stable identifiers if available
      if (current.id) {
        path.unshift(`#${current.id}`);
        break; // Found stable anchor, stop here
      } else if (current.getAttribute('data-testid')) {
        path.unshift(`[data-testid="${current.getAttribute('data-testid')}"]`);
        break; // Found stable anchor, stop here
      } else if (current.className) {
        // Use semantic classes (avoid utility classes)
        const semanticClasses = current.className
          .split(' ')
          .filter(cls => 
            cls && 
            !cls.includes(':') && 
            !cls.startsWith('hover:') &&
            !cls.startsWith('focus:') &&
            !cls.startsWith('bg-') &&
            !cls.startsWith('text-') &&
            !cls.startsWith('p-') &&
            !cls.startsWith('m-') &&
            !cls.startsWith('w-') &&
            !cls.startsWith('h-') &&
            !cls.startsWith('flex') &&
            !cls.startsWith('grid')
          )
          .slice(0, 2);
          
        if (semanticClasses.length > 0) {
          selector += '.' + semanticClasses.join('.');
        }
      }
      
      // Add position if needed for specificity
      const parent = current.parentElement;
      if (parent) {
        const similarSiblings = Array.from(parent.children).filter(child => 
          child.tagName === current.tagName
        );
        
        if (similarSiblings.length > 1) {
          const index = similarSiblings.indexOf(current);
          selector += `:nth-of-type(${index + 1})`;
        }
      }
      
      path.unshift(selector);
      current = current.parentElement!;
    }
    
    return path.join(' > ');
  };

  // Generate human-readable path for display
  const generatePath = (element: Element): string => {
    const path: string[] = [];
    let current = element;

    while (current && current !== document.body) {
      let part = current.tagName.toLowerCase();
      
      if (current.id) {
        // Show original ID or indicate if it's a generated comment ID
        if (current.id.startsWith('comment-target-')) {
          part += ` (auto-generated ID)`;
        } else {
          part += `#${current.id}`;
        }
      } else if (current.className) {
        const classes = current.className.split(' ').filter(cls => cls && !cls.includes(':')).slice(0, 2);
        if (classes.length > 0) {
          part += `.${classes.join('.')}`;
        }
      }
      
      // Add any helpful attributes
      if (current.getAttribute('data-testid')) {
        part += `[data-testid="${current.getAttribute('data-testid')}"]`;
      }
      
      path.unshift(part);
      current = current.parentElement!;
      
      // Limit path depth for readability
      if (path.length >= 4) break;
    }

    return path.join(' > ');
  };

  // Clear highlight
  const clearHighlight = useCallback(() => {
    if (highlightedElementRef.current && originalStyleRef.current !== undefined) {
      highlightedElementRef.current.setAttribute('style', originalStyleRef.current);
      highlightedElementRef.current = null;
      originalStyleRef.current = '';
    }
  }, []);

  // Handle mouse over in highlight mode
  const handleMouseOver = useCallback((e: MouseEvent) => {
    if (!isHighlightMode) return;
    
    const target = e.target as Element;
    // Exclude comment system UI elements
    if (target.closest('.floating-comment-widget') || 
        target.closest('.comment-modal') || 
        target.closest('.comment-pane') ||
        target.closest('.comment-viewer')) {
      return;
    }

    clearHighlight();
    
    highlightedElementRef.current = target;
    originalStyleRef.current = target.getAttribute('style') || '';
    target.setAttribute('style', 
      `${originalStyleRef.current}; outline: 2px solid #3b82f6 !important; outline-offset: 2px !important; background-color: rgba(59, 130, 246, 0.1) !important;`
    );
  }, [isHighlightMode, clearHighlight]);

  // Handle click in highlight mode
  const handleClick = useCallback((e: MouseEvent) => {
    if (!isHighlightMode) return;
    
    const target = e.target as Element;
    // Exclude comment system UI elements
    if (target.closest('.floating-comment-widget') || 
        target.closest('.comment-modal') || 
        target.closest('.comment-pane') ||
        target.closest('.comment-viewer')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    
    setSelectedElement(target);
    setIsCommentModalOpen(true);
    setIsHighlightMode(false);
    clearHighlight();
  }, [isHighlightMode, clearHighlight]);

  // Setup/cleanup event listeners
  useEffect(() => {
    if (isHighlightMode) {

      document.addEventListener('mouseover', handleMouseOver);
      document.addEventListener('click', handleClick, true);
    } else {
      clearHighlight();
    }

    return () => {

      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('click', handleClick, true);
      clearHighlight();
    };
  }, [isHighlightMode, handleMouseOver, handleClick, clearHighlight]);

  // Handle main comment button click
  const handleMainCommentClick = () => {
    if (!isAuthenticated) {
      // Trigger auth flow
      const email = prompt('Enter your @practera.com email:');
      if (email && email.includes('@practera.com')) {
        fetch('/api/p3/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }).then(() => {
          alert('Check your email for the verification link!');
        }).catch(err => {
          console.error('Auth request failed:', err);
          alert('Failed to send verification email. Please try again.');
        });
      } else if (email) {
        alert('Please use a valid @practera.com email address.');
      }
      return;
    }
    
    setIsHighlightMode(!isHighlightMode);
  };

  // Handle comment submission
  const handleCommentSubmit = async (commentData: {
    commentType: 'ENDORSE' | 'CHALLENGE';
    content: string;
    isAnonymous: boolean;
  }) => {
    if (!selectedElement) return;

    // Generate robust selector that works across page reloads
    const elementSelector = generateRobustSelector(selectedElement);
    const elementPath = generatePath(selectedElement);
    
    // Get element position for tag placement
    const rect = selectedElement.getBoundingClientRect();
    const position = {
      x: rect.right + window.scrollX,
      y: rect.top + window.scrollY
    };

    try {
      const requestBody: {
        pageId: string;
        elementSelector: string;
        elementPath: string;
        type: string;
        text: string;
        isAnonymous: boolean;
        position: { x: number; y: number };
        parentId?: string;
      } = {
        pageId: getPageId(),
        elementSelector,
        elementPath,
        type: commentData.commentType,
        text: commentData.content,
        isAnonymous: commentData.isAnonymous,
        position,
      };

      // Add parentId for replies
      if (replyingToComment) {
        requestBody.parentId = replyingToComment.id;
      }

      const response = await fetch('/api/p3/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for auth
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        // Transform API response to match CommentData interface
        const comment: CommentData = {
          id: data.id,
          elementSelector: data.elementSelector,
          elementPath: data.elementPath,
          commentType: data.type.toUpperCase() as 'ENDORSE' | 'CHALLENGE',
          content: data.text,
          isAnonymous: data.isAnonymous,
          author: data.userName || 'Unknown',
          createdAt: data.createdAt,
          position: data.position,
          parentId: data.parentId
        };
        setComments(prev => [comment, ...prev]);
        setIsCommentModalOpen(false);
        setSelectedElement(null);
        setEditingComment(null);
        setReplyingToComment(null);
      } else {
        const error = await response.json();
        console.error('Comment submission failed:', error);
        if (response.status === 401) {
          alert('Authentication expired. Please sign in again.');
          setIsAuthenticated(false);
          setCurrentUser(null);
        } else {
          alert(`Failed to save comment: ${error.error}`);
        }
      }
    } catch (error) {
      console.error('Failed to save comment:', error);
      alert('Failed to save comment. Please try again.');
    }
  };

  // Handle comment click - could be used for additional actions
  const handleCommentClick = (comment: CommentData) => {
    // Currently hover handles scrolling, but this could be used for:
    // - Opening comment details
    // - Expanding replies
    // - Other interactions
    console.log('Comment clicked:', comment.id);
  };

  // Handle comment deletion
  const handleCommentDelete = async (commentId: string) => {
    try {
      const response = await fetch(`/api/p3/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  // Handle comment edit
  const handleCommentEdit = (comment: CommentData) => {
    setEditingComment(comment);
    setSelectedElement(findElement(comment.elementSelector));
    setIsCommentModalOpen(true);
  };

  // Handle comment reply
  const handleCommentReply = (comment: CommentData) => {
    setReplyingToComment(comment);
    setSelectedElement(findElement(comment.elementSelector));
    setIsCommentModalOpen(true);
  };

  // Show loading state
  if (isLoading) {
    return null;
  }

  return (
    <>
      {/* Push page content left when comments pane is open */}
      <div className={`transition-all duration-300 ${showCommentPane ? 'mr-96' : ''}`}>
        
        {/* Floating Widget */}
        <div className="floating-comment-widget fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
          {/* Toggle Comment Pane - only show when authenticated */}
          {isAuthenticated && (
            <button
              onClick={() => setShowCommentPane(!showCommentPane)}
              className="bg-gray-600 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
              title={showCommentPane ? "Hide comments" : "Show comments"}
            >
              {showCommentPane ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}

          {/* Main Comment Button */}
          <button
            onClick={handleMainCommentClick}
            className={`p-3 rounded-full shadow-lg transition-colors ${
              isHighlightMode 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            title={
              !isAuthenticated 
                ? "Sign in to add comments" 
                : isHighlightMode 
                  ? "Exit highlight mode" 
                  : "Add comment"
            }
          >
            <MessageCircle size={20} />
          </button>

          {/* Comment Mode Instructions with User Info */}
          {isHighlightMode && isAuthenticated && (
            <div className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm mb-2 max-w-xs space-y-2">
              <div className="flex items-center gap-2">
                <User size={14} />
                <span className="truncate">{currentUser}</span>
                <HelpBadge 
                  topic="collaboration-feedback" 
                  content="**Collaboration Feedback System**

Click any element on the page to add comments and feedback. Comments are saved and visible to all team members to facilitate collaborative interface design." 
                  position="left" 
                />
              </div>
              <div>Click on any element to add a comment</div>
            </div>
          )}
        </div>
      </div>

      {/* Sliding Comments Pane */}
      <div className={`comment-pane fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-40 transform transition-transform duration-300 ${
        showCommentPane ? 'translate-x-0' : 'translate-x-full'
      } overflow-y-auto border-l border-gray-200`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Comments ({comments.length})
            </h2>
            <button
              onClick={() => setShowCommentPane(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {comments.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No comments yet</p>
              <p className="text-sm">Click elements to add feedback</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                // Organize comments into threads (top-level comments with replies)
                const topLevelComments = comments.filter(c => !c.parentId);
                const repliesByParent = comments.reduce((acc, comment) => {
                  if (comment.parentId) {
                    if (!acc[comment.parentId]) acc[comment.parentId] = [];
                    acc[comment.parentId].push(comment);
                  }
                  return acc;
                }, {} as Record<string, CommentData[]>);

                console.log('Comments:', comments.map(c => ({ id: c.id, content: c.content.substring(0, 30), parentId: c.parentId })));
                console.log('Top level:', topLevelComments.length);
                console.log('Replies by parent:', Object.keys(repliesByParent).length);

                return topLevelComments.map((comment) => (
                  <div key={comment.id} className="space-y-2">
                    {/* Main Comment */}
                    <div
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleCommentClick(comment)}
                      onMouseEnter={() => setHoveredComment(comment.id)}
                      onMouseLeave={() => setHoveredComment(null)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          comment.commentType === 'ENDORSE' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {comment.commentType === 'ENDORSE' ? '✓ Endorse' : '! Challenge'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                        {comment.content}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {comment.isAnonymous ? 'Anonymous' : comment.author}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCommentReply(comment);
                            }}
                            className="text-blue-500 hover:text-blue-700 transition-colors"
                          >
                            Reply
                          </button>
                          {comment.author === currentUser && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCommentEdit(comment);
                              }}
                              className="text-green-500 hover:text-green-700 transition-colors"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCommentDelete(comment.id);
                            }}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Replies */}
                    {repliesByParent[comment.id] && (
                      <div className="ml-6 space-y-2">
                        {repliesByParent[comment.id].map((reply) => (
                          <div
                            key={reply.id}
                            className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleCommentClick(reply)}
                            onMouseEnter={() => setHoveredComment(reply.id)}
                            onMouseLeave={() => setHoveredComment(null)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                reply.commentType === 'ENDORSE' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {reply.commentType === 'ENDORSE' ? '✓ Endorse' : '! Challenge'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(reply.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            
                            <p className="text-sm text-gray-700 mb-2 leading-relaxed">
                              {reply.content}
                            </p>
                            
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>
                                {reply.isAnonymous ? 'Anonymous' : reply.author}
                              </span>
                              <div className="flex items-center gap-2">
                                {reply.author === currentUser && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCommentEdit(reply);
                                    }}
                                    className="text-green-500 hover:text-green-700 transition-colors"
                                  >
                                    Edit
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCommentDelete(reply.id);
                                  }}
                                  className="text-red-500 hover:text-red-700 transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Comment Modal - only show when authenticated */}
      {isCommentModalOpen && selectedElement && isAuthenticated && (
        <ElementCommentModal
          isOpen={isCommentModalOpen}
          existingComment={editingComment}
          replyingTo={replyingToComment}
          onSubmit={(type, text, isAnonymous) => {
            handleCommentSubmit({
              commentType: type.toUpperCase() as 'ENDORSE' | 'CHALLENGE',
              content: text,
              isAnonymous
            });
          }}
          onClose={() => {
            setIsCommentModalOpen(false);
            setSelectedElement(null);
            setEditingComment(null);
            setReplyingToComment(null);
          }}
        />
      )}
    </>
  );
} 
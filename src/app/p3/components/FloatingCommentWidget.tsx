'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MessageCircle, Eye, EyeOff } from 'lucide-react';
import ElementCommentModal from './ElementCommentModal';
import CommentViewer from './CommentViewer';

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
}

export default function FloatingCommentWidget() {
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isCommentViewerOpen, setIsCommentViewerOpen] = useState(false);
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [selectedComment, setSelectedComment] = useState<CommentData | null>(null);
  const [showCommentTags, setShowCommentTags] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
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
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
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
        setComments(data.comments || []);
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

  // Generate CSS selector for an element
  const generateSelector = (element: Element): string => {
    if (element.id) {
      return `#${element.id}`;
    }

    // Get tag name
    let selector = element.tagName.toLowerCase();

    // Add classes (filter out Tailwind responsive/state variants)
    if (element.className) {
      const classes = element.className
        .split(' ')
        .filter(cls => cls && !cls.includes(':') && !cls.startsWith('hover:') && !cls.startsWith('focus:'))
        .slice(0, 2); // Limit to 2 most relevant classes
      
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
    }

    // Add position relative to parent if needed
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(child => 
        child.tagName === element.tagName && 
        child.className === element.className
      );
      
      if (siblings.length > 1) {
        const index = siblings.indexOf(element);
        selector += `:nth-of-type(${index + 1})`;
      }
    }

    return selector;
  };

  // Generate human-readable path
  const generatePath = (element: Element): string => {
    const path: string[] = [];
    let current = element;

    while (current && current !== document.body) {
      let part = current.tagName.toLowerCase();
      
      if (current.id) {
        part += `#${current.id}`;
      } else if (current.className) {
        const classes = current.className.split(' ').filter(cls => cls && !cls.includes(':')).slice(0, 1);
        if (classes.length > 0) {
          part += `.${classes[0]}`;
        }
      }
      
      path.unshift(part);
      current = current.parentElement!;
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
    if (target.closest('.floating-comment-widget') || target.closest('.comment-modal') || target.closest('.comment-viewer')) {
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
    if (target.closest('.floating-comment-widget') || target.closest('.comment-modal') || target.closest('.comment-viewer')) {
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

  // Handle comment submission
  const handleCommentSubmit = async (commentData: {
    commentType: 'ENDORSE' | 'CHALLENGE';
    content: string;
    isAnonymous: boolean;
  }) => {
    if (!selectedElement) return;

    const elementSelector = generateSelector(selectedElement);
    const elementPath = generatePath(selectedElement);
    
    // Get element position for tag placement
    const rect = selectedElement.getBoundingClientRect();
    const position = {
      x: rect.right + window.scrollX,
      y: rect.top + window.scrollY
    };

    try {
      const response = await fetch('/api/p3/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageId: getPageId(),
          elementSelector,
          elementPath,
          ...commentData,
          position,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments(prev => [data.comment, ...prev]);
        setIsCommentModalOpen(false);
        setSelectedElement(null);
      } else {
        const error = await response.json();
        alert(`Failed to save comment: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to save comment:', error);
      alert('Failed to save comment. Please try again.');
    }
  };

  // Handle comment tag click
  const handleCommentTagClick = (comment: CommentData) => {
    setSelectedComment(comment);
    setIsCommentViewerOpen(true);
    
    // Highlight the commented element
    try {
      const element = document.querySelector(comment.elementSelector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add temporary highlight
        const originalStyle = element.getAttribute('style') || '';
        element.setAttribute('style', 
          `${originalStyle}; outline: 3px solid #f59e0b !important; outline-offset: 3px !important; background-color: rgba(245, 158, 11, 0.2) !important;`
        );
        setTimeout(() => {
          element.setAttribute('style', originalStyle);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to highlight element:', error);
    }
  };

  // Handle comment deletion
  const handleCommentDelete = async (commentId: string) => {
    try {
      const response = await fetch(`/api/p3/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        setIsCommentViewerOpen(false);
        setSelectedComment(null);
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  // Handle main comment button click
  const handleCommentClick = () => {
    if (!isAuthenticated) {
      // Trigger auth flow
      const email = prompt('Enter your @practera.com email:');
      if (email) {
        fetch('/api/p3/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }).then(() => {
          alert('Check your email for the verification link!');
        });
      }
      return;
    }
    
    setIsHighlightMode(!isHighlightMode);
  };

  // Show loading state
  if (isLoading) {
    return null;
  }

  return (
    <>
      {/* Comment Tags - only show when authenticated */}
      {isAuthenticated && showCommentTags && comments.map((comment) => {
        if (!comment.position) return null;
        
        return (
          <div
            key={comment.id}
            className="comment-tag fixed z-40 cursor-pointer"
            style={{
              left: `${comment.position.x}px`,
              top: `${comment.position.y}px`,
            }}
            onClick={() => handleCommentTagClick(comment)}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg ${
              comment.commentType === 'ENDORSE' ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {comment.commentType === 'ENDORSE' ? '✓' : '!'}
            </div>
          </div>
        );
      })}

      {/* Floating Widget */}
      <div className="floating-comment-widget fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {/* Toggle Comment Tags - only show when authenticated */}
        {isAuthenticated && (
          <button
            onClick={() => setShowCommentTags(!showCommentTags)}
            className="bg-gray-600 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
            title={showCommentTags ? "Hide comment tags" : "Show comment tags"}
          >
            {showCommentTags ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}

        {/* Main Comment Button */}
        <button
          onClick={handleCommentClick}
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

        {isHighlightMode && isAuthenticated && (
          <div className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm mb-2 max-w-xs">
            Click on any element to add a comment
          </div>
        )}
      </div>

      {/* Comment Modal - only show when authenticated */}
      {isCommentModalOpen && selectedElement && isAuthenticated && (
        <ElementCommentModal
          element={selectedElement}
          onSubmit={handleCommentSubmit}
          onClose={() => {
            setIsCommentModalOpen(false);
            setSelectedElement(null);
          }}
        />
      )}

      {/* Comment Viewer - only show when authenticated */}
      {isCommentViewerOpen && selectedComment && isAuthenticated && (
        <CommentViewer
          comment={selectedComment}
          onClose={() => {
            setIsCommentViewerOpen(false);
            setSelectedComment(null);
          }}
          onDelete={handleCommentDelete}
        />
      )}
    </>
  );
} 
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ElementCommentModal from './ElementCommentModal';
import CommentViewer from './CommentViewer';
import P3AuthModal from './P3AuthModal';

interface ElementComment {
  id: string;
  elementSelector: string;
  elementPath: string;
  type: 'endorse' | 'challenge';
  text: string;
  userName: string;
  isAnonymous: boolean;
  createdAt: string;
  position: { x: number; y: number };
}

interface FloatingCommentWidgetProps {
  pageId?: string; // e.g., 'dashboard', 'projects', etc.
}

const FloatingCommentWidget: React.FC<FloatingCommentWidgetProps> = ({ pageId }) => {
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [comments, setComments] = useState<ElementComment[]>([]);
  const [selectedComment, setSelectedComment] = useState<ElementComment | null>(null);
  const [showCommentViewer, setShowCommentViewer] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<Element | null>(null);
  const [showCommentTags, setShowCommentTags] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const mousePosition = useRef({ x: 0, y: 0 });

  // Load existing comments on mount
  useEffect(() => {
    const loadComments = async () => {
      if (!pageId) return;
      
      try {
        const response = await fetch(`/api/p3/comments?pageId=${pageId}`);
        if (response.ok) {
          const data = await response.json();
          setComments(data.comments || []);
        }
      } catch (error) {
        console.error('Error loading comments:', error);
      }
    };
    
    loadComments();
  }, [pageId]);

  // Generate unique selector for an element
  const generateElementSelector = (element: Element): string => {
    const path: string[] = [];
    let current: Element | null = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      }
      
      // Add stable classes only (avoid Tailwind responsive/state variants)
      if (current.className) {
        const classes = current.className.split(' ')
          .filter(c => c && 
            !c.startsWith('hover:') && 
            !c.startsWith('focus:') && 
            !c.startsWith('active:') &&
            !c.startsWith('lg:') &&
            !c.startsWith('md:') &&
            !c.startsWith('sm:') &&
            !c.startsWith('xl:') &&
            !c.includes(':')
          )
          .slice(0, 2); // Limit to 2 classes to avoid overly long selectors
        
        if (classes.length > 0) {
          selector += `.${classes.join('.')}`;
        }
      }
      
      // Add nth-child for uniqueness, but separate from class selector
      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children);
        const index = siblings.indexOf(current);
        if (siblings.length > 1) {
          selector += `:nth-child(${index + 1})`;
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  };

  // Generate human-readable element path
  const generateElementPath = (element: Element): string => {
    const path: string[] = [];
    let current: Element | null = element;
    
    while (current && current !== document.body) {
      let description = current.tagName.toLowerCase();
      
      if (current.id) {
        description = `${description}#${current.id}`;
      } else if (current.className) {
        const meaningfulClasses = current.className.split(' ')
          .filter(c => c && !c.startsWith('hover:') && !c.startsWith('focus:') && !c.startsWith('text-') && !c.startsWith('bg-'))
          .slice(0, 1);
        if (meaningfulClasses.length > 0) {
          description = `${description}.${meaningfulClasses[0]}`;
        }
      }
      
      // Add text content hint for buttons, links, etc.
      if (['button', 'a', 'h1', 'h2', 'h3'].includes(current.tagName.toLowerCase())) {
        const text = current.textContent?.trim().slice(0, 20);
        if (text) {
          description += ` "${text}${text.length > 20 ? '...' : ''}"`;
        }
      }
      
      path.unshift(description);
      current = current.parentElement;
    }
    
    return path.slice(-3).join(' → '); // Show last 3 elements in path
  };

  // Mouse move handler for highlighting
  const handleMouseMove = (e: MouseEvent) => {
    if (!isHighlightMode) return;
    
    mousePosition.current = { x: e.clientX, y: e.clientY };
    
    const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
    if (elementUnderMouse && !elementUnderMouse.closest('.comment-widget')) {
      setHoveredElement(elementUnderMouse);
    }
  };

  // Click handler for element selection
  const handleElementClick = (e: MouseEvent) => {
    if (!isHighlightMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (element && !element.closest('.comment-widget')) {
      setSelectedElement(element);
      setShowCommentModal(true);
      setIsHighlightMode(false);
      setHoveredElement(null);
    }
  };

  // Toggle highlight mode
  const toggleHighlightMode = () => {
    setIsHighlightMode(!isHighlightMode);
    setHoveredElement(null);
  };

  // Add comment
  const handleAddComment = async (type: 'endorse' | 'challenge', text: string, isAnonymous: boolean) => {
    if (!selectedElement) return;
    
    try {
      const response = await fetch('/api/p3/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageId: pageId || 'unknown',
          elementSelector: generateElementSelector(selectedElement),
          elementPath: generateElementPath(selectedElement),
          type,
          text,
          isAnonymous,
          position: { x: mousePosition.current.x, y: mousePosition.current.y }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save comment');
      }
      
      const newComment = await response.json();
      setComments(prev => [...prev, newComment]);
      setSelectedElement(null);
      setShowCommentModal(false);
    } catch (error) {
      console.error('Error saving comment:', error);
      alert('Failed to save comment. Please try again.');
    }
  };

  // View comment
  const handleViewComment = (comment: ElementComment) => {
    setSelectedComment(comment);
    setShowCommentViewer(true);
  };

  // Setup event listeners
  useEffect(() => {
    if (isHighlightMode) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('click', handleElementClick, true);
      document.body.style.cursor = 'crosshair';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleElementClick, true);
      document.body.style.cursor = '';
    };
  }, [isHighlightMode]);

  // Create highlight overlay
  const createHighlightOverlay = () => {
    if (!hoveredElement || !isHighlightMode) return null;
    
    const rect = hoveredElement.getBoundingClientRect();
    
    return (
      <div
        className="fixed pointer-events-none z-[9999] border-2 border-blue-500 bg-blue-500/20"
        style={{
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        }}
      >
        <div className="absolute -top-8 left-0 bg-blue-500 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
          {generateElementPath(hoveredElement)}
        </div>
      </div>
    );
  };

  // Create comment tags
  const createCommentTags = () => {
    if (!showCommentTags) return null;
    
    return comments.map(comment => {
      const element = document.querySelector(comment.elementSelector);
      if (!element) return null;
      
      const rect = element.getBoundingClientRect();
      
      return (
        <div
          key={comment.id}
          className="fixed z-[9998] cursor-pointer"
          style={{
            left: rect.right - 12,
            top: rect.top - 6,
          }}
          onClick={() => handleViewComment(comment)}
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg hover:scale-110 transition-transform ${
            comment.type === 'endorse' ? 'bg-green-500' : 'bg-blue-500'
          }`}>
            {comment.type === 'endorse' ? '✓' : '?'}
          </div>
        </div>
      );
    });
  };

  return (
    <>
      {/* Highlight overlay */}
      {createHighlightOverlay()}
      
      {/* Comment tags */}
      {createCommentTags()}
      
      {/* Floating widget */}
      <div className="comment-widget fixed bottom-6 right-6 z-[9999]">
        <div className="flex flex-col items-end space-y-2">
          {/* Toggle comment tags visibility */}
          {comments.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setShowCommentTags(!showCommentTags)}
              className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors ${
                showCommentTags ? 'bg-gray-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}
              title={showCommentTags ? 'Hide comments' : 'Show comments'}
            >
              {showCommentTags ? <EyeOff size={20} /> : <Eye size={20} />}
            </motion.button>
          )}
          
          {/* Main comment button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleHighlightMode}
            className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors ${
              isHighlightMode 
                ? 'bg-red-500 text-white' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            title={isHighlightMode ? 'Exit comment mode' : 'Enter comment mode'}
          >
            {isHighlightMode ? <X size={24} /> : <MessageSquare size={24} />}
          </motion.button>
          
          {/* Comments count badge */}
          {comments.length > 0 && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
              {comments.length}
            </div>
          )}
        </div>
        
        {/* Instructions when in highlight mode */}
        <AnimatePresence>
          {isHighlightMode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full right-0 mb-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg max-w-xs"
            >
              <div className="text-sm">
                <div className="font-medium mb-1">Comment Mode Active</div>
                <div>Hover over elements and click to add comments</div>
              </div>
              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Comment Modal */}
      <ElementCommentModal
        isOpen={showCommentModal}
        onClose={() => {
          setShowCommentModal(false);
          setSelectedElement(null);
        }}
        onSubmit={handleAddComment}
        elementPath={selectedElement ? generateElementPath(selectedElement) : ''}
      />
      
      {/* Comment Viewer */}
      <CommentViewer
        isOpen={showCommentViewer}
        onClose={() => {
          setShowCommentViewer(false);
          setSelectedComment(null);
        }}
        comment={selectedComment}
                 onDelete={(commentId: string) => {
           setComments(prev => prev.filter(c => c.id !== commentId));
           setShowCommentViewer(false);
           setSelectedComment(null);
         }}
      />
    </>
  );
};

export default FloatingCommentWidget; 
'use client';

import React from 'react';
import { X, Trash2, Check, HelpCircle, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

interface CommentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  comment: ElementComment | null;
  onDelete: (commentId: string) => void;
}

const CommentViewer: React.FC<CommentViewerProps> = ({
  isOpen,
  onClose,
  comment,
  onDelete
}) => {
  if (!comment) return null;

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/p3/comments?commentId=${comment.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete comment');
      }
      
      onDelete(comment.id);
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/30 z-[9999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Sliding Panel */}
          <motion.div
            className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-[10000] overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Comment Details</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Comment Type Badge */}
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-4 ${
                comment.type === 'endorse' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {comment.type === 'endorse' ? (
                  <Check className="w-4 h-4 mr-1" />
                ) : (
                  <HelpCircle className="w-4 h-4 mr-1" />
                )}
                {comment.type === 'endorse' ? 'Endorsement' : 'Challenge'}
              </div>
              
              {/* Element Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Element</h3>
                <p className="text-sm text-gray-600">{comment.elementPath}</p>
                <div className="mt-2 text-xs text-gray-500 font-mono">
                  {comment.elementSelector}
                </div>
              </div>
              
              {/* Comment Content */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Comment</h3>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 leading-relaxed">{comment.text}</p>
                </div>
              </div>
              
              {/* Author Info */}
              <div className="border-t pt-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {comment.isAnonymous ? 'Anonymous' : comment.userName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(comment.createdAt)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Delete Button */}
                  <button
                    onClick={handleDelete}
                    className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete comment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Highlight Element Button */}
              <div className="border-t pt-4">
                <button
                  onClick={() => {
                    const element = document.querySelector(comment.elementSelector);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      // Briefly highlight the element
                      element.classList.add('animate-pulse', 'ring-2', 'ring-blue-500');
                      setTimeout(() => {
                        element.classList.remove('animate-pulse', 'ring-2', 'ring-blue-500');
                      }, 2000);
                    }
                  }}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Highlight Element
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommentViewer; 
'use client';

import React, { useState } from 'react';
import { Check, HelpCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ElementCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (type: 'endorse' | 'challenge', text: string, isAnonymous: boolean) => void;
  elementPath: string;
}

const ElementCommentModal: React.FC<ElementCommentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  elementPath
}) => {
  const [feedbackType, setFeedbackType] = useState<'endorse' | 'challenge' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedbackText || !feedbackType) {
      return;
    }

    setSubmitting(true);
    
    try {
      await onSubmit(feedbackType, feedbackText, isAnonymous);
      
      // Reset form
      setFeedbackType(null);
      setFeedbackText('');
      setIsAnonymous(false);
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFeedbackType(null);
    setFeedbackText('');
    setIsAnonymous(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex items-center justify-center bg-black/60 z-[10000] p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Add Comment
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Element path display */}
          <div className="bg-gray-100 p-3 rounded-md mb-4 text-sm text-gray-700">
            <div className="font-medium mb-1">Commenting on:</div>
            <div className="italic">{elementPath}</div>
          </div>
          
          {/* Comment type selection */}
          {!feedbackType && (
            <div className="space-y-3 mb-4">
              <p className="text-sm text-gray-600 mb-3">
                What type of feedback would you like to provide?
              </p>
              
              <button
                className="w-full flex items-center p-4 border-2 border-green-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left"
                onClick={() => setFeedbackType('endorse')}
              >
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Endorse</div>
                  <div className="text-sm text-gray-600">I like this design element</div>
                </div>
              </button>
              
              <button
                className="w-full flex items-center p-4 border-2 border-blue-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                onClick={() => setFeedbackType('challenge')}
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <HelpCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Challenge</div>
                  <div className="text-sm text-gray-600">I have questions or suggestions</div>
                </div>
              </button>
            </div>
          )}
          
          {/* Comment form */}
          {feedbackType && (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                    feedbackType === 'endorse' ? 'bg-green-500' : 'bg-blue-500'
                  }`}>
                    {feedbackType === 'endorse' ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <span className="font-medium text-gray-900">
                    {feedbackType === 'endorse' ? 'Endorsing' : 'Challenging'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFeedbackType(null)}
                    className="ml-auto text-sm text-gray-500 hover:text-gray-700"
                  >
                    Change
                  </button>
                </div>
                
                <label htmlFor="feedbackText" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Comment
                </label>
                <textarea
                  id="feedbackText"
                  placeholder={feedbackType === 'endorse' 
                    ? "What do you like about this element?" 
                    : "What questions or suggestions do you have?"}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                />
              </div>
              
              <div className="flex items-center mb-5">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="anonymous" className="ml-2 block text-sm text-gray-700">
                  Submit anonymously
                </label>
              </div>
              
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  onClick={handleClose}
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
                  disabled={submitting || !feedbackText}
                >
                  {submitting ? "Submitting..." : "Add Comment"}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ElementCommentModal; 
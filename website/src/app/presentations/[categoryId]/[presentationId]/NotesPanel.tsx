"use client";

import { useState, useEffect } from 'react';
import { fetchNotes } from './actions';
import Markdown from 'react-markdown';

interface NotesPanelProps {
  categoryId: string;
  presentationId: string;
}

export default function NotesPanel({ categoryId, presentationId }: NotesPanelProps) {
  const [notesContent, setNotesContent] = useState<string | null>(null);
  const [hasNotes, setHasNotes] = useState<boolean | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    async function loadNotes() {
      try {
        const notes = await fetchNotes(categoryId, presentationId);
        if (notes) {
          setNotesContent(notes);
          setHasNotes(true);
        } else {
          setHasNotes(false);
        }
      } catch (error) {
        console.error("Error loading notes:", error);
        setHasNotes(false);
      }
    }
    
    loadNotes();
  }, [categoryId, presentationId]);

  // Don't render anything while loading
  if (hasNotes === null) {
    return <div className="mt-4 text-center text-gray-500 dark:text-gray-400">Loading notes...</div>;
  }

  // If no notes found, don't render the panel
  if (hasNotes === false) {
    return <div className="mt-4 text-center text-gray-500 dark:text-gray-400 text-sm">
      No additional notes available for this presentation.
    </div>;
  }

  return (
    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left font-medium text-gray-800 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-400"
      >
        <span className="flex items-center">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
            />
          </svg>
          Presentation Notes
        </span>
        <svg
          className={`w-5 h-5 transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="mt-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto max-h-96">
          <div className="prose dark:prose-invert prose-sm max-w-none">
            <Markdown>{notesContent || ''}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
} 
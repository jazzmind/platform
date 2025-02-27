"use client";

import { useState, useEffect } from "react";
import PresentationIframe from "./PresentationIframe";
import ReactMarkdown from "react-markdown";

interface TabInterfaceProps {
  categoryId: string;
  presentationId: string;
  viewInNewWindowUrl: string;
}

export default function TabInterface({
  categoryId,
  presentationId,
  viewInNewWindowUrl,
}: TabInterfaceProps) {
  const [activeTab, setActiveTab] = useState<"presentation" | "notes">("presentation");
  const [notesContent, setNotesContent] = useState<string>("");
  const [notesLoading, setNotesLoading] = useState<boolean>(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  const loadNotes = async () => {
    if (activeTab === "notes" && !notesContent && !notesLoading) {
      setNotesLoading(true);
      setNotesError(null);
      
      try {
        const response = await fetch(`/api/presentations/${categoryId}/${presentationId}/notes`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setNotesError("No notes available for this presentation.");
          } else {
            setNotesError("Failed to load notes. Please try again.");
          }
          return;
        }
        
        const notes = await response.text();
        setNotesContent(notes);
      } catch (error) {
        console.error("Error loading notes:", error);
        setNotesError("An error occurred while loading notes.");
      } finally {
        setNotesLoading(false);
      }
    }
  };

  // Load notes when the notes tab is clicked
  useEffect(() => {
    loadNotes();
  }, [activeTab]);

  return (
    <div className="w-full">
      <div className="border-b border-gray-200 flex justify-between items-center">
        <div className="flex">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === "presentation" 
              ? "border-b-2 border-red-500 text-red-600" 
              : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("presentation")}
          >
            Presentation
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === "notes" 
              ? "border-b-2 border-red-500 text-red-600" 
              : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("notes")}
          >
            Notes
          </button>
        </div>
        <a
          href={viewInNewWindowUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 text-red-600 hover:text-red-800 text-sm flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          View in New Window
        </a>
      </div>

      <div className="p-0">
        {activeTab === "presentation" ? (
          <PresentationIframe
            src={`/api/presentations/${categoryId}/${presentationId}`}
          />
        ) : (
          <div className="p-4 bg-white rounded-b-lg shadow overflow-auto max-h-[70vh]">
            {notesLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
              </div>
            ) : notesError ? (
              <div className="text-red-500 p-4">{notesError}</div>
            ) : notesContent ? (
              <div className="prose prose-red max-w-none">
                <ReactMarkdown>{notesContent}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-gray-500 p-4">No notes available for this presentation.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 
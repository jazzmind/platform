"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import MarkdownRenderer from "./MarkdownRenderer";

interface FileInfo {
  filename: string;
  description: string;
  type: string;
  size: string;
}

interface Manifest {
  files: FileInfo[];
}

export default function EventFiles({ eventId }: { eventId: string }) {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      {/* File List */}
      <div className="md:col-span-1 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Available Documents</h3>
        <ul className="space-y-3">
          {manifest.files.map((file) => (
            <li key={file.filename} className="border-b border-gray-200 dark:border-gray-700 pb-3">
              <div className="flex items-start">
                <div className="flex-1">
                  <button
                    onClick={() => file.type === "markdown" ? loadFileContent(file.filename) : null}
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

      {/* File Content */}
      <div className="md:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        {selectedFile ? (
          loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">{selectedFile}</h3>
              <div className="prose prose-lg dark:prose-invert max-w-none markdown-improved">
                <MarkdownRenderer content={fileContent || ""} />
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
    </div>
  );
} 
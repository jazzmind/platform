"use client";

import { useState, useEffect } from 'react';
import { loadMarkdownFile } from './actions';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

interface NotesPanelProps {
  categoryId: string;
  presentationId: string;
}

// Define types for markdown components
interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function NotesPanel({ categoryId, presentationId }: NotesPanelProps) {
  const [notes, setNotes] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadNotes() {
      try {
        setLoading(true);
        const notesContent = await loadMarkdownFile(categoryId, presentationId, "notes.md");
        
        if (notesContent) {
          setNotes(notesContent);
          setError(null);
        } else {
          setNotes(null);
          setError("No notes available for this presentation.");
        }
      } catch (err) {
        console.error("Error loading notes:", err);
        setError("Failed to load notes. Please try again later.");
        setNotes(null);
      } finally {
        setLoading(false);
      }
    }

    loadNotes();
  }, [categoryId, presentationId]);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Loading notes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-gray-600 dark:text-gray-400">
        {error}
      </div>
    );
  }

  return (
    <div className="prose prose-sm md:prose-base lg:prose-lg max-w-none dark:prose-invert prose-headings:text-gray-800 dark:prose-headings:text-white prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-a:text-red-600 dark:prose-a:text-red-400 prose-a:no-underline hover:prose-a:underline prose-code:bg-gray-100 dark:prose-code:bg-gray-700 prose-code:p-1 prose-code:rounded p-4">
      <Markdown 
        remarkPlugins={[remarkGfm]} 
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          h1: (props) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
          h2: (props) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
          h3: (props) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
          p: (props) => <p className="my-3" {...props} />,
          ul: (props) => <ul className="list-disc pl-6 my-3" {...props} />,
          ol: (props) => <ol className="list-decimal pl-6 my-3" {...props} />,
          li: (props) => <li className="my-1" {...props} />,
          a: (props) => <a className="text-red-600 hover:underline" {...props} />,
          blockquote: (props) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-4" {...props} />,
          code: (props: CodeProps) => {
            const { inline, ...rest } = props;
            return inline 
              ? <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm" {...rest} />
              : <code className="block bg-gray-100 dark:bg-gray-700 p-3 rounded-lg overflow-x-auto text-sm my-4" {...rest} />;
          },
          pre: (props) => <pre className="bg-gray-100 dark:bg-gray-700 p-0 rounded-lg overflow-x-auto my-4" {...props} />,
          table: (props) => <table className="border-collapse table-auto w-full my-4" {...props} />,
          th: (props) => <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left" {...props} />,
          td: (props) => <td className="border border-gray-300 dark:border-gray-600 px-4 py-2" {...props} />,
        }}
      >
        {notes || ""}
      </Markdown>
    </div>
  );
} 
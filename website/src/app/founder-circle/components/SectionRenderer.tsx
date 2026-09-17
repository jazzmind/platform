"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import type { Components } from "react-markdown";
import type { Section } from "@/data/founder-circle/topics";

interface SectionRendererProps {
  section: Section;
}

const components: Components = {
  // Headings
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-6 mb-3">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mt-5 mb-2 uppercase tracking-wide text-sm">
      {children}
    </h3>
  ),

  // Paragraphs
  p: ({ children }) => (
    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
      {children}
    </p>
  ),

  // Bold / italic
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900 dark:text-white">
      {children}
    </strong>
  ),
  em: ({ children }) => (
    <em className="italic text-gray-600 dark:text-gray-400">{children}</em>
  ),

  // Lists
  ul: ({ children }) => (
    <ul className="list-none space-y-2 mb-4 ml-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-2 mb-4 ml-0 text-gray-700 dark:text-gray-300">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
      <span className="leading-relaxed">{children}</span>
    </li>
  ),

  // Blockquotes — styled as callout cards
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 pl-5 pr-4 py-3 my-5 rounded-r-xl">
      <div className="text-red-800 dark:text-red-200 italic leading-relaxed">
        {children}
      </div>
    </blockquote>
  ),

  // Code
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="block bg-gray-900 dark:bg-gray-950 text-gray-100 rounded-xl p-4 text-sm font-mono overflow-x-auto my-4 whitespace-pre">
          {children}
        </code>
      );
    }
    return (
      <code className="bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    );
  },

  // Tables — styled with Tailwind
  table: ({ children }) => (
    <div className="overflow-x-auto my-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 uppercase text-xs tracking-wide">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
      {children}
    </tbody>
  ),
  tr: ({ children }) => (
    <tr className="bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 leading-relaxed">
      {children}
    </td>
  ),

  // Horizontal rule
  hr: () => (
    <hr className="my-6 border-gray-200 dark:border-gray-700" />
  ),
};

export default function SectionRenderer({ section }: SectionRendererProps) {
  return (
    <div className="section-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {section.content}
      </ReactMarkdown>
    </div>
  );
}

"use client";

import Link from "next/link";
import type { Topic } from "@/data/founder-circle/topics";

interface TopicNavProps {
  prev: Topic | null;
  next: Topic | null;
}

export default function TopicNav({ prev, next }: TopicNavProps) {
  if (!prev && !next) return null;

  return (
    <nav className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
      <div className="flex items-stretch justify-between gap-4">
        {/* Previous */}
        {prev ? (
          <Link
            href={`/founder-circle/${prev.id}`}
            className="group flex-1 flex items-center gap-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5 hover:border-red-300 dark:hover:border-red-700 hover:shadow-md transition-all max-w-xs"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full border-2 border-gray-200 dark:border-gray-600 group-hover:border-red-500 dark:group-hover:border-red-500 flex items-center justify-center transition-colors">
              <svg
                className="w-4 h-4 text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide mb-0.5">
                Previous
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors truncate">
                <span className="mr-1.5">{prev.icon}</span>
                {prev.title}
              </p>
            </div>
          </Link>
        ) : (
          <div className="flex-1" />
        )}

        {/* Back to overview (center) */}
        <Link
          href="/founder-circle"
          className="flex-shrink-0 self-center hidden sm:flex flex-col items-center gap-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors px-2"
        >
          <div className="grid grid-cols-2 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-sm bg-current opacity-60"
              />
            ))}
          </div>
          <span className="text-xs font-medium">All lessons</span>
        </Link>

        {/* Next */}
        {next ? (
          <Link
            href={`/founder-circle/${next.id}`}
            className="group flex-1 flex items-center justify-end gap-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5 hover:border-red-300 dark:hover:border-red-700 hover:shadow-md transition-all max-w-xs text-right"
          >
            <div className="min-w-0">
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide mb-0.5">
                Next
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors truncate">
                {next.title}
                <span className="ml-1.5">{next.icon}</span>
              </p>
            </div>
            <div className="flex-shrink-0 w-10 h-10 rounded-full border-2 border-gray-200 dark:border-gray-600 group-hover:border-red-500 dark:group-hover:border-red-500 flex items-center justify-center transition-colors">
              <svg
                className="w-4 h-4 text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </div>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </nav>
  );
}

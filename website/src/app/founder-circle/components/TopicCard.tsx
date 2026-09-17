"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Topic } from "@/data/founder-circle/topics";

interface TopicCardProps {
  topic: Topic;
  index: number;
}

export default function TopicCard({ topic, index }: TopicCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: "easeOut" }}
    >
      <Link href={`/founder-circle/${topic.id}`} className="block group h-full">
        <motion.div
          className="bg-white dark:bg-gray-800 flex flex-col h-full rounded-2xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700"
          whileHover={{ scale: 1.025, y: -4 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {/* Card header */}
          <div className="p-6 flex-grow">
            <div className="flex items-start justify-between mb-4">
              <span className="text-4xl leading-none" role="img" aria-label={topic.title}>
                {topic.icon}
              </span>
              <span className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                {topic.principles.length} principles
              </span>
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors leading-tight">
              {topic.title}
            </h2>
            {topic.title !== topic.subtitle && (
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-3 italic">
                {topic.subtitle}
              </p>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3">
              {topic.description}
            </p>
          </div>

          {/* Card footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {topic.sections.length} sections
              </span>
              <span className="flex items-center text-red-600 dark:text-red-400 text-sm font-medium">
                Read lesson
                <svg
                  className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1"
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
              </span>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

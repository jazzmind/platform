"use client";

import { motion } from "framer-motion";
import type { Principle } from "@/data/founder-circle/topics";

interface PrinciplesSummaryProps {
  principles: Principle[];
  topicTitle: string;
}

export default function PrinciplesSummary({
  principles,
  topicTitle,
}: PrinciplesSummaryProps) {
  return (
    <section id="key-principles" className="mt-12">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Key Principles
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {principles.length} principles from {topicTitle}
          </p>
        </div>
      </div>

      {/* Principles grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {principles.map((principle, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.35, delay: index * 0.05, ease: "easeOut" }}
            className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              {/* Number badge */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-600 text-white text-sm font-bold flex items-center justify-center leading-none">
                {index + 1}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white leading-snug mb-1.5">
                  {principle.title}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {principle.body}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

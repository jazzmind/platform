import type { Metadata } from "next";
import Link from "next/link";
import { topics } from "@/data/founder-circle/topics";
import TopicCard from "./components/TopicCard";

export const metadata: Metadata = {
  title: "MITAS Founder Circle Lessons | Wes Sonnenreich",
  description:
    "Eight synthesized lesson sets from the MITAS Founder Circle — real founder experiences on fundraising, equity, growth, stress, AI disruption, and more.",
  openGraph: {
    title: "MITAS Founder Circle Lessons",
    description:
      "Eight synthesized lesson sets from the MITAS Founder Circle — real founder experiences on fundraising, equity, growth, stress, AI disruption, and more.",
    type: "website",
  },
};

export default function FounderCirclePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-red-900">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Red glow accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-800/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative container mx-auto px-4 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/30 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-red-300 text-sm font-medium tracking-wide">
                MITAS Founder Circle
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Lessons from the
              <span className="text-red-400"> Founder Circle</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-300 leading-relaxed mb-8 max-w-2xl">
              Eight synthesized lesson sets drawn from real founder discussions —
              covering fundraising, equity structuring, early growth, AI
              disruption, stress, and the human side of building a company.
            </p>

            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Peer founder discussions</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{topics.reduce((sum, t) => sum + t.principles.length, 0)} key principles</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>{topics.length} lesson sets</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Topic grid */}
      <div className="container mx-auto px-4 py-16">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              All Lessons
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Select a topic to explore the full lesson
            </p>
          </div>
          <Link
            href="/"
            className="hidden md:inline-flex items-center text-sm text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {topics.map((topic, index) => (
            <TopicCard key={topic.id} topic={topic} index={index} />
          ))}
        </div>

        {/* Footer note */}
        <p className="mt-16 text-center text-sm text-gray-400 dark:text-gray-500 max-w-2xl mx-auto">
          Compiled from MITAS Founder Circle session discussions. Not financial,
          legal, or professional advice — consult qualified counsel and advisors
          for your specific situation.
        </p>
      </div>
    </div>
  );
}

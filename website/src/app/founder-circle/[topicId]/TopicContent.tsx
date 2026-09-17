"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Topic } from "@/data/founder-circle/topics";
import SectionRenderer from "../components/SectionRenderer";
import PrinciplesSummary from "../components/PrinciplesSummary";
import TopicNav from "../components/TopicNav";
import TopicIcon from "../components/TopicIcon";

interface TopicContentProps {
  topic: Topic;
  prev: Topic | null;
  next: Topic | null;
}

export default function TopicContent({ topic, prev, next }: TopicContentProps) {
  const [activeSection, setActiveSection] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // All nav items: sections + principles
  const navItems = [
    ...topic.sections.map((s) => ({ id: s.id, label: s.title })),
    { id: "key-principles", label: "Key Principles" },
  ];

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry that is most visible
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    navItems.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [topic.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reading progress bar
  useEffect(() => {
    const handleScroll = () => {
      const el = contentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      const scrolled = Math.max(0, -rect.top);
      setReadingProgress(Math.min(100, (scrolled / total) * 100));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 88; // account for sticky header
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div ref={contentRef} className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Reading progress bar */}
      <div
        className="fixed top-0 left-0 z-50 h-0.5 bg-red-600 transition-all duration-100"
        style={{ width: `${readingProgress}%` }}
      />

      {/* Topic header */}
      <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-red-950 overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative container mx-auto px-4 py-14 md:py-20">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <a href="/founder-circle" className="hover:text-red-400 transition-colors">
              MIT Founders&apos; Circle
            </a>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-300">{topic.title}</span>
          </div>

          <div className="max-w-3xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <TopicIcon
                  name={topic.icon}
                  className="w-7 h-7 text-red-300"
                  strokeWidth={1.5}
                />
              </div>
              <div>
                <p className="text-red-400 text-sm font-medium tracking-wide uppercase mb-1">
                  {topic.subtitle}
                </p>
                <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                  {topic.title}
                </h1>
              </div>
            </div>

            {/* Core insight */}
            <div className="mt-6 border-l-4 border-red-500 pl-5 py-2">
              <p className="text-red-200 text-sm font-medium uppercase tracking-wide mb-2">
                Core Insight
              </p>
              <p className="text-gray-200 leading-relaxed text-base">
                {topic.coreInsight}
              </p>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-6 mt-6 text-sm text-gray-400">
              <span>{topic.sections.length} sections</span>
              <span>{topic.principles.length} key principles</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile section menu toggle */}
      <div className="md:hidden sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <button
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            {activeSection
              ? navItems.find((n) => n.id === activeSection)?.label ?? "Sections"
              : "Sections"}
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${mobileMenuOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-gray-100 dark:border-gray-800"
            >
              <nav className="px-4 py-2 space-y-1 max-h-64 overflow-y-auto">
                {navItems.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => scrollToSection(id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeSection === id
                        ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    {id === "key-principles" ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center font-bold flex-shrink-0">
                          ✓
                        </span>
                        {label}
                      </span>
                    ) : (
                      label
                    )}
                  </button>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Two-column layout */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex gap-10 relative">
          {/* Sticky sidebar — desktop only */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 px-3">
                Contents
              </p>
              <nav className="space-y-0.5">
                {navItems.map(({ id, label }) => {
                  const isActive = activeSection === id;
                  const isPrinciples = id === "key-principles";
                  return (
                    <button
                      key={id}
                      onClick={() => scrollToSection(id)}
                      className={`w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                        isActive
                          ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      {isPrinciples ? (
                        <span
                          className={`mt-0.5 w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center ${
                            isActive ? "bg-red-600" : "border border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </span>
                      ) : (
                        <span
                          className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            isActive ? "bg-red-600" : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        />
                      )}
                      <span className="leading-snug">{label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Back link */}
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 px-3">
                <a
                  href="/founder-circle"
                  className="flex items-center gap-2 text-xs text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  All lessons
                </a>              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {topic.sections.map((section, idx) => (
              <motion.section
                key={section.id}
                id={section.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.45, delay: idx * 0.04, ease: "easeOut" }}
                className="mb-14 scroll-mt-24"
              >
                <div className="mb-5">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                    {section.title}
                  </h2>
                  <div className="mt-2 h-0.5 w-12 bg-red-600 rounded-full" />
                </div>
                <SectionRenderer section={section} />
              </motion.section>
            ))}

            {/* Key principles */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="scroll-mt-24"
            >
              <PrinciplesSummary
                principles={topic.principles}
                topicTitle={topic.title}
              />
            </motion.div>

            {/* Prev / Next navigation */}
            <TopicNav prev={prev} next={next} />
          </main>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

interface Topic {
  title: string;
  description: string;
  questions: string[];
}

interface EventData {
  id: string;
  public: {
    title: string;
    date: string;
    time: string;
    location: string;
    description: string;
    topics: Topic[];
  };
}

interface EventTabsProps {
  summary: string | null;
  notes: string | null;
  eventData: EventData;
}

export default function EventTabs({ summary, notes, eventData }: EventTabsProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'notes' | 'details'>(
    summary ? 'summary' : notes ? 'notes' : 'details'
  );

  // Create array of available tabs
  const availableTabs = [
    ...(summary ? [{ id: 'summary', label: 'Summary' }] : []),
    ...(notes ? [{ id: 'notes', label: 'Notes' }] : []),
    { id: 'details', label: 'Event Details' }
  ];

  return (
    <div>
      <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
        <nav className="flex -mb-px space-x-8">
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'summary' | 'notes' | 'details')}
              className={`py-4 px-1 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-red-500 text-red-600 dark:text-red-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Summary Tab Content */}
      {activeTab === 'summary' && summary && (
        <div className="prose prose-lg dark:prose-invert max-w-none markdown-improved">
          <ReactMarkdown 
            rehypePlugins={[rehypeRaw, rehypeSanitize]} 
            remarkPlugins={[remarkGfm]}
          >
            {summary}
          </ReactMarkdown>
        </div>
      )}

      {/* Notes Tab Content */}
      {activeTab === 'notes' && notes && (
        <div className="prose prose-lg dark:prose-invert max-w-none markdown-improved">
          <ReactMarkdown 
            rehypePlugins={[rehypeRaw, rehypeSanitize]} 
            remarkPlugins={[remarkGfm]}
          >
            {notes}
          </ReactMarkdown>
        </div>
      )}

      {/* Event Details Tab Content */}
      {activeTab === 'details' && (
        <div>
          <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">About This Event</h2>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: eventData.public.description }} />
          </div>
          
          {/* Topics section */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Discussion Topics</h2>
            <div className="space-y-8">
              {eventData.public.topics.map((topic, index) => (
                <div key={index} className="mb-8">
                  <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-white">
                    {topic.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4"
                    dangerouslySetInnerHTML={{ __html: topic.description }}
                  />
                  <div className="space-y-2 ml-4">
                    {topic.questions.map((question, qIndex) => (
                      <div key={qIndex} className="flex items-start">
                        <div className="text-red-600 mr-2">•</div>
                        <div 
                          className="text-gray-700 dark:text-gray-300"
                          dangerouslySetInnerHTML={{ __html: question }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
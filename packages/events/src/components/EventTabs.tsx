"use client";

import { useState } from "react";
import { PollQuestion } from "@/lib/types";
import ToggleableChatPanel from "./ToggleableChatPanel";
import { askEventQuestion } from "@/app/events/[eventId]/actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownRenderer } from "@sonnenreich/shared";
import EventFiles from "./EventFiles";
import EventChat from "./EventChat";

interface EventTabsProps {
  summary: string | null;
  eventData: {
    id: string;
    public: {
      title: string;
      description: string;
      topics: {
        title: string;
        description: string;
        questions: string[];
      }[];
    };
    private?: {
      polls?: PollQuestion[];
    };
  };
  hasFiles: boolean;
}

export default function EventTabs({ summary, eventData, hasFiles }: EventTabsProps) {
  const [activeTab, setActiveTab] = useState("summary");
  
  // Custom icon for event chat
  const eventChatIcon = (
    <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
    </svg>
  );
  
  return (
    <div className="w-full">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex">
            <button
              onClick={() => setActiveTab("summary")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "summary"
                  ? "border-red-600 text-red-600 dark:text-red-400 dark:border-red-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              Summary
            </button>
            {hasFiles && (
              <button
                onClick={() => setActiveTab("files")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "files"
                    ? "border-red-600 text-red-600 dark:text-red-400 dark:border-red-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                Documents
              </button>
            )}
            
            <button
              onClick={() => setActiveTab("details")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "details"
                  ? "border-red-600 text-red-600 dark:text-red-400 dark:border-red-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              Event Details
            </button>
          </div>
          
          {/* Chat toggle positioned at the right side of the tab bar */}
          <div className="px-4 py-2">
            <ToggleableChatPanel
              contentType="event"
              contentId={eventData.id}
              title="Chat about this Event"
              icon={eventChatIcon}
              askQuestion={askEventQuestion}
            />
          </div>
        </div>
      </div>
      
      <div className="pt-4">
        {/* Summary Tab Content */}
        {activeTab === "summary" && (
          <div>
            {summary ? (
              <div className="prose prose-lg dark:prose-invert max-w-none markdown-improved">
                <MarkdownRenderer content={summary} />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No summary available for this event.
              </div>
            )}
          </div>
        )}
        
     
        {/* Files Tab Content */}
        {activeTab === "files" && (
          <div>
            <EventFiles eventId={eventData.id} />
          </div>
        )}
        
        {/* Details Tab Content */}
        {activeTab === "details" && (
          <div className="prose prose-lg dark:prose-invert max-w-none markdown-improved">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">About This Event</h2>
            <div dangerouslySetInnerHTML={{ __html: eventData.public.description }} />
            
            {eventData.public.topics && eventData.public.topics.length > 0 && (
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
                      {topic.questions && (
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
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 
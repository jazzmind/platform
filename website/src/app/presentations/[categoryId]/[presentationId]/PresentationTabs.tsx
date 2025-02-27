"use client";

import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { fetchNotes, chatWithPresentation } from '@/app/presentations/[categoryId]/[presentationId]/actions';
import Markdown from 'react-markdown';

interface PresentationTabsProps {
  categoryId: string;
  presentationId: string;
}

export default function PresentationTabs({ categoryId, presentationId }: PresentationTabsProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [notesContent, setNotesContent] = useState<string | null>(null);
  const [hasNotes, setHasNotes] = useState<boolean | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [userMessage, setUserMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch notes on initial load
  useEffect(() => {
    async function loadNotes() {
      const notes = await fetchNotes(categoryId, presentationId);
      if (notes) {
        setNotesContent(notes);
        setHasNotes(true);
      } else {
        setHasNotes(false);
      }
    }
    
    loadNotes();
  }, [categoryId, presentationId]);

  // Handle chat submission
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userMessage.trim()) return;
    
    // Add user message to chat
    const newUserMessage = { role: 'user' as const, content: userMessage };
    setChatMessages(prev => [...prev, newUserMessage]);
    setUserMessage('');
    setIsLoading(true);
    
    try {
      // Call server action to get AI response
      const response = await chatWithPresentation(
        categoryId, 
        presentationId, 
        [...chatMessages, newUserMessage]
      );
      
      // Add AI response to chat
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Error in chat:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // If we don't know if notes exist yet, show loading
  if (hasNotes === null) {
    return <div className="mt-8 text-center">Loading...</div>;
  }

  // Define the tabs to display
  const tabs = [
    ...(hasNotes ? [{ name: 'Notes', panel: 'notes' }] : []),
    { name: 'Chat with Presentation', panel: 'chat' }
  ];

  return (
    <div className="mt-8 w-full">
      <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
        <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 dark:bg-gray-700 p-1">
          {tabs.map((tab) => (
            <Tab
              key={tab.panel}
              className={({ selected }: { selected: boolean }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
                ${
                  selected
                    ? 'bg-white dark:bg-gray-900 text-red-600 shadow'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-white/[0.12] hover:text-red-500'
                }`
              }
            >
              {tab.name}
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels className="mt-2">
          {hasNotes && (
            <Tab.Panel className="rounded-xl bg-white dark:bg-gray-800 p-4 shadow-md">
              <div className="prose dark:prose-invert max-w-none">
                <Markdown>{notesContent || ''}</Markdown>
              </div>
            </Tab.Panel>
          )}
          <Tab.Panel className="rounded-xl bg-white dark:bg-gray-800 p-4 shadow-md">
            <div className="flex flex-col h-96">
              <div className="flex-grow overflow-y-auto mb-4 p-2">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
                    <p>Ask a question about this presentation!</p>
                    <p className="text-sm mt-2">The AI has access to the presentation notes and related materials.</p>
                  </div>
                ) : (
                  chatMessages.map((msg, index) => (
                    <div 
                      key={index} 
                      className={`mb-3 p-3 rounded-lg ${
                        msg.role === 'user' 
                          ? 'bg-red-50 dark:bg-red-900/20 ml-10' 
                          : 'bg-gray-100 dark:bg-gray-700 mr-10'
                      }`}
                    >
                      <div className="font-medium mb-1">
                        {msg.role === 'user' ? 'You' : 'AI Assistant'}
                      </div>
                      <div className="whitespace-pre-wrap">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-center items-center my-4">
                    <div className="animate-pulse flex space-x-2">
                      <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                      <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                      <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                    </div>
                  </div>
                )}
              </div>
              <form onSubmit={handleChatSubmit} className="flex items-end">
                <div className="flex-grow relative">
                  <textarea
                    value={userMessage}
                    onChange={(e) => setUserMessage(e.target.value)}
                    placeholder="Ask a question about the presentation..."
                    className="w-full p-3 border dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    rows={2}
                    disabled={isLoading}
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !userMessage.trim()}
                  className="ml-2 px-4 py-3 bg-red-600 text-white rounded-lg disabled:opacity-50 hover:bg-red-700 transition-colors"
                >
                  Send
                </button>
              </form>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
} 
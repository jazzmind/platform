"use client";

import { useState, useRef, useEffect } from "react";
import { askQuestion as defaultAskQuestion } from "@/lib/actions";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ChatPanelProps {
  contentType: string;
  contentId: string; 
  secondaryId?: string;
  title?: string;
  icon?: React.ReactNode;
  onClose?: () => void;
  askQuestion?: (contentType: string, contentId: string, secondaryId: string | undefined, question: string) => Promise<string>;
}

export default function ChatPanel({ 
  contentType,
  contentId,
  secondaryId,
  title = "Chat",
  icon,
  onClose,
  askQuestion = defaultAskQuestion
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [chatHeight, setChatHeight] = useState("400px");

  // Adjust chat height to match presentation height
  useEffect(() => {
    const updateChatHeight = () => {
      // Calculate available height (viewport height minus header)
      // 180px accounts for header and some padding
      const availableHeight = window.innerHeight - 250;
      setChatHeight(`${Math.max(400, availableHeight)}px`);
    };

    // Set initial height
    updateChatHeight();
    
    // Update on window resize
    window.addEventListener('resize', updateChatHeight);
    
    return () => {
      window.removeEventListener('resize', updateChatHeight);
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!input.trim()) return;
    
    // Add user message
    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    try {
      // Call API to get response
      const response = await askQuestion(contentType, contentId, secondaryId, input);
      
      // Add assistant message
      const assistantMessage: Message = { role: "assistant", content: response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error(`Error asking question about ${contentType}:`, error);
      // Add error message
      const errorMessage: Message = { 
        role: "assistant", 
        content: "Sorry, I couldn't process your question. Please try again." 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Default chat icon if none provided
  const defaultIcon = (
    <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center text-gray-800 dark:text-white">
          {icon || defaultIcon}
          {title}
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 focus:outline-none md:hidden"
            aria-label="Close chat"
          >
            <svg 
              className="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
        )}
      </div>
      
      {/* Messages container with fixed height and scrolling */}
      <div 
        ref={chatContainerRef}
        className="flex-grow overflow-y-auto p-4 space-y-4"
        style={{ height: `calc(${chatHeight} - 140px)` }} // Subtract header and input area height
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 space-y-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300">Ask about this {contentType}</h3>
              <p className="mt-1">Get answers about content, context, or related topics</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div 
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user" 
                    ? "bg-red-600 text-white rounded-tr-none" 
                    : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-tl-none"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="prose dark:prose-invert max-w-none">
                    <MarkdownRenderer content={message.content} />
                  </div>
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-tl-none">
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input form */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <form onSubmit={handleSubmit} className="flex items-start space-x-2">
          <div className="flex-grow relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask a question about this ${contentType}...`}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white resize-none"
              rows={1}
              style={{ minHeight: "2.5rem", maxHeight: "6rem" }}
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Press Enter to send
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={`px-4 py-2 rounded-lg h-10 flex items-center justify-center ${
              isLoading || !input.trim()
                ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700 text-white"
            } transition-colors`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
} 
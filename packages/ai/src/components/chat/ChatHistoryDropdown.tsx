import React, { useState, useRef, useEffect } from 'react';
import { Clock, MoreVertical, RefreshCw, Trash2 } from 'lucide-react';
import { Message } from '@/src/types/chat';

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
}

interface ApiChatSession {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
  messageCount: number;
}

interface ChatHistoryDropdownProps {
  entityType: string;
  entityId: string;
  currentMessages: Message[];
  onLoadSession: (sessionId: string) => void;
  onNewSession: () => void;
  className?: string;
}

const ChatHistoryDropdown: React.FC<ChatHistoryDropdownProps> = ({
  entityType,
  entityId,
  currentMessages,
  onLoadSession,
  onNewSession,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load chat sessions when dropdown opens - always refresh to get latest sessions
  useEffect(() => {
    if (isOpen) {
      loadChatSessions();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadChatSessions = async () => {
    setLoading(true);
    try {
      console.log(`Loading chat history for ${entityType}:${entityId}`);
      
      const response = await fetch(`/api/chat/sessions?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load chat sessions: ${response.status}`);
      }
      
      const data = await response.json();
      const apiSessions: ChatSession[] = data.sessions.map((session: ApiChatSession) => ({
        id: session.id,
        title: session.title,
        lastMessage: session.lastMessage,
        timestamp: new Date(session.updatedAt),
        messageCount: session.messageCount
      }));
      
      setSessions(apiSessions);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      // Fallback to empty array on error
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionClick = async (sessionId: string) => {
    try {
      setLoading(true);
      // Load the session data
      const response = await fetch(`/api/chat/sessions/${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load session: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Loaded session:', data.session);
      
      // Call the parent handler with the session ID
      onLoadSession(sessionId);
      setIsOpen(false);
    } catch (error) {
      console.error('Error loading session:', error);
      // Still call the handler - let the parent component handle the error
      onLoadSession(sessionId);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = async () => {
    try {
      setLoading(true);
      
      // Create a new session with a default title
      const defaultTitle = `New Chat - ${new Date().toLocaleString()}`;
      
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityType,
          entityId,
          title: defaultTitle
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Created new session:', data.session);
      
      // Refresh the sessions list
      await loadChatSessions();
      
      // Call the parent handler to switch to new session
      onNewSession();
      setIsOpen(false);
    } catch (error) {
      console.error('Error creating new session:', error);
      // Still call the handler - let the parent component handle the error
      onNewSession();
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, sessionTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${sessionTitle}"? This cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      console.log('Deleting session:', sessionId);
      
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete session: ${response.status}`);
      }
      
      console.log('Session deleted successfully');
      
      // Refresh the sessions list
      await loadChatSessions();
      
      // Close the menu
      setOpenMenuId(null);
      
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)}d ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  };

  const getCurrentSessionTitle = () => {
    if (currentMessages.length <= 1) return 'New Chat';
    
    // Try to extract a title from the first user message
    const firstUserMessage = currentMessages.find(m => m.role === 'user');
    if (firstUserMessage) {
      const title = firstUserMessage.content.slice(0, 30);
      return title.length < firstUserMessage.content.length ? `${title}...` : title;
    }
    
    return 'Current Chat';
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        title="Chat History"
      >
        <Clock className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-8 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Chat History
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => loadChatSessions()}
                  disabled={loading}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
                  title="Refresh sessions"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={handleNewSession}
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                >
                  New Chat
                </button>
              </div>
            </div>
          </div>

          {/* Current Session */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {getCurrentSessionTitle()}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                (current)
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {currentMessages.filter(m => m.role === 'user').length} messages
            </p>
          </div>

          {/* Sessions List */}
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading sessions...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No previous chat sessions
              </div>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="relative">
                  <div className="flex items-start justify-between">
                    <div
                      onClick={() => handleSessionClick(session.id)}
                      className="flex-1 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0 transition-colors cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {session.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                          {session.lastMessage}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {formatTimestamp(session.timestamp)}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            •
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {session.messageCount} messages
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === session.id ? null : session.id);
                      }}
                      className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>
                  </div>
                  
                  {/* Dropdown menu */}
                  {openMenuId === session.id && (
                    <div className="absolute right-2 top-2 mt-6 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-60">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session.id, session.title);
                        }}
                        className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs flex items-center space-x-2"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Automatically saves your conversations
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHistoryDropdown; 
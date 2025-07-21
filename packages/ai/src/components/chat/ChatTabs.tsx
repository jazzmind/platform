'use client';

import { useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { X, Plus, MessageCircle, Trash2 } from 'lucide-react';

export interface ChatTab {
  id: string;
  label: string;
  context: string;
  sessionId: string | null; // ID of the chat session loaded in this tab
  messageCount: number;
  isActive: boolean;
}

interface ChatTabsProps {
  tabs: ChatTab[];
  onTabSwitch: (tabId: string) => void;
  onTabCreate: (context: string) => void;
  onTabClose: (tabId: string) => void;
  onTabClear: (tabId: string) => void;
  isDeleteMode?: boolean;
  onToggleDeleteMode?: () => void;
  chatHistoryDropdown?: React.ReactNode;
}

export default function ChatTabs({ 
  tabs, 
  onTabSwitch, 
  onTabCreate, 
  onTabClose, 
  onTabClear,
  isDeleteMode = false,
  onToggleDeleteMode,
  chatHistoryDropdown
}: ChatTabsProps) {
  const [showCreateTab, setShowCreateTab] = useState(false);
  const [newTabContext, setNewTabContext] = useState('');

  const handleCreateTab = () => {
    if (newTabContext.trim()) {
      onTabCreate(newTabContext.trim());
      setNewTabContext('');
      setShowCreateTab(false);
    }
  };

  return (
    <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 relative">
      {/* Scrollable Tabs Container */}
      <div className="flex-1 overflow-x-auto scrollbar-hide">
        <div className="flex items-end space-x-0 px-2 pt-2 min-w-max">
          {/* Existing Tabs */}
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              className={`flex items-center space-x-1 px-3 py-2 rounded-t-lg cursor-pointer transition-all relative ${
                tab.isActive
                  ? 'bg-white dark:bg-gray-700 border-l border-r border-t border-gray-200 dark:border-gray-600 z-20'
                  : 'bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 z-10'
              }`}
              style={{
                marginLeft: index > 0 ? '-8px' : '0',
                zIndex: tab.isActive ? 20 : 10 - index
              }}
              onClick={() => onTabSwitch(tab.id)}
            >
              <MessageCircle className="w-3 h-3 flex-shrink-0" />
              <span className="text-xs font-medium whitespace-nowrap max-w-[80px] truncate">
                {tab.label}
              </span>
              {tab.messageCount > 0 && (
                <span className="text-xs bg-blue-500 text-white rounded-full px-1.5 py-0.5 min-w-[16px] text-center flex-shrink-0">
                  {tab.messageCount}
                </span>
              )}
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  className="text-gray-400 hover:text-gray-600 ml-1 flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {/* Create New Tab */}
          {showCreateTab ? (
            <div className="flex items-center space-x-1 ml-2">
              <input
                type="text"
                value={newTabContext}
                onChange={(e) => setNewTabContext(e.target.value)}
                placeholder="Tab context..."
                className="text-xs px-2 py-1 border rounded w-24 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTab();
                  if (e.key === 'Escape') setShowCreateTab(false);
                }}
                autoFocus
              />
              <Button size="sm" onClick={handleCreateTab} className="text-xs px-2 py-1">
                Add
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateTab(true)}
              className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 rounded ml-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Create new chat tab"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tab Actions */}
      <div className="flex items-center px-2 border-l border-gray-200 dark:border-gray-700">
        {chatHistoryDropdown && (
          <div className="mr-1">
            {chatHistoryDropdown}
          </div>
        )}
        <button
          onClick={() => {
            onToggleDeleteMode?.();
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            if (!isDeleteMode) {
              const activeTab = tabs.find(t => t.isActive);
              if (activeTab && confirm('Are you sure you want to clear all chat history for this tab?')) {
                onTabClear(activeTab.id);
              }
            }
          }}
          className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
            isDeleteMode 
              ? 'text-red-600 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30' 
              : 'text-gray-500 hover:text-red-600'
          }`}
          title={isDeleteMode ? "Exit delete mode" : "Select messages to delete (right-click to clear tab)"}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
} 
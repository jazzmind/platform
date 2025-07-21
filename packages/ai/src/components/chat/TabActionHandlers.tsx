import { useState, useCallback, useEffect } from 'react';
import { Message, TabActionHandlersProps } from '@/src/types/chat';
import { ChatTab } from './ChatTabs';

export class TabActionHandlers {
  private props: TabActionHandlersProps;
  private chatTabs: ChatTab[];
  private activeTabId: string;
  private setChatTabs: React.Dispatch<React.SetStateAction<ChatTab[]>>;
  private setActiveTabId: React.Dispatch<React.SetStateAction<string>>;

  constructor(props: TabActionHandlersProps) {
    this.props = props;
    
    // Initialize state - this should be called from the component
    const storedTabs = this.getStoredTabs();
    this.chatTabs = storedTabs.tabs;
    this.activeTabId = storedTabs.activeTabId;
    
    // These need to be set from the component using the hook
    this.setChatTabs = () => {};
    this.setActiveTabId = () => {};
  }

  // Method to initialize the state setters from the component
  setStateSetters(
    setChatTabs: React.Dispatch<React.SetStateAction<ChatTab[]>>,
    setActiveTabId: React.Dispatch<React.SetStateAction<string>>
  ) {
    this.setChatTabs = setChatTabs;
    this.setActiveTabId = setActiveTabId;
  }

  // Update internal state when external state changes
  updateInternalState(chatTabs: ChatTab[], activeTabId: string) {
    this.chatTabs = chatTabs;
    this.activeTabId = activeTabId;
  }

  // Get stored tabs from localStorage
  getStoredTabs() {
    const { entityType, entityId, currentTab } = this.props;
    
    try {
      const storageKey = `chatTabs_${entityType}_${entityId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
          return {
            tabs: parsed.tabs,
            activeTabId: parsed.activeTabId || parsed.tabs[0].id
          };
        }
      }
    } catch (error) {
      console.warn('Error loading stored tabs:', error);
    }
    
    return {
      tabs: [{
        id: 'main',
        label: 'General',
        context: currentTab || 'general',
        messageCount: 0,
        isActive: true
      }],
      activeTabId: 'main'
    };
  }

  // Save tabs to localStorage
  saveTabsToStorage(tabs: ChatTab[], activeId: string) {
    const { entityType, entityId } = this.props;
    
    try {
      const storageKey = `chatTabs_${entityType}_${entityId}`;
      localStorage.setItem(storageKey, JSON.stringify({
        tabs: tabs,
        activeTabId: activeId
      }));
    } catch (error) {
      console.warn('Error saving tabs to storage:', error);
    }
  }

  // Handle tab switch
  async handleTabSwitch(tabId: string) {
    const { entityType, entityId, contactId, welcomeMessage, setState, updateActiveTabMessageCount } = this.props;
    
    this.setActiveTabId(tabId);
    this.setChatTabs((prev: ChatTab[]) => prev.map((tab: ChatTab) => ({
      ...tab,
      isActive: tab.id === tabId
    })));
    
    // Load messages for the new tab using unified API
    try {
      const response = await fetch(`/api/chat?entityType=${entityType}&entityId=${entityId}&tabContext=${tabId}`);
      if (response.ok) {
        const { messages: savedMessages } = await response.json();
        const messageList = savedMessages && savedMessages.length > 0 ? savedMessages : [{
          contactId: contactId,
          role: 'system',
          content: welcomeMessage
        }];
        
        setState(prev => ({
          ...prev,
          messages: messageList
        }));
        
        // Update message count for this tab
        updateActiveTabMessageCount(messageList.filter((m: Message) => m.role !== 'system').length);
      }
    } catch (error) {
      console.error('Error loading tab messages:', error);
    }
  }

  // Handle tab creation
  handleTabCreate(context: string) {
    const newTabId = `tab-${Date.now()}`;
    const newTab = {
      id: newTabId,
      label: context,
      context: context,
      messageCount: 0,
      isActive: false
    };
    
    this.setChatTabs((prev: ChatTab[]) => [...prev, newTab]);
    this.handleTabSwitch(newTabId);
  }

  // Handle tab close
  handleTabClose(tabId: string) {
    if (this.chatTabs.length <= 1) return;
    
    this.setChatTabs((prev: ChatTab[]) => {
      const filtered = prev.filter((tab: ChatTab) => tab.id !== tabId);
      if (this.activeTabId === tabId) {
        const newActiveTab = filtered[0];
        this.setActiveTabId(newActiveTab.id);
        this.handleTabSwitch(newActiveTab.id);
      }
      return filtered.map((tab: ChatTab) => ({
        ...tab,
        isActive: tab.id === (this.activeTabId === tabId ? filtered[0].id : this.activeTabId)
      }));
    });
  }

  // Handle tab clear
  async handleTabClear(tabId: string) {
    if (!confirm('Are you sure you want to clear all chat history for this tab?')) return;
    
    const { entityType, entityId, contactId, welcomeMessage, setState, updateActiveTabMessageCount } = this.props;
    
    try {
      // Use unified API for clearing chat history
      const response = await fetch('/api/chat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          entityType,
          entityId,
          tabContext: tabId,
          action: 'clear'
        }),
      });
      
      if (response.ok) {
        if (tabId === this.activeTabId) {
          setState(prev => ({ 
            ...prev, 
            messages: [{
              contactId: contactId,
              role: 'system',
              content: welcomeMessage
            }]
          }));
        }
        updateActiveTabMessageCount(0);
      }
    } catch (error) {
      console.error('Error clearing tab messages:', error);
    }
  }

  // Get current tab state
  getCurrentTabState() {
    return {
      chatTabs: this.chatTabs,
      activeTabId: this.activeTabId
    };
  }
}

// Hook to use tab action handlers
export function useTabActionHandlers(props: TabActionHandlersProps) {
  const handlers = new TabActionHandlers(props);
  const storedTabs = handlers.getStoredTabs();
  
  const [chatTabs, setChatTabs] = useState<ChatTab[]>(storedTabs.tabs);
  const [activeTabId, setActiveTabId] = useState<string>(storedTabs.activeTabId);

  // Set the state setters in the handlers
  handlers.setStateSetters(setChatTabs, setActiveTabId);
  
  // Update internal state when external state changes
  handlers.updateInternalState(chatTabs, activeTabId);

  // Save tabs to localStorage whenever they change
  const saveTabsToStorage = useCallback((tabs: ChatTab[], activeId: string) => {
    handlers.saveTabsToStorage(tabs, activeId);
  }, [handlers]);

  // Persist tabs whenever they change
  useEffect(() => {
    saveTabsToStorage(chatTabs, activeTabId);
  }, [chatTabs, activeTabId, saveTabsToStorage]);

  return {
    chatTabs,
    activeTabId,
    setChatTabs,
    setActiveTabId,
    handleTabSwitch: useCallback((tabId: string) => handlers.handleTabSwitch(tabId), [handlers]),
    handleTabCreate: useCallback((context: string) => handlers.handleTabCreate(context), [handlers]),
    handleTabClose: useCallback((tabId: string) => handlers.handleTabClose(tabId), [handlers]),
    handleTabClear: useCallback((tabId: string) => handlers.handleTabClear(tabId), [handlers]),
    saveTabsToStorage: saveTabsToStorage
  };
}

export default TabActionHandlers; 
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Message, 
  ChatState, 
  ChatActions, 
  DocumentAnalysisResult 
} from '@/src/types/chat';
import { MODEL_OPTIONS } from '@/src/lib/ai/models';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatTabs, { ChatTab } from './ChatTabs';
import TypingIndicator from './TypingIndicator';
import ChatHistoryDropdown from './ChatHistoryDropdown';
import DocumentAnalysisModal from '@/src/components/shared/DocumentAnalysisModal';
import BulkImportModal from './BulkImportModal';
import { DocumentActionHandlers } from './DocumentActionHandlers';
import { useMessageActionHandlers } from './MessageActionHandlers';
import { useDropzone } from 'react-dropzone';

export interface BaseChatContainerProps {
  entityId: string;
  entityType: 'opportunity' | 'proposal' | 'workspace';
  onSectionUpdate?: (sectionId: string, content: string) => Promise<void>;
  onSectionImprove?: (sectionId: string) => Promise<string>;
  currentSection?: string | null;
  onSetCurrentSection?: (sectionId: string | null) => void;
  isImproving?: boolean;
  sections?: { 
    id: string; 
    title: string; 
    content?: string | Record<string, string>;
    type: 'text' | 'fields';
  }[];
  onDraftingSectionsUpdate?: (updates: Record<string, boolean>) => void;
  contactId: string;
  currentTab?: string;
  onActionClick?: (action: string, data?: unknown) => void;
  // Dashboard-specific props
  dashboardContext?: {
    opportunities: Array<{ id: string; title: string; value: number; status: string; createdAt: string }>;
    totalOpportunities: number;
    pipelineStages: string[];
  };
  // Custom welcome message
  welcomeMessage?: string;
  // SSE support
  enableSSE?: boolean;
}

export default function ChatContainer({ 
  entityId,
  entityType,
  onSectionUpdate, 
  currentSection: externalCurrentSection,
  onSetCurrentSection,
  isImproving = false,
  sections = [],
  onDraftingSectionsUpdate,
  contactId,
  currentTab = 'general',
  onActionClick,
  dashboardContext,
  welcomeMessage: customWelcomeMessage,
  enableSSE = false
}: BaseChatContainerProps) {

  // Unified API endpoints - no longer need route mapping
  // All chat operations now use /api/chat:
  // - GET /api/chat - Load chat history
  // - POST /api/chat - Send new message and get AI response with metadata/actions
  // - PATCH /api/chat - Clear chat history
  // - DELETE /api/chat - Delete specific messages

  const welcomeMessage = customWelcomeMessage || `# Welcome to ProposalHub! 👋

  I can help you create and improve your ${entityType}. Here's what I can do:

  - **Analyze Documents**: Drop a PDF or markdown file to extract content
  - **Improve Sections**: I can enhance specific sections with better content and formatting
  - **Provide Suggestions**: Ask me for suggestions on any part of your ${entityType}

  Just start typing or drop a document to begin!`;

  // Enhanced state for dashboard functionality
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResult | null>(null);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  // Tab management state with localStorage persistence - now stores session IDs
  const getStoredTabs = useCallback(() => {
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
        sessionId: null, // No session loaded initially
        messageCount: 0,
        isActive: true
      }],
      activeTabId: 'main'
    };
  }, [entityId, entityType, currentTab]);

  const [chatTabs, setChatTabs] = useState(() => getStoredTabs().tabs);
  const [activeTabId, setActiveTabId] = useState(() => getStoredTabs().activeTabId);

  // Save tabs to localStorage whenever they change
  const saveTabsToStorage = useCallback((tabs: typeof chatTabs, activeId: string) => {
    try {
      const storageKey = `chatTabs_${entityType}_${entityId}`;
      localStorage.setItem(storageKey, JSON.stringify({
        tabs: tabs,
        activeTabId: activeId
      }));
    } catch (error) {
      console.warn('Error saving tabs to storage:', error);
    }
  }, [entityId, entityType]);

  // Persist tabs whenever they change
  useEffect(() => {
    saveTabsToStorage(chatTabs, activeTabId);
  }, [chatTabs, activeTabId]);

  const [state, setState] = useState<ChatState>({
    messages: [{
      contactId: contactId,
      role: 'system',
      content: welcomeMessage
    }],
    isProcessing: false,
    currentSection: null,
    currentModel: MODEL_OPTIONS[0].value,
    draftingSections: {},
    improvableSections: [],
    chatContext: {
      relevantInfo: [],
      lastMessageIndex: 0
    }
  });
  
  const [isDragging, setIsDragging] = useState(false);

  const [pendingResponse, setPendingResponse] = useState<Message | null>(null);

  const abortController = useRef<AbortController>();
  const messagesEndRef = useRef<HTMLDivElement>(null);





  // Update message count for active tab
  const updateActiveTabMessageCount = useCallback((count: number) => {
    setChatTabs((prev: ChatTab[]) => prev.map((tab: ChatTab) => 
      tab.id === activeTabId 
        ? { ...tab, messageCount: count }
        : tab
    ));
  }, [activeTabId]);

  // Chat actions for component interaction
  const actions = useMemo<ChatActions>(() => ({
    addMessage: async (message: Message) => {
      setState(prev => {
        const newMessages = [...prev.messages, message];
        // Update tab message count (excluding system messages)
        const userMessages = newMessages.filter(m => m.role !== 'system').length;
        updateActiveTabMessageCount(userMessages);
        return {
          ...prev,
          messages: newMessages
        };
      });
    },
    setProcessing: (isProcessing: boolean) => {
      setState(prev => ({ ...prev, isProcessing }));
    },
    setCurrentSection: (sectionId: string | null) => {
      setState(prev => ({ ...prev, currentSection: sectionId }));
    },
    setCurrentModel: (model: string) => {
      setState(prev => ({ ...prev, currentModel: model }));
    },
    clearMessages: () => {
      setState(prev => ({ ...prev, messages: [] }));
      updateActiveTabMessageCount(0);
    }
  }), [updateActiveTabMessageCount]);

  // Use message action handlers
  const {
    isDeleteMode,
    selectedMessages,
    handleToggleDeleteMode,
    handleToggleMessageSelection,
    handleSelectAllMessages,
    handleClearSelections,
    handleBulkDeleteMessages
  } = useMessageActionHandlers({
    entityType,
    entityId,
    state,
    setState,
    updateActiveTabMessageCount
  });

  // Use document action handlers
  const documentHandlers = useMemo(() => new DocumentActionHandlers({
    entityType,
    entityId,
    contactId,
    enableSSE,
    dashboardContext,
    actions,
    setAnalysisResult,
    setShowAnalysisModal,
    setShowBulkImportModal,
    setState
  }), [entityType, entityId, contactId, enableSSE, dashboardContext, setAnalysisResult, setShowAnalysisModal, setShowBulkImportModal, setState]);

  // Tab management handlers - now loads from sessions
  const handleTabSwitch = useCallback(async (tabId: string) => {
    setActiveTabId(tabId);
    setChatTabs((prev: ChatTab[]) => prev.map((tab: ChatTab) => ({
      ...tab,
      isActive: tab.id === tabId
    })));
    
    // Find the tab and its session
    const targetTab = chatTabs.find((tab: ChatTab) => tab.id === tabId);
    if (!targetTab) return;
    
    try {
      let messageList: Message[] = [];
      
      if (targetTab.sessionId) {
        // Load messages from the specific session
        const response = await fetch(`/api/chat/sessions/${targetTab.sessionId}`);
        if (response.ok) {
          const data = await response.json();
          messageList = data.session.messages || [];
        }
      }
      
      // If no messages, show welcome message
      if (messageList.length === 0) {
        messageList = [{
          contactId: contactId,
          role: 'system',
          content: welcomeMessage
        }];
      }
      
      setState(prev => ({
        ...prev,
        messages: messageList
      }));
      
      // Update message count for this tab
      updateActiveTabMessageCount(messageList.filter((m: Message) => m.role !== 'system').length);
    } catch (error) {
      console.error('Error loading tab messages:', error);
      // Show welcome message on error
      setState(prev => ({
        ...prev,
        messages: [{
          contactId: contactId,
          role: 'system',
          content: welcomeMessage
        }]
      }));
      updateActiveTabMessageCount(0);
    }
  }, [chatTabs, contactId, updateActiveTabMessageCount, welcomeMessage]);

  const handleTabCreate = useCallback((context: string) => {
    const newTabId = `tab-${Date.now()}`;
    const newTab: ChatTab = {
      id: newTabId,
      label: context,
      context: context,
      sessionId: null, // New tabs start without a session
      messageCount: 0,
      isActive: false
    };
    
    setChatTabs((prev: ChatTab[]) => [...prev, newTab]);
    handleTabSwitch(newTabId);
  }, [handleTabSwitch]);

  const handleTabClose = useCallback((tabId: string) => {
    if (chatTabs.length <= 1) return;
    
    setChatTabs((prev: ChatTab[]) => {
      const filtered = prev.filter((tab: ChatTab) => tab.id !== tabId);
      if (activeTabId === tabId) {
        const newActiveTab = filtered[0];
        setActiveTabId(newActiveTab.id);
        handleTabSwitch(newActiveTab.id);
      }
      return filtered.map((tab: ChatTab) => ({
        ...tab,
        isActive: tab.id === (activeTabId === tabId ? filtered[0].id : activeTabId)
      }));
    });
  }, [chatTabs.length, activeTabId, handleTabSwitch]);

  const handleTabClear = useCallback(async (tabId: string) => {
    if (!confirm('Are you sure you want to clear all chat history for this tab?')) return;
    
    const targetTab = chatTabs.find((tab: ChatTab) => tab.id === tabId);
    if (!targetTab) return;
    
    try {
      if (targetTab.sessionId) {
        // Clear the specific session
        const response = await fetch(`/api/chat/sessions/${targetTab.sessionId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error('Failed to clear session');
        }
      }
      
      // Clear the tab's session reference and reset state
      setChatTabs((prev: ChatTab[]) => prev.map((tab: ChatTab) => 
        tab.id === tabId 
          ? { 
              ...tab, 
              sessionId: null,
              label: 'General',
              messageCount: 0
            }
          : tab
      ));
      
      // If this is the active tab, reset the messages
      if (tabId === activeTabId) {
        setState(prev => ({ 
          ...prev, 
          messages: [{
            contactId: contactId,
            role: 'system',
            content: welcomeMessage
          }]
        }));
        updateActiveTabMessageCount(0);
      }
    } catch (error) {
      console.error('Error clearing tab messages:', error);
    }
  }, [chatTabs, activeTabId, contactId, updateActiveTabMessageCount, welcomeMessage]);

  // Use external section state if provided
  const currentSection = externalCurrentSection !== undefined ? externalCurrentSection : state.currentSection;
  const setCurrentSection = onSetCurrentSection || actions.setCurrentSection;

  // Show loading indicator when externally improving or internally processing
  const isProcessing = isImproving || state.isProcessing;

  // When improvement starts, add a message
  useEffect(() => {
    if (isImproving && currentSection) {
      const targetSection = sections.find(s => s.id === currentSection);
      if (targetSection?.content) {
        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage?.role !== 'system' || !lastMessage.content.includes('Analyzing')) {
          const improvementMessage: Message = {
            contactId: contactId,
            role: 'assistant',
            content: `🔄 Analyzing and improving the **${targetSection.title}** section...`,
            id: `improvement-${Date.now()}`
          };
          actions.addMessage(improvementMessage);
        }
      }
    }
  }, [isImproving, currentSection, sections, contactId, actions, state.messages]);

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        
        // Validate file type
        const allowedTypes = ['application/pdf', 'text/markdown', 'text/plain'];
        if (!allowedTypes.includes(file.type)) {
          alert('Please upload a PDF or Markdown file.');
          return;
        }

        // Handle file upload through chat API
        handleFileUpload(file);
      }
    },
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false),
    onDropRejected: () => setIsDragging(false),
    accept: {
      'application/pdf': ['.pdf'],
      'text/markdown': ['.md'],
      'text/plain': ['.txt']
    },
    multiple: false,
    noClick: true, // Disable click to upload, only allow drag and drop
    noKeyboard: true // Disable keyboard activation
  });

  // Separate file input ref for manual file selection
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle manual file selection via paperclip button
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'text/markdown', 'text/plain'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload a PDF or Markdown file.');
        return;
      }

      // Handle file upload through chat API
      handleFileUpload(file);
    }
    
    // Clear the input value so the same file can be selected again
    if (event.target) {
      event.target.value = '';
    }
  };

  // Handle file upload through chat API
  const handleFileUpload = async (file: File) => {
    try {
      // Create a new AbortController for this file
      const controller = new AbortController();
      abortController.current = controller;

      // Add initial processing message with progress tracking
      const processingMessageId = `upload-${Date.now()}`;
      const processingMessage: Message = {
        contactId: contactId,
        role: 'assistant',
        content: `📄 I've received **${file.name}** and I'm uploading it now...`,
        id: processingMessageId,
        metadata: {
          isProcessing: true,
          progress: {
            stage: 'uploading',
            current: 0,
            total: 100,
            message: 'Uploading file...'
          }
        }
      };
      actions.addMessage(processingMessage);

      // STEP 1: Upload file and get fileId
      const uploadResponse = await documentHandlers.uploadFile(file, entityType, entityId);
      
      if (!uploadResponse.success || !uploadResponse.fileId) {
        throw new Error(uploadResponse.error || 'File upload failed');
      }

      // Update message with upload success
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg => 
          msg.id === processingMessageId 
            ? {
                ...msg,
                content: `📄 **${file.name}** uploaded successfully! ${uploadResponse.wasFromCache ? '(Found existing copy)' : '(New file processed)'}\n\nStarting document analysis...`,
                metadata: {
                  ...msg.metadata,
                  progress: {
                    stage: 'analyzing',
                    current: 30,
                    total: 100,
                    message: 'Starting analysis...'
                  }
                }
              }
            : msg
        )
      }));

      // STEP 2: Analyze document using fileId
      const apiResponse = await documentHandlers.analyzeDocument(uploadResponse.fileId, entityType, entityId, {
        chatContext: entityType === 'workspace' ? 'dashboard' : entityType,
        dashboardContext
      });
      
      if (apiResponse === 'SSE') {
        // SSE handling is done in analyzeDocument
        console.log('Document processed via SSE');
      } else {
        // Regular document analysis response
        console.log('API Response:', apiResponse);
        
        // Check if we have documentAnalysis in metadata
        let documentAnalysisData = apiResponse.metadata?.documentAnalysis;
        const extractedData = apiResponse.metadata?.extractedData as DocumentAnalysisResult['extractedData'];
        
        if (!documentAnalysisData && apiResponse.metadata) {
          // Create documentAnalysis from metadata if it doesn't exist
          const metadata = apiResponse.metadata as Record<string, unknown>;
          documentAnalysisData = {
            documentType: (metadata.documentType as DocumentAnalysisResult['documentType']) || 'other',
            confidence: (metadata.confidence as number) || 0,
            suggestedActions: []
          };
        }
        
        if (documentAnalysisData) {
          // Merge the extracted data into the analysis result
          const analysisWithData: DocumentAnalysisResult = {
            ...documentAnalysisData,
            extractedData: extractedData
          };
          setAnalysisResult(analysisWithData);
        }

        // Add the response message
        actions.addMessage({
          contactId: contactId,
          role: 'assistant',
          content: apiResponse.response || 'Document analysis completed',
          metadata: {
            actions: apiResponse.actions || [],
            documentAnalysis: documentAnalysisData,
            extractedData: extractedData
          },
          id: `analysis-${Date.now()}`
        });
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('File upload cancelled');
        return;
      }

      console.error('Error uploading file:', error);
      const errorMessage: Message = {
        contactId: contactId,
        role: 'assistant',
        content: `❌ **Error uploading ${file.name}:** ${error instanceof Error ? error.message : 'Unknown error'}`,
        id: `error-${Date.now()}`
      };
      actions.addMessage(errorMessage);
    }
  };

  // Combine dropzone drag state with internal state
  useEffect(() => {
    setIsDragging(isDragActive);
  }, [isDragActive]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Create a ref to access current chatTabs without causing re-renders
  const chatTabsRef = useRef(chatTabs);
  chatTabsRef.current = chatTabs;

  // Load chat history for the active tab on mount
  useEffect(() => {
    const loadChatHistory = async () => {
      const activeTab = chatTabsRef.current.find((tab: ChatTab) => tab.id === activeTabId);
      if (!activeTab) return;
      
      try {
        let messageList: Message[] = [];
        
        if (activeTab.sessionId) {
          // Load messages from the specific session
          const response = await fetch(`/api/chat/sessions/${activeTab.sessionId}`);
          if (response.ok) {
            const data = await response.json();
            messageList = data.session.messages || [];
            console.log('Loading chat history - checking metadata:', 
              messageList.map((m: Message) => ({ 
                role: m.role, 
                hasMetadata: !!m.metadata,
                actions: m.metadata?.actions,
                metadataKeys: m.metadata ? Object.keys(m.metadata) : []
              }))
            );
          }
        }
        
        // If no messages, show welcome message
        if (messageList.length === 0) {
          messageList = [{
            contactId: contactId,
            role: 'system',
            content: welcomeMessage
          }];
        }
        
        setState(prev => ({
          ...prev,
          messages: messageList
        }));
        
        // Update message count
        const userMessages = messageList.filter((m: Message) => m.role !== 'system').length;
        updateActiveTabMessageCount(userMessages);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };

    loadChatHistory();
  }, [activeTabId, contactId, welcomeMessage, updateActiveTabMessageCount]);

  const handleCancel = () => {
    if (abortController.current) {
      abortController.current.abort();
    }
    actions.setProcessing(false);
    setPendingResponse(null);
    
    // Remove pending response message
    setState(prev => ({
      ...prev,
      messages: prev.messages.filter(m => m.id !== pendingResponse?.id)
    }));
  };

  const handleReplace = async (sectionId: string, content: string) => {
    if (onSectionUpdate) {
      await onSectionUpdate(sectionId, content);
    }
    
    onDraftingSectionsUpdate?.({
      [sectionId]: false
    });
  };

  const handleAppend = async (sectionId: string, content: string) => {
    if (onSectionUpdate) {
      const currentContent = sections.find(s => s.id === sectionId)?.content || '';
      const newContent = typeof currentContent === 'string' 
        ? `${currentContent}\n\n${content}`
        : content;
      
      await onSectionUpdate(sectionId, newContent);
    }
  };

  const handleRefine = async (sectionId: string) => {
    setCurrentSection(sectionId);
  };

  return (
    <div 
      {...getRootProps()}
      className={`flex flex-col h-[calc(100vh-4rem)] relative ${
        isDragging ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-300 dark:border-blue-600' : ''
      }`}
    >
      <input {...getInputProps()} />
      
      {/* Hidden file input for manual selection */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        accept=".pdf,.md,.txt"
        style={{ display: 'none' }}
      />
      
      {/* Chat Tabs */}
      <ChatTabs
        tabs={chatTabs}
        onTabSwitch={handleTabSwitch}
        onTabCreate={handleTabCreate}
        onTabClose={handleTabClose}
        onTabClear={handleTabClear}
        isDeleteMode={isDeleteMode}
        onToggleDeleteMode={handleToggleDeleteMode}
        chatHistoryDropdown={
          <ChatHistoryDropdown
            entityType={entityType}
            entityId={entityId}
            currentMessages={state.messages}
            onLoadSession={async (sessionId: string) => {
              try {
                console.log('Loading session into current tab:', sessionId);
                
                // Fetch the session with its messages
                const response = await fetch(`/api/chat/sessions/${sessionId}`);
                
                if (!response.ok) {
                  throw new Error(`Failed to load session: ${response.status}`);
                }
                
                const data = await response.json();
                const sessionData = data.session;
                
                // Update the current active tab to point to this session
                setChatTabs((prev: ChatTab[]) => prev.map((tab: ChatTab) => 
                  tab.id === activeTabId 
                    ? { 
                        ...tab, 
                        sessionId: sessionId,
                        label: sessionData.title || `Session ${sessionId.slice(-8)}`,
                        messageCount: sessionData.messages?.length || 0
                      }
                    : tab
                ));
                
                // Update the chat state with the loaded messages
                setState(prev => ({
                  ...prev,
                  messages: sessionData.messages || []
                }));
                
                console.log(`Loaded ${sessionData.messages?.length || 0} messages from session: ${sessionData.title}`);
              } catch (error) {
                console.error('Failed to load session:', error);
                alert('Failed to load chat session. Please try again.');
              }
            }}
            onNewSession={() => {
              console.log('Starting new session in current tab');
              
              // Clear the current tab's session and reset its state
              setChatTabs((prev: ChatTab[]) => prev.map((tab: ChatTab) => 
                tab.id === activeTabId 
                  ? { 
                      ...tab, 
                      sessionId: null,
                      label: 'General',
                      messageCount: 0
                    }
                  : tab
              ));
              
              // Clear current messages and start fresh
              setState(prev => ({
                ...prev,
                messages: [{
                  contactId: contactId,
                  role: 'system',
                  content: welcomeMessage,
                  id: `system-${Date.now()}`
                }]
              }));
            }}
          />
        }
      />

      {/* Bulk Delete Controls */}
      {isDeleteMode && (
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>{selectedMessages.size} message(s) selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAllMessages}
              className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={handleClearSelections}
              className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleBulkDeleteMessages}
              disabled={selectedMessages.size === 0}
              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg z-50">
          <div className="text-center">
            <div className="text-2xl mb-2">📄</div>
            <div className="text-lg font-semibold text-blue-700 dark:text-blue-300">
              Drop your document here
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              Supports PDF and Markdown files
            </div>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2 relative">

        {state.messages.map((message, index) => (
          <ChatMessage
            key={message.id || index}
            message={message}
            isLoading={isProcessing && index === state.messages.length - 1}
            onCancel={message.id === pendingResponse?.id ? handleCancel : undefined}
            onReplace={handleReplace}
            onAppend={handleAppend}
            onRefine={handleRefine}
            currentModel={state.currentModel}
            onModelChange={actions.setCurrentModel}
            isDraft={state.draftingSections[message.suggestion?.sectionId || ''] || false}
            isImprovable={state.improvableSections.includes(message.suggestion?.sectionId || '')}
            onActionClick={(action: string, data?: unknown) => documentHandlers.handleAction(action, data, analysisResult, onActionClick)}
            isDeleteMode={isDeleteMode}
            isSelected={selectedMessages.has(message.id || '')}
            onToggleSelection={() => handleToggleMessageSelection(message.id || '')}
          />
        ))}
        
        {/* Typing indicator */}
        <TypingIndicator isVisible={isProcessing} />
        
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <ChatInput
        onSubmit={async (content: string) => {
          const userMessage: Message = {
            contactId: contactId,
            role: 'user',
            content,
            id: `user-${Date.now()}`
          };
          
          actions.addMessage(userMessage);
          
          // Add pending response
          const pendingMsg: Message = {
            contactId: contactId,
            role: 'assistant',
            content: '...',
            id: `pending-${Date.now()}`
          };
          
          setPendingResponse(pendingMsg);
          actions.addMessage(pendingMsg);
          
          actions.setProcessing(true);

          try {
            // Get active tab
            const activeTab = chatTabs.find((tab: ChatTab) => tab.id === activeTabId);
            const tabLabel = activeTab?.label || activeTabId;
            
            // Use unified API for saving messages
            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                entityType,
                entityId,
                message: content,
                role: 'user',
                action: 'chat',
                tabContext: activeTabId,
                tabLabel: tabLabel,
                sessionId: activeTab?.sessionId, // Include current session if exists
                currentContent: sections,
                recentMessages: state.messages,
                metadata: {
                  contentLength: sections.reduce((total, section) => {
                    const sectionContent = typeof section.content === 'string' ? section.content : '';
                    return total + sectionContent.length;
                  }, 0)
                }
              }),
            });

            if (response.ok) {
              const apiResponse = await response.json();
              
              if (apiResponse.success) {
                // If a new session was created, update the current tab
                if (apiResponse.sessionId && activeTab && !activeTab.sessionId) {
                  setChatTabs((prev: ChatTab[]) => prev.map((tab: ChatTab) => 
                    tab.id === activeTabId 
                      ? { 
                          ...tab, 
                          sessionId: apiResponse.sessionId,
                          label: apiResponse.sessionTitle || tabLabel
                        }
                      : tab
                  ));
                }
                
                // Create AI message from API response
                const aiMessage: Message = {
                  contactId: contactId,
                  role: 'assistant',
                  content: apiResponse.response,
                  id: `ai-${Date.now()}`,
                  metadata: {
                    actions: apiResponse.actions || [],
                    intent: apiResponse.intent,
                    ...apiResponse.metadata
                  }
                };
                
                // Remove pending message and add real response
                setState(prev => ({
                  ...prev,
                  messages: prev.messages.filter(m => m.id !== pendingMsg.id).concat([aiMessage])
                }));
              } else {
                // API returned success: false, show ephemeral error
                throw new Error(apiResponse.error || 'Failed to get AI response');
              }

              // Update message count
              const userMessages = state.messages.filter(m => m.role !== 'system').length + 1;
              updateActiveTabMessageCount(userMessages);
            } else {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
              throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
          } catch (error) {
            console.error('Error sending message:', error);
            
            // Show ephemeral error message
            const errorMessage: Message = {
              contactId: contactId,
              role: 'assistant',
              content: `❌ **Error:** ${error instanceof Error ? error.message : 'Failed to send message'}`,
              id: `error-${Date.now()}`,
              isEphemeral: true
            };
            
            // Remove pending message, user message, and add ephemeral error
            setState(prev => ({
              ...prev,
              messages: prev.messages
                .filter(m => m.id !== pendingMsg.id && m.id !== userMessage.id)
                .concat([errorMessage])
            }));
            
            // Remove error message after 5 seconds
            setTimeout(() => {
              setState(prev => ({
                ...prev,
                messages: prev.messages.filter(m => m.id !== errorMessage.id)
              }));
            }, 5000);
          } finally {
            actions.setProcessing(false);
            setPendingResponse(null);
          }
          
          scrollToBottom();
        }}
        onFocus={() => {}}
        disabled={isProcessing}
        currentSection={currentSection}
        onFileUpload={handleFileSelect}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        data={analysisResult?.extractedData}
        onConfirm={(data) => documentHandlers.handleBulkImport(data)}
      />

      {/* Document Analysis Modal */}
      {analysisResult && (
        <DocumentAnalysisModal
          isOpen={showAnalysisModal}
          onClose={() => setShowAnalysisModal(false)}
          fileName={analysisResult.documentType || 'Uploaded File'}
          analysisResult={analysisResult}
          onConfirmAction={(action: string, data?: unknown) => documentHandlers.handleAction(action, data, analysisResult, onActionClick)}
        />
      )}
    </div>
  );
} 
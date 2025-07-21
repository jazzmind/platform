import { 
  Message, 
  ChatState, 
  DocumentAnalysisResult, 
  DocumentActionHandlersProps 
} from '@/src/types/chat';

export class DocumentActionHandlers {
  private props: DocumentActionHandlersProps;

  constructor(props: DocumentActionHandlersProps) {
    this.props = props;
  }

  // NEW: Upload file and return fileId
  async uploadFile(file: File, entityType: string, entityId: string): Promise<{
    success: boolean;
    fileId?: string;
    fileHash?: string;
    fileName?: string;
    wasFromCache?: boolean;
    error?: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);    
    formData.append('entityType', entityType);
    formData.append('entityId', entityId);

    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
      return { success: false, error: errorData.error };
    }

    return await response.json();
  }

  // NEW: Analyze document using fileId
  async analyzeDocumentByFileId(
    fileId: string,
    targetEntityType: string, 
    targetEntityId: string, 
    context?: { chatContext: string; dashboardContext?: unknown }
  ): Promise<'SSE'> {
    const response = await fetch('/api/documents/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId,
        entityType: targetEntityType,
        entityId: targetEntityId,
        context,
        userMessage: ''
      }),
    });

    if (!response.ok) {
      throw new Error(`Document analysis failed: ${response.statusText}`);
    }

    // Handle SSE streaming response
    return 'SSE';
  }

  // UPDATED: Analyze document using fileId or File
  async analyzeDocument(
    fileIdOrFile: string | File, 
    targetEntityType?: string, 
    targetEntityId?: string, 
    context?: { chatContext: string; dashboardContext?: unknown }
  ): Promise<{ response: string; actions: Array<{ action: string; label: string; description: string }>; metadata?: { documentAnalysis?: DocumentAnalysisResult; extractedData?: DocumentAnalysisResult['extractedData'] } } | 'SSE'> {
    // Handle both old File-based calls and new fileId-based calls
    if (typeof fileIdOrFile === 'string') {
      // NEW: fileId-based analysis
      return await this.analyzeDocumentByFileId(fileIdOrFile, targetEntityType!, targetEntityId!, context);
    }

    // OLD: File-based analysis (for backwards compatibility)
    const file = fileIdOrFile;
    const { entityType, entityId, enableSSE, dashboardContext } = this.props;
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Use appropriate action based on entity type
    if (entityType === 'workspace') {
      formData.append('action', 'analyze-dashboard-document');
      // Add dashboard context for opportunity matching
      if (dashboardContext) {
        formData.append('dashboardContext', JSON.stringify(dashboardContext));
      }
    } else {
      formData.append('action', 'analyze-document');
    }
    
    formData.append('entityType', entityType);
    formData.append('entityId', entityId);
    
    // For workspace/dashboard documents, always use SSE
    if (entityType === 'workspace') {
      return await this.handleWorkspaceDocumentSSE(file);
    }

    // Check if SSE is needed for transcripts
    const fileName = file.name.toLowerCase();
    const isTranscript = enableSSE && (fileName.includes('transcript') || fileName.includes('meeting') || 
                        fileName.includes('call') || file.type === 'text/plain');

    if (isTranscript) {
      // Use SSE for transcript processing
      return await this.handleTranscriptProcessingSSE(file);
    }

    // Regular document processing for opportunities/proposals
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to analyze document');
    }

    return response.json();
  }

  // SSE-based workspace document processing
  async handleWorkspaceDocumentSSE(file: File): Promise<'SSE'> {
    const { entityType, entityId, dashboardContext, actions, contactId, setState } = this.props;
    
    try {
      // Prepare form data for document analysis
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'analyze-dashboard-document');
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      
      // Add dashboard context for opportunity matching
      if (dashboardContext) {
        formData.append('dashboardContext', JSON.stringify(dashboardContext));
      }

      // Make request to chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to analyze document: ${response.status} ${response.statusText}`);
      }

      // Handle SSE streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let currentProcessingMessageId: string | null = null;
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.type === 'progress' && data.progress) {
                    // Update progress in the current processing message
                    setState((prev: ChatState) => ({
                      ...prev,
                      messages: prev.messages.map((msg: Message, index: number) => {
                        // Find the message to update - either the upload message or the current processing message
                        const shouldUpdate = currentProcessingMessageId 
                          ? msg.id === currentProcessingMessageId
                          : (index === prev.messages.length - 1 && msg.role === 'assistant' && msg.id?.startsWith('upload-'));
                          
                        if (shouldUpdate) {
                          return {
                            ...msg,
                            content: `📄 Processing **${file.name}**\n\n**${data.progress.stage.charAt(0).toUpperCase() + data.progress.stage.slice(1)}:** ${data.progress.message}`,
                            progress: data.progress,
                            metadata: {
                              ...msg.metadata,
                              isProcessing: true
                            }
                          };
                        }
                        return msg;
                      })
                    }));
                  } else if (data.type === 'message' && data.content) {
                    // Check if this message should replace the current processing message
                    const shouldReplaceProcessingMessage = currentProcessingMessageId && (
                      data.content.includes('Document Classification Complete') ||
                      data.metadata?.isProcessing === false
                    );

                    if (!currentProcessingMessageId) {
                      // Replace the initial "processing" message with the first SSE message
                      setState((prev: ChatState) => ({
                        ...prev,
                        messages: prev.messages.map((msg: Message, index: number) => {
                          if (index === prev.messages.length - 1 && msg.role === 'assistant' && msg.id?.startsWith('upload-')) {
                            const updatedMessage = {
                              ...msg,
                              content: data.content,
                              progress: data.progress,
                              metadata: {
                                ...data.metadata,
                                isProcessing: false
                              }
                            };
                            // Remember this message ID for future progress updates
                            currentProcessingMessageId = msg.id || null;
                            return updatedMessage;
                          }
                          return msg;
                        })
                      }));
                    } else if (shouldReplaceProcessingMessage) {
                      // Replace the current processing message
                      setState((prev: ChatState) => ({
                        ...prev,
                        messages: prev.messages.map((msg: Message) => {
                          if (msg.id === currentProcessingMessageId) {
                            return {
                              ...msg,
                              content: data.content,
                              progress: data.progress,
                              metadata: {
                                ...data.metadata,
                                isProcessing: false
                              }
                            };
                          }
                          return msg;
                        })
                      }));
                    } else {
                      // Add subsequent messages from stream
                      const newMessageId = `stream-${Date.now()}-${Math.random()}`;
                      actions.addMessage({
                        contactId: contactId,
                        role: data.role || 'assistant',
                        content: data.content,
                        id: newMessageId,
                        metadata: data.metadata || {},
                        progress: data.progress
                      });
                      // Update the current processing message ID for future progress updates
                      currentProcessingMessageId = newMessageId;
                    }
                    
                    // Check for analysis result in metadata
                    if (data.metadata?.analysisResult) {
                      this.props.setAnalysisResult(data.metadata.analysisResult);
                    }
                  }
                } catch (parseError) {
                  console.warn('Failed to parse workspace SSE data:', parseError);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      return 'SSE';
    } catch (error) {
      console.error('Workspace SSE processing error:', error);
      throw error;
    }
  }

  // SSE-based transcript processing
  async handleTranscriptProcessingSSE(file: File): Promise<'SSE'> {
    const { enableSSE, entityType, entityId, dashboardContext, actions, contactId, setState } = this.props;
    
    if (!enableSSE) {
      throw new Error('SSE not enabled for this chat container');
    }

    try {
      // Step 1: Create SSE session for transcript processing
      const sseResponse = await fetch('/api/sse/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-transcript-session',
          data: {
            transcriptId: `transcript-${Date.now()}`,
            fileName: file.name
          }
        })
      });

      if (!sseResponse.ok) {
        throw new Error('Failed to create SSE session');
      }

      const { sessionId } = await sseResponse.json();

      // Step 2: Connect to SSE stream
      const eventSource = new EventSource(`/api/sse/transcript?sessionId=${sessionId}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'transcript-progress') {
            // Handle progress updates
            const { stage, progress, message } = data.data;
            
            // Update the last assistant message with progress
            setState((prev: ChatState) => ({
              ...prev,
              messages: prev.messages.map((msg: Message, index: number) => {
                if (index === prev.messages.length - 1 && msg.role === 'assistant' && msg.id?.startsWith('processing-')) {
                  return {
                    ...msg,
                    content: `📞 **Processing ${file.name}**\n\n**${stage.charAt(0).toUpperCase() + stage.slice(1)}:** ${message}`,
                    progress: {
                      stage: stage as "chunking" | "processing" | "merging" | "matching" | "analyzing",
                      current: progress,
                      total: 100,
                      message
                    }
                  };
                }
                return msg;
              })
            }));
          } else if (data.type === 'connected') {
            console.log('Connected to transcript SSE stream:', data.data);
          } else if (data.type === 'heartbeat') {
            // Keep connection alive
            console.log('SSE heartbeat received');
          }
        } catch (parseError) {
          console.warn('Failed to parse SSE data:', parseError);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        eventSource.close();
      };

      // Step 3: Submit transcript for processing
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'analyze-dashboard-document');
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      formData.append('sseSessionId', sessionId);
      
      if (dashboardContext) {
        formData.append('dashboardContext', JSON.stringify(dashboardContext));
      }

      const processingResponse = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      if (!processingResponse.ok) {
        throw new Error('Failed to start transcript processing');
      }

      // Handle streaming response
      const contentType = processingResponse.headers.get('content-type');
      if (contentType?.includes('text/plain')) {
        const reader = processingResponse.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    
                    if (data.type === 'message' && data.content) {
                      actions.addMessage({
                        contactId: contactId,
                        role: data.role || 'assistant',
                        content: data.content,
                        id: `stream-${Date.now()}-${Math.random()}`,
                        metadata: data.metadata,
                        progress: data.progress
                      });
                    }
                  } catch (parseError) {
                    console.warn('Failed to parse streaming data:', parseError);
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        }
      } else {
        const result = await processingResponse.json();
        
        actions.addMessage({
          contactId: contactId,
          role: 'assistant',
          content: result.response || 'Transcript processing completed',
          id: `final-${Date.now()}`,
          metadata: result.metadata || {}
        });
      }

      // Clean up SSE connection
      setTimeout(() => {
        eventSource.close();
        fetch('/api/sse/transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'cleanup-session',
            data: { sessionId }
          })
        }).catch(err => console.warn('Failed to cleanup SSE session:', err));
      }, 1000);

      return 'SSE';

    } catch (error) {
      console.error('SSE transcript processing error:', error);
      throw error;
    }
  }

  // action handling for all entity types
  async handleAction(action: string, data?: unknown, analysisResult?: DocumentAnalysisResult | null, onActionClick?: (action: string, data?: unknown) => void) {
    const { entityType, contactId, actions } = this.props;
    
    console.log('Action handler:', { action, data, entityType });

    // Dashboard-specific actions
    if (entityType === 'workspace') {
      switch (action) {
        case 'bulk_import':
          if (data) {
            await this.handleBulkImport(data);
          } else if (analysisResult?.extractedData && (
            (analysisResult.extractedData.opportunities && analysisResult.extractedData.opportunities.length > 2) ||
            (analysisResult.extractedData.contacts && analysisResult.extractedData.contacts.length > 2) ||
            (analysisResult.extractedData.organizations && analysisResult.extractedData.organizations.length > 2)
          )) {
            this.props.setShowBulkImportModal(true);
          } else {
            await this.handleBulkImport(analysisResult?.extractedData);
          }
          break;
        
        case 'view_analysis_details':
          this.props.setShowAnalysisModal(true);
          break;

        case 'create_opportunity':
        case 'create_proposal':
          actions.addMessage({
            contactId: contactId,
            role: 'assistant',
            content: `🎯 **Creating New ${action === 'create_opportunity' ? 'Opportunity' : 'Proposal'}**\n\nI'll help you create a new ${action === 'create_opportunity' ? 'opportunity' : 'proposal'} based on this document...`,
            id: `action-${Date.now()}`
          });
          break;

        default:
          // Fall back to custom action handler
          if (onActionClick) {
            onActionClick(action, data);
          }
          break;
      }
    } else {
      // Pass through to custom action handler for opportunity/proposal
      if (onActionClick) {
        onActionClick(action, data);
      }
    }
  }

  // Bulk import handler
  async handleBulkImport(selectedData: DocumentAnalysisResult['extractedData']) {
    const { contactId, actions } = this.props;
    
    if (!selectedData) return;

    try {
      actions.addMessage({
        contactId: contactId,
        role: 'assistant',
        content: `⚡ **Importing Data**\n\nProcessing ${selectedData.opportunities?.length || 0} opportunities, ${selectedData.contacts?.length || 0} contacts, and ${selectedData.organizations?.length || 0} organizations...`,
        id: `import-${Date.now()}`
      });

      const response = await fetch('/api/dashboard/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      actions.addMessage({
        contactId: contactId,
        role: 'assistant',
        content: `✅ **Import Complete**\n\n${result.summary.message}\n\nYou can find them in their respective sections.`,
        id: `import-success-${Date.now()}`
      });

      this.props.setShowAnalysisModal(false);

    } catch (error) {
      actions.addMessage({
        contactId: contactId,
        role: 'assistant',
        content: `❌ **Import Failed**\n\n${error instanceof Error ? error.message : 'Unknown error'}`,
        id: `import-error-${Date.now()}`
      });
    } finally {
      this.props.setShowBulkImportModal(false);
    }
  }
}

export default DocumentActionHandlers; 
import { useState, useCallback } from 'react';
import { MessageActionHandlersProps } from '@/src/types/chat';

export class MessageActionHandlers {
  private props: MessageActionHandlersProps;
  private isDeleteMode: boolean;
  private selectedMessages: Set<string>;
  private setIsDeleteMode: React.Dispatch<React.SetStateAction<boolean>>;
  private setSelectedMessages: React.Dispatch<React.SetStateAction<Set<string>>>;

  constructor(props: MessageActionHandlersProps) {
    this.props = props;
    this.isDeleteMode = false;
    this.selectedMessages = new Set();
    
    // These need to be set from the component using the hook
    this.setIsDeleteMode = () => {};
    this.setSelectedMessages = () => {};
  }

  // Method to initialize the state setters from the component
  setStateSetters(
    setIsDeleteMode: React.Dispatch<React.SetStateAction<boolean>>,
    setSelectedMessages: React.Dispatch<React.SetStateAction<Set<string>>>
  ) {
    this.setIsDeleteMode = setIsDeleteMode;
    this.setSelectedMessages = setSelectedMessages;
  }

  // Update internal state when external state changes
  updateInternalState(isDeleteMode: boolean, selectedMessages: Set<string>) {
    this.isDeleteMode = isDeleteMode;
    this.selectedMessages = selectedMessages;
  }

  // Toggle delete mode
  handleToggleDeleteMode() {
    this.setIsDeleteMode(prev => {
      if (prev) {
        // Exiting delete mode, clear selections
        this.setSelectedMessages(new Set());
      }
      return !prev;
    });
  }

  // Handle message selection
  handleToggleMessageSelection(messageId: string) {
    this.setSelectedMessages(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(messageId)) {
        newSelected.delete(messageId);
      } else {
        newSelected.add(messageId);
      }
      return newSelected;
    });
  }

  // Select all messages
  handleSelectAllMessages() {
    const { state } = this.props;
    const selectableMessages = state.messages
      .filter(m => m.id && m.role !== 'system')
      .map(m => m.id!);
    this.setSelectedMessages(new Set(selectableMessages));
  }

  // Clear all selections
  handleClearSelections() {
    this.setSelectedMessages(new Set());
  }

  // Bulk delete selected messages using unified API
  async handleBulkDeleteMessages() {
    const { entityType, entityId, setState, updateActiveTabMessageCount } = this.props;
    
    if (this.selectedMessages.size === 0) return;
    
    const confirmed = confirm(`Are you sure you want to delete ${this.selectedMessages.size} message(s)?`);
    if (!confirmed) return;

    try {
      // Delete messages using unified API in parallel
      const deletePromises = Array.from(this.selectedMessages).map(messageId =>
        fetch('/api/chat', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType,
            entityId,
            messageId
          })
        })
      );

      await Promise.all(deletePromises);

      // Update state to remove deleted messages
      setState(prev => {
        const newMessages = prev.messages.filter(m => !this.selectedMessages.has(m.id || ''));
        const userMessages = newMessages.filter(m => m.role !== 'system').length;
        updateActiveTabMessageCount(userMessages);
        return {
          ...prev,
          messages: newMessages
        };
      });

      // Clear selections and exit delete mode
      this.setSelectedMessages(new Set());
      this.setIsDeleteMode(false);
    } catch (error) {
      console.error('Error deleting messages:', error);
    }
  }

  // Delete single message
  async handleDeleteSingleMessage(messageId: string) {
    const { entityType, entityId, setState, updateActiveTabMessageCount } = this.props;
    
    const confirmed = confirm('Are you sure you want to delete this message?');
    if (!confirmed) return;

    try {
      const response = await fetch('/api/chat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          messageId
        })
      });

      if (response.ok) {
        // Update state to remove deleted message
        setState(prev => {
          const newMessages = prev.messages.filter(m => m.id !== messageId);
          const userMessages = newMessages.filter(m => m.role !== 'system').length;
          updateActiveTabMessageCount(userMessages);
          return {
            ...prev,
            messages: newMessages
          };
        });
      } else {
        console.error('Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }

  // Get current message state
  getCurrentMessageState() {
    return {
      isDeleteMode: this.isDeleteMode,
      selectedMessages: this.selectedMessages,
      selectedCount: this.selectedMessages.size
    };
  }
}

// Hook to use message action handlers
export function useMessageActionHandlers(props: MessageActionHandlersProps) {
  const handlers = new MessageActionHandlers(props);
  
  const [isDeleteMode, setIsDeleteMode] = useState<boolean>(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

  // Set the state setters in the handlers
  handlers.setStateSetters(setIsDeleteMode, setSelectedMessages);
  
  // Update internal state when external state changes
  handlers.updateInternalState(isDeleteMode, selectedMessages);

  return {
    isDeleteMode,
    selectedMessages,
    setIsDeleteMode,
    setSelectedMessages,
    handleToggleDeleteMode: useCallback(() => handlers.handleToggleDeleteMode(), [handlers]),
    handleToggleMessageSelection: useCallback((messageId: string) => handlers.handleToggleMessageSelection(messageId), [handlers]),
    handleSelectAllMessages: useCallback(() => handlers.handleSelectAllMessages(), [handlers]),
    handleClearSelections: useCallback(() => handlers.handleClearSelections(), [handlers]),
    handleBulkDeleteMessages: useCallback(() => handlers.handleBulkDeleteMessages(), [handlers]),
    handleDeleteSingleMessage: useCallback((messageId: string) => handlers.handleDeleteSingleMessage(messageId), [handlers]),
    getCurrentMessageState: useCallback(() => handlers.getCurrentMessageState(), [handlers])
  };
}

export default MessageActionHandlers; 
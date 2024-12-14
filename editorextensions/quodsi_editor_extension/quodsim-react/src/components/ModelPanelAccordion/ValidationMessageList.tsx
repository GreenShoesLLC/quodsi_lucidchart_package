import React, { useEffect } from 'react';
import { ValidationMessage } from "@quodsi/shared";
import ValidationMessageItem from './ValidationMessageItem';

interface ValidationMessageListProps {
  messages: ValidationMessage[];
  selectedElementId: string | null;
  showSelectedOnly: boolean;
}

export const ValidationMessageList: React.FC<ValidationMessageListProps> = ({
  messages,
  selectedElementId,
  showSelectedOnly,
}) => {
  // Performance tracking
  const renderStartTime = performance.now();

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime;
    console.log(`ValidationMessageList render time: ${renderTime.toFixed(2)}ms`);
  });

  // Log component mount and updates
  useEffect(() => {
    console.group('ValidationMessageList Mount/Update');
    console.log('Props received:', {
      totalMessages: messages.length,
      selectedElementId: selectedElementId || 'none',
      showSelectedOnly,
      messageTypes: messages.reduce((acc, m) => {
        acc[m.type] = (acc[m.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });
    console.groupEnd();
  }, [messages, selectedElementId, showSelectedOnly]);

  // Log when selectedElementId changes
  useEffect(() => {
    console.log('Selected Element Changed:', {
      newSelectedId: selectedElementId,
      timestamp: new Date().toISOString(),
      relevantMessages: messages.filter(m => m.elementId === selectedElementId).length
    });
  }, [selectedElementId, messages]);

  console.group('ValidationMessageList Render');
  
  // Filter messages based on selectedElementId if showSelectedOnly is true
    const filteredMessages =
    showSelectedOnly && selectedElementId && selectedElementId !== "0_0"
        ? messages.filter((message) => message.elementId === selectedElementId)
        : messages;

  // Log filtering results
  console.log('Message Filtering:', {
    originalCount: messages.length,
    filteredCount: filteredMessages.length,
    filteringActive: showSelectedOnly && selectedElementId,
    selectedElementId: selectedElementId || 'none',
    removedMessages: messages.length - filteredMessages.length,
    filterReason: showSelectedOnly 
      ? (selectedElementId ? 'Showing selected element only' : 'No element selected') 
      : 'Showing all messages'
  });

  // Log detailed message analysis
  console.log('Message Analysis:', {
    errorCount: filteredMessages.filter(m => m.type === 'error').length,
    warningCount: filteredMessages.filter(m => m.type === 'warning').length,
    messagesByType: filteredMessages.reduce((acc, m) => {
      acc[m.type] = (acc[m.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  });

  const result = (
    <div className="validation-message-list">
      {filteredMessages.map((message, index) => {
        // Log individual message rendering
        console.log(`Rendering message ${index}:`, {
          type: message.type,
          elementId: message.elementId,
          messagePreview: message.message.substring(0, 50) + (message.message.length > 50 ? '...' : '')
        });

        return (
          <div className="bg-white rounded-md shadow-sm">
            {filteredMessages.map((message, index) => (
              <ValidationMessageItem
                key={`${message.elementId}-${index}`}
                message={message}
              />
            ))}
          </div>
        );
      })}
    </div>
  );

  console.log('Final Render Output:', {
    renderedMessageCount: filteredMessages.length,
    hasMessages: filteredMessages.length > 0,
    timestamp: new Date().toISOString()
  });

  console.groupEnd();

  return result;
};
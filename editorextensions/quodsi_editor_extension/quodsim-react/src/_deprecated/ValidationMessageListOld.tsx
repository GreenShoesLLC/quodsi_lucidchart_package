import React, { useEffect } from "react";
import { ValidationMessage, ComponentLogger } from "@quodsi/shared";
import ValidationMessageItem from "./ValidationMessageItem";

// Define a constant for the logger prefix
const LOG_PREFIX = "[ValidationMessageList]";

interface ValidationMessageListProps {
  messages: ValidationMessage[];
  selectedElementId: string | null;
  showSelectedOnly: boolean;
}

// Initialize logging to be disabled by default
ComponentLogger.setEnabled(LOG_PREFIX, false);

/**
 * Helper function to enable/disable logging for this component
 */
export const setValidationMessageListLogging = (enabled: boolean): void => {
  ComponentLogger.setEnabled(LOG_PREFIX, enabled);
};

export const ValidationMessageListOld: React.FC<ValidationMessageListProps> = ({
  messages,
  selectedElementId,
  showSelectedOnly,
}) => {
  // Performance tracking
  const renderStartTime = performance.now();

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime;
    ComponentLogger.log(
      LOG_PREFIX,
      `ValidationMessageList render time: ${renderTime.toFixed(2)}ms`
    );
  });

  // Log component mount and updates
  useEffect(() => {
    ComponentLogger.log(LOG_PREFIX, "Mount/Update");
    ComponentLogger.log(LOG_PREFIX, "Props received:", {
      totalMessages: messages.length,
      selectedElementId: selectedElementId || "none",
      showSelectedOnly,
      messageTypes: messages.reduce((acc, m) => {
        acc[m.type] = (acc[m.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    });
  }, [messages, selectedElementId, showSelectedOnly]);

  // Log when selectedElementId changes
  useEffect(() => {
    ComponentLogger.log(LOG_PREFIX, "Selected Element Changed:", {
      newSelectedId: selectedElementId,
      timestamp: new Date().toISOString(),
      relevantMessages: messages.filter(
        (m) => m.elementId === selectedElementId
      ).length,
    });
  }, [selectedElementId, messages]);

  ComponentLogger.log(LOG_PREFIX, "Render");

  // Filter messages based on selectedElementId if showSelectedOnly is true
  const filteredMessages =
    showSelectedOnly && selectedElementId && selectedElementId !== "0_0"
      ? messages.filter((message) => message.elementId === selectedElementId)
      : messages;

  // Log filtering results
  ComponentLogger.log(LOG_PREFIX, "Message Filtering:", {
    originalCount: messages.length,
    filteredCount: filteredMessages.length,
    filteringActive: showSelectedOnly && selectedElementId,
    selectedElementId: selectedElementId || "none",
    removedMessages: messages.length - filteredMessages.length,
    filterReason: showSelectedOnly
      ? selectedElementId
        ? "Showing selected element only"
        : "No element selected"
      : "Showing all messages",
  });

  // Log detailed message analysis
  ComponentLogger.log(LOG_PREFIX, "Message Analysis:", {
    errorCount: filteredMessages.filter((m) => m.type === "error").length,
    warningCount: filteredMessages.filter((m) => m.type === "warning").length,
    messagesByType: filteredMessages.reduce((acc, m) => {
      acc[m.type] = (acc[m.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  });

  const result = (
    <div className="validation-message-list">
      <div className="bg-white rounded-md shadow-sm">
        {filteredMessages.map((message, index) => {
          // Log individual message rendering
          ComponentLogger.log(LOG_PREFIX, `Rendering message ${index}:`, {
            type: message.type,
            elementId: message.elementId,
            messagePreview:
              message.message.substring(0, 50) +
              (message.message.length > 50 ? "..." : ""),
          });

          return (
            <ValidationMessageItem
              key={`${message.elementId}-${index}`}
              message={message}
            />
          );
        })}
      </div>
    </div>
  );

  ComponentLogger.log(LOG_PREFIX, "Final Render Output:", {
    renderedMessageCount: filteredMessages.length,
    hasMessages: filteredMessages.length > 0,
    timestamp: new Date().toISOString(),
  });

  return result;
};

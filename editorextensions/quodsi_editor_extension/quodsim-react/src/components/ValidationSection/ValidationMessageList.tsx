import React from "react";
import { ValidationMessage } from "@quodsi/shared";

import _ from "lodash";
import ValidationMessageItem from "../ModelPanelAccordion/ValidationMessageItem";

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
  // Create a unique key for messages that captures all relevant properties
  const getMessageKey = (message: ValidationMessage): string => {
    return `${message.type}_${message.elementId || ""}_${message.message}`;
  };

  // Get severity rank for sorting
  const getSeverityRank = (type: string): number => {
    switch (type.toLowerCase()) {
      case "error":
        return 0;
      case "warning":
        return 1;
      default:
        return 2;
    }
  };

  // Process messages
  const processedMessages = React.useMemo(() => {
    // First deduplicate messages using a more thorough comparison
    const uniqueMessages = _.uniqWith(
      messages,
      (a, b) =>
        a.type === b.type &&
        a.message === b.message &&
        a.elementId === b.elementId
    );

    // Then filter if needed
    const filtered =
      showSelectedOnly && selectedElementId && selectedElementId !== "0_0"
        ? uniqueMessages.filter(
            (message) => message.elementId === selectedElementId
          )
        : uniqueMessages;

    // Sort by severity (errors first, then warnings, then others)
    return [...filtered].sort((a, b) => {
      return getSeverityRank(a.type) - getSeverityRank(b.type);
    });
  }, [messages, selectedElementId, showSelectedOnly]);

  // Debug logging
  React.useEffect(() => {
    console.log("ValidationMessageList processing:", {
      originalCount: messages.length,
      afterDeduplication: processedMessages.length,
      selectedElementId,
    });
  }, [messages, processedMessages.length, selectedElementId]);

  return (
    <div className="space-y-2 p-4">
      {processedMessages.map((message) => (
        <ValidationMessageItem key={getMessageKey(message)} message={message} />
      ))}
      {processedMessages.length === 0 && (
        <div className="text-gray-500 text-sm py-2 text-center">
          No validation messages to display
        </div>
      )}
    </div>
  );
};

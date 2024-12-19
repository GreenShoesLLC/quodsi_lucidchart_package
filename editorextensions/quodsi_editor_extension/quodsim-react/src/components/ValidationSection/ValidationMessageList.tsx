import React from "react";
import { ValidationMessage } from "@quodsi/shared";
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
  // Severity ranking for sorting (lower number = higher priority)
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

  // Filter and sort messages
  const processedMessages = React.useMemo(() => {
    // First filter messages if needed
    const filtered =
      showSelectedOnly && selectedElementId && selectedElementId !== "0_0"
        ? messages.filter((message) => message.elementId === selectedElementId)
        : messages;

    // Then sort by severity
    return [...filtered].sort((a, b) => {
      const severityA = getSeverityRank(a.type);
      const severityB = getSeverityRank(b.type);
      return severityA - severityB;
    });
  }, [messages, selectedElementId, showSelectedOnly]);

  return (
    <div className="space-y-2 p-4">
      {processedMessages.map((message, index) => (
        <ValidationMessageItem
          key={`${message.elementId}-${index}`}
          message={message}
        />
      ))}
      {processedMessages.length === 0 && (
        <div className="text-gray-500 text-sm py-2 text-center">
          No validation messages to display
        </div>
      )}
    </div>
  );
};

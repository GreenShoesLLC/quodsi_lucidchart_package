import { ValidationMessage } from "@quodsi/shared";
import React from "react";

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
  console.group("ValidationMessageList Render");
  console.log({
    receivedMessages: messages,
    messageCount: messages?.length,
    messageTypes: messages?.map((m) => m.type),
    hasValidStructure: messages?.every(
      (m) => typeof m.type === "string" && typeof m.message === "string"
    ),
  });

  React.useEffect(() => {
    console.log("ValidationMessageList messages changed:", {
      newMessageCount: messages?.length,
      messageContent: messages?.map((m) => ({
        type: m.type,
        message: m.message.substring(0, 50) + "...", // Truncate long messages
      })),
    });
  }, [messages]);

  // Performance monitoring
  const renderStart = performance.now();
  React.useEffect(() => {
    const renderTime = performance.now() - renderStart;
    console.log(
      `ValidationMessageList render time: ${renderTime.toFixed(2)}ms`
    );
  });

  console.groupEnd();
  // Filter messages based on selectedElementId if showSelectedOnly is true
  const filteredMessages =
    showSelectedOnly && selectedElementId
      ? messages.filter((message) => message.elementId === selectedElementId)
      : messages;
  return (
    <div className="validation-message-list">
      {filteredMessages.map((message, index) => (
        <div
          key={`${message.type}-${index}`}
          className={`validation-message ${message.type}`}
        >
          {message.message}
        </div>
      ))}
    </div>
  );
};

import React, { useEffect } from "react";

import { ValidationMessageList } from "./ValidationMessageList";
import { ValidationState } from "@quodsi/shared";

interface ValidationMessagesProps {
  validationState: ValidationState | null;
  currentElementId: string | undefined;
  isExpanded: boolean;
  onToggle: () => void;
}

export const ValidationMessages: React.FC<ValidationMessagesProps> = ({
  validationState,
  currentElementId,
  isExpanded,
  onToggle,
}) => {
  // Log component render
  console.group("ValidationMessages Render");
  console.log("Props Received:", {
    validationState: validationState
      ? {
          messageCount: validationState.messages?.length,
          hasMessages: !!validationState.messages?.length,
          firstMessage: validationState.messages?.[0],
        }
      : "null",
    currentElementId: currentElementId || "undefined",
    isExpanded,
  });

  // Track prop changes
  useEffect(() => {
    console.log("ValidationState Changed:", {
      timestamp: new Date().toISOString(),
      hasValidationState: !!validationState,
      messageCount: validationState?.messages?.length,
    });
  }, [validationState]);

  useEffect(() => {
    console.log("CurrentElementId Changed:", {
      timestamp: new Date().toISOString(),
      oldId: currentElementId,
      isElementSelected: !!currentElementId,
    });
  }, [currentElementId]);

  useEffect(() => {
    console.log("Expanded State Changed:", {
      timestamp: new Date().toISOString(),
      isExpanded,
    });
  }, [isExpanded, validationState?.messages]);

  // Performance tracking
  const renderStartTime = performance.now();
  useEffect(() => {
    const renderTime = performance.now() - renderStartTime;
    console.log(`Render Performance: ${renderTime.toFixed(2)}ms`);
  });

  const messages = validationState?.messages || [];
  // Log render decision
  console.log("Render Decision:", {
    willRenderMessageList: isExpanded,
    hasMessages: messages.length > 0,
    currentElementId: currentElementId || "none",
  });

  // Track toggle interactions
  const handleToggle = () => {
    console.log("Toggle Clicked:", {
      timestamp: new Date().toISOString(),
      previousState: isExpanded,
      newState: !isExpanded,
      hasMessages: messages.length > 0,
    });
    onToggle();
  };

  const result = (
    <div className="validation-messages">
      <div className="validation-header" onClick={handleToggle}>
        <span>{isExpanded ? "▼" : "▶"} Validation</span>
      </div>
      {isExpanded && (
        <ValidationMessageList
          messages={messages}
          selectedElementId={currentElementId || null}
          showSelectedOnly={true}
        />
      )}
    </div>
  );

  // Log final render output structure
  console.log("Final Render Output:", {
    hasValidationHeader: true,
    isMessageListRendered: isExpanded,
    totalMessagesPassedToList: messages.length,
  });

  console.groupEnd();

  return result;
};

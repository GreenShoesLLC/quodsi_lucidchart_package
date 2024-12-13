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
  const filteredMessages =
    showSelectedOnly && selectedElementId
      ? messages.filter((msg) => msg.elementId === selectedElementId)
      : messages;

  return (
    <div className="h-48 overflow-y-auto border rounded-md p-4">
      {filteredMessages.length === 0 ? (
        <p className="text-gray-500 text-sm">No messages to display</p>
      ) : (
        <div className="space-y-2">
          {filteredMessages.map((message, index) => (
            <div
              key={index}
              className={`p-2 rounded border ${
                message.type === "error"
                  ? "bg-red-50 text-red-800 border-red-200"
                  : "bg-yellow-50 text-yellow-800 border-yellow-200"
              }`}
            >
              <div className="font-medium">{message.message}</div>
              <div className="text-sm opacity-80">
                Element: {message.elementId}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

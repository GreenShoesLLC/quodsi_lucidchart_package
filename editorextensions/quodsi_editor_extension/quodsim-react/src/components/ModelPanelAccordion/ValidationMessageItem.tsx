import React from "react";

interface ValidationMessageItemProps {
  message: {
    elementId?: string;
    elementName?: string;
    message: string;
    type?: "error" | "warning" | "info";
  };
}

const ValidationMessageItem: React.FC<ValidationMessageItemProps> = ({
  message,
}) => {
  return (
    <div className="flex flex-col border-b border-gray-200 last:border-b-0 py-1.5">
      <span className="text-sm text-red-600 font-medium mb-0.5">
        {message.elementName || "Unknown Element"}
      </span>
      <span className="text-xs text-gray-700">{message.message}</span>
    </div>
  );
};

export default ValidationMessageItem;

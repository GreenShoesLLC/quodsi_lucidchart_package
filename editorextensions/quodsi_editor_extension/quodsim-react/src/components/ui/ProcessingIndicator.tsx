import React from "react";

export interface ProcessingIndicatorProps {
  message?: string;
  fullScreen?: boolean;
}

export const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({ 
  message = "Processing...",
  fullScreen = false
}) => {
  if (fullScreen) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">{message}</p>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center p-2 bg-blue-50 rounded shadow-sm">
      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
      <span className="text-blue-700">{message}</span>
    </div>
  );
};

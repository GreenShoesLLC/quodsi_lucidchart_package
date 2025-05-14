import React from "react";

interface ValidationSummaryProps {
  errorCount: number;
  warningCount: number;
}

export const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  errorCount,
  warningCount,
}) => {
  if (errorCount === 0 && warningCount === 0) {
    return (
      <div className="p-4 bg-green-50 text-green-800 border border-green-200 rounded-md">
        <div className="flex items-center font-medium">
          No validation issues found
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {errorCount > 0 && (
        <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-md">
          <div className="flex items-center font-medium">
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            {errorCount} Error{errorCount !== 1 ? "s" : ""}
          </div>
        </div>
      )}
      {warningCount > 0 && (
        <div className="p-4 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-md">
          <div className="flex items-center font-medium">
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {warningCount} Warning{warningCount !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
};

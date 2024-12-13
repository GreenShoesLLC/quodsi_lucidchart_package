import React, { useState } from "react";
import { ValidationSummary } from "./ValidationSummary";
import { ValidationMessageList } from "./ValidationMessageList";
import { ValidationResult } from "@quodsi/shared";


interface ValidationSectionProps {
  validationResult: ValidationResult;
  selectedElementId: string | null;
}

export const ValidationSection: React.FC<ValidationSectionProps> = ({
  validationResult,
  selectedElementId,
}) => {
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border rounded-md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex justify-between items-center hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">Validation</span>
          {(validationResult.errorCount > 0 ||
            validationResult.warningCount > 0) && (
            <div className="flex gap-2 text-sm">
              {validationResult.errorCount > 0 && (
                <span className="text-red-500">
                  {validationResult.errorCount} ⚠️
                </span>
              )}
              {validationResult.warningCount > 0 && (
                <span className="text-yellow-500">
                  {validationResult.warningCount} ⚠️
                </span>
              )}
            </div>
          )}
        </div>
        <svg
          className={`w-4 h-4 transform transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4 border-t space-y-4">
          <ValidationSummary
            errorCount={validationResult.errorCount}
            warningCount={validationResult.warningCount}
          />

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              checked={showSelectedOnly}
              onChange={(e) => setShowSelectedOnly(e.target.checked)}
            />
            <span className="text-sm font-medium">
              Show selected element only
            </span>
          </label>

          <ValidationMessageList
            messages={validationResult.messages}
            selectedElementId={selectedElementId}
            showSelectedOnly={showSelectedOnly}
          />
        </div>
      )}
    </div>
  );
};

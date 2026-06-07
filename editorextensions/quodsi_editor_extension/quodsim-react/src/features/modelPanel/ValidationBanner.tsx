import React from 'react';
import { ValidationResult, ValidationIssue, ValidationSeverity } from '@quodsi/lucid-shared';
import { AlertTriangle, XCircle, Info, ChevronDown, ChevronUp, X } from 'lucide-react';

interface ValidationBannerProps {
  validationState: ValidationResult | null;
  isExpanded: boolean;
  onToggle: () => void;
  onDismiss?: () => void;
}

/**
 * Sticky validation banner that shows validation summary and expandable error list
 * Only visible when there are validation issues
 */
export const ValidationBanner: React.FC<ValidationBannerProps> = ({
  validationState,
  isExpanded,
  onToggle,
  onDismiss
}) => {
  // Don't show banner if no validation state or no issues
  if (!validationState || (validationState.summary.errorCount === 0 && validationState.summary.warningCount === 0)) {
    return null;
  }

  const { errorCount, warningCount } = validationState.summary;
  const totalIssues = errorCount + warningCount;

  // Helper to render validation issue
  const renderValidationIssue = (issue: ValidationIssue, index: number) => {
    const getIssueStyle = (severity: ValidationSeverity) => {
      switch (severity) {
        case ValidationSeverity.ERROR:
          return {
            container: 'bg-red-50 border-l-2 border-red-500 p-2 mb-1 rounded-r',
            icon: <XCircle className="h-3 w-3 text-red-500" />,
            text: 'text-red-700 font-medium',
          };
        case ValidationSeverity.WARNING:
          return {
            container: 'bg-blue-50 border-l-2 border-blue-400 p-2 mb-1 rounded-r',
            icon: <Info className="h-3 w-3 text-blue-500" />,
            text: 'text-blue-700 font-medium',
          };
        case ValidationSeverity.INFO:
        default:
          return {
            container: 'bg-blue-50 border-l-2 border-blue-500 p-2 mb-1 rounded-r',
            icon: <Info className="h-3 w-3 text-blue-500" />,
            text: 'text-blue-700 font-medium',
          };
      }
    };

    const style = getIssueStyle(issue.severity);

    return (
      <div key={`validation-${index}`} className={`${style.container} shadow-sm`}>
        <div className="flex">
          <div className="flex-shrink-0">{style.icon}</div>
          <div className="ml-2 flex-1">
            <p className={`text-xs ${style.text} leading-tight`}>{issue.message}</p>
            {issue.elementId && (
              <p className="text-xs text-gray-500 mt-0.5">Element: {issue.elementId}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Get summary text
  const getSummaryText = (): string => {
    const errorText = errorCount > 0 ? `${errorCount} error${errorCount !== 1 ? 's' : ''}` : '';
    // Use "suggestions" instead of "warnings" for a more positive tone
    const warningText = warningCount > 0 ? `${warningCount} suggestion${warningCount !== 1 ? 's' : ''}` : '';

    if (errorCount > 0 && warningCount > 0) {
      return `${errorText}, ${warningText}`;
    }

    return errorText || warningText;
  };

  // Determine banner color based on severity
  const getBannerColor = () => {
    if (errorCount > 0) {
      return 'bg-red-100 border-red-500';
    }
    // Use blue for informative/neutral tone (suggestions only)
    return 'bg-blue-50 border-blue-400';
  };

  return (
    <div className={`border-b-2 ${getBannerColor()} shadow-sm`}>
      {/* Collapsed summary bar */}
      <div
        className="flex items-center justify-between py-0.5 px-2 cursor-pointer hover:bg-opacity-80 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-1">
          {errorCount > 0 ? (
            <XCircle className="h-3 w-3 text-red-600" />
          ) : (
            <Info className="h-3 w-3 text-blue-600" />
          )}
          <span className="text-xs font-semibold text-gray-800">
            {getSummaryText()}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {isExpanded ? (
            <ChevronUp className="h-3 w-3 text-gray-600" />
          ) : (
            <ChevronDown className="h-3 w-3 text-gray-600" />
          )}
        </div>
      </div>

      {/* Expanded validation messages */}
      {isExpanded && (
        <div className="border-t border-gray-300 bg-white p-2 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700">
              Validation Issues ({totalIssues})
            </span>
          </div>
          <div className="space-y-1">
            {validationState.issues.map((issue, index) =>
              renderValidationIssue(issue, index)
            )}
          </div>
        </div>
      )}
    </div>
  );
};

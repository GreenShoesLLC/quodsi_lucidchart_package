import React from 'react';
import { ValidationResult, ValidationIssue, ValidationSeverity, isModelLevelIssue } from '@quodsi/lucid-shared';
import { AlertTriangle, XCircle, Info, CheckCircle, MapPin } from 'lucide-react';
import { useModelOpsSender } from '../../messaging/senders';

interface ValidationDashboardProps {
  validationState: ValidationResult | null;
  /** Called when the user clicks "Go to source" on a model-level issue.
   *  Typically switches ModelEditor to its Settings ("basic") tab. */
  onGoToModelSettings?: () => void;
}

/**
 * Validation dashboard shown in ModelEditor.
 * Shows errors and warnings in a simple list.  INFO-severity issues are
 * intentionally omitted (same policy as the shared ValidationPanel).
 *
 * "Go to source" behaviour:
 *  - Model-level issues (timing/run-length codes) → calls onGoToModelSettings
 *  - Shape-level issues (have an elementId) → calls locateElement to select the shape
 */
export const ValidationDashboard: React.FC<ValidationDashboardProps> = ({
  validationState,
  onGoToModelSettings,
}) => {
  const { locateElement } = useModelOpsSender();

  // If no validation state, show placeholder
  if (!validationState) {
    return (
      <div className="p-4">
        <div className="text-center py-8 bg-gray-50 rounded border border-gray-200">
          <Info className="h-8 w-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">No validation results available</p>
          <p className="text-xs text-gray-500 mt-1">Click "Validate Model" to check for issues</p>
        </div>
      </div>
    );
  }

  const errors = (validationState.issues ?? []).filter(
    i => i.severity === ValidationSeverity.ERROR
  );
  const warnings = (validationState.issues ?? []).filter(
    i => i.severity === ValidationSeverity.WARNING
  );

  const errorCount = errors.length;
  const warningCount = warnings.length;
  const totalIssues = errorCount + warningCount;

  // Render a single validation issue row
  const renderIssue = (issue: ValidationIssue, index: number) => {
    const isError = issue.severity === ValidationSeverity.ERROR;
    const containerCls = isError
      ? 'bg-red-50 border-l-4 border-red-500 p-3 mb-2 rounded-r shadow-sm'
      : 'bg-yellow-50 border-l-4 border-yellow-500 p-3 mb-2 rounded-r shadow-sm';
    const textCls = isError ? 'text-red-800 font-medium' : 'text-yellow-800 font-medium';
    const icon = isError
      ? <XCircle className="h-4 w-4 text-red-500" />
      : <AlertTriangle className="h-4 w-4 text-yellow-500" />;

    // Determine whether and how "Go to source" should work for this issue
    const hasGoToSource = isModelLevelIssue(issue) || Boolean(issue.elementId);
    const handleGoToSource = isModelLevelIssue(issue)
      ? () => onGoToModelSettings?.()
      : () => locateElement(issue.elementId!);

    return (
      <div key={`issue-${index}`} className={containerCls}>
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-0.5">{icon}</div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${textCls} leading-snug`}>{issue.message}</p>
            {hasGoToSource && (
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleGoToSource}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 cursor-pointer"
                  title={isModelLevelIssue(issue) ? "Open model settings" : "Select this shape on the canvas"}
                >
                  <MapPin className="h-3 w-3" />
                  Go to source
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Model is valid — no errors or warnings
  if (totalIssues === 0) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 py-3 px-4 bg-green-50 rounded border border-green-200">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <span className="text-sm font-medium text-green-800">Model is valid — ready to simulate</span>
        </div>
      </div>
    );
  }

  // Summary line
  const summaryParts: string[] = [];
  if (errorCount > 0) summaryParts.push(`${errorCount} error${errorCount !== 1 ? 's' : ''}`);
  if (warningCount > 0) summaryParts.push(`${warningCount} warning${warningCount !== 1 ? 's' : ''}`);
  const summaryText = summaryParts.join(', ');

  return (
    <div className="p-4">
      <p className="text-xs text-gray-600 mb-3">{summaryText}</p>

      {errors.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 pb-1 border-b border-red-200">
            <XCircle className="h-4 w-4 text-red-600" />
            <h3 className="text-sm font-semibold text-gray-800">
              Errors ({errorCount})
            </h3>
          </div>
          {errors.map((issue, i) => renderIssue(issue, i))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 pb-1 border-b border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <h3 className="text-sm font-semibold text-gray-800">
              Warnings ({warningCount})
            </h3>
          </div>
          {warnings.map((issue, i) => renderIssue(issue, errors.length + i))}
        </div>
      )}
    </div>
  );
};
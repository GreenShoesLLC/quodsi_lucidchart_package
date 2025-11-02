import { useMemo } from 'react';
import { useValidation } from '../MessageProvider';
import { useModelOpsSender } from '../senders/modelOpsSender';
import { ValidationSeverity } from '@quodsi/shared';

/**
 * Enhanced hook for validation state that combines state and actions
 *
 * @returns Validation state and validation-related actions
 */
export function useValidationState() {
  const validation = useValidation();
  const { validateModel } = useModelOpsSender();

  // Combine state and actions into a single object
  const validationState = useMemo(() => {
    // Get counts from summary (already computed in validationSlice)
    const { errorCount, warningCount, infoCount } = validation.summary;

    return {
      // State
      isValid: validation.isValid,
      issues: validation.issues || [],
      summary: validation.summary,
      lastUpdated: validation.lastUpdated,

      // Computed counts (from summary)
      errorCount,
      warningCount,
      infoCount,

      // Computed properties
      hasIssues: errorCount > 0 || warningCount > 0,
      hasErrors: errorCount > 0,
      hasWarnings: warningCount > 0,

      // Filtered issues by severity
      errors: validation.issues.filter(issue => issue.severity === ValidationSeverity.ERROR),
      warnings: validation.issues.filter(issue => issue.severity === ValidationSeverity.WARNING),
      infos: validation.issues.filter(issue => issue.severity === ValidationSeverity.INFO),

      // Issue utilities
      getIssuesForElement: (elementId: string) =>
        validation.issues.filter(issue => issue.elementId === elementId),

      // Actions
      validate: (documentId: string) => validateModel(documentId)
    };
  }, [
    validation.isValid,
    validation.issues,
    validation.summary,
    validation.lastUpdated,
    validateModel
  ]);

  return validationState;
}

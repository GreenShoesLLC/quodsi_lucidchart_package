import { useMemo } from 'react';
import { partitionValidationIssues } from '@quodsi/shared';
import { useValidation } from '../MessageProvider';
import { useModelOpsSender } from '../senders/modelOpsSender';

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

    // The one severity split every host uses (@quodsi/shared); this hook keeps
    // its errors/warnings/infos names.
    const { blockers, advisories, infos } = partitionValidationIssues(validation.issues);

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
      errors: blockers,
      warnings: advisories,
      infos,

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

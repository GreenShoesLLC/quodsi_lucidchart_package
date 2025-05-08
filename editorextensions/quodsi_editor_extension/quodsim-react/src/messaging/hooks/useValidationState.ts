import { useMemo } from 'react';
import { useValidation } from '../MessageProvider';
import { useModelOpsSender } from '../senders/modelOpsSender';
import { ValidationError } from '../state/validationSlice';

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
    // Calculate counts based on error types
    const errorCount = validation.errors.filter(e => e.severity === 'error').length;
    const warningCount = validation.errors.filter(e => e.severity === 'warning').length;
    const infoCount = validation.errors.filter(e => e.severity === 'info').length;
    
    return {
      // State
      isValid: validation.isValid,
      errors: validation.errors || [],
      lastUpdated: validation.lastUpdated,
      
      // Computed counts (derived from errors array)
      errorCount,
      warningCount,
      infoCount,
      
      // Computed properties
      hasIssues: errorCount > 0 || warningCount > 0,
      hasErrors: errorCount > 0,
      hasWarnings: warningCount > 0,
      
      // Filtered messages
      errorMessages: validation.errors.filter(msg => msg.severity === 'error'),
      warningMessages: validation.errors.filter(msg => msg.severity === 'warning'),
      infoMessages: validation.errors.filter(msg => msg.severity === 'info'),
      
      // Message utilities
      getMessagesForElement: (elementId: string) => 
        validation.errors.filter(msg => msg.elementId === elementId),
      
      // Actions
      validate: (documentId: string) => validateModel(documentId)
    };
  }, [
    validation.isValid,
    validation.errors,
    validation.lastUpdated,
    validateModel
  ]);
  
  return validationState;
}

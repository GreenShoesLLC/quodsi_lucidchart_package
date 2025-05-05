import { useMemo } from 'react';
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
  const validationState = useMemo(() => ({
    // State
    isValid: validation.isValid,
    errorCount: validation.errorCount,
    warningCount: validation.warningCount,
    infoCount: validation.infoCount,
    messages: validation.messages,
    lastValidated: validation.lastValidated,
    
    // Computed properties
    hasIssues: validation.errorCount > 0 || validation.warningCount > 0,
    hasErrors: validation.errorCount > 0,
    hasWarnings: validation.warningCount > 0,
    
    // Filtered messages
    errors: validation.messages.filter(msg => msg.type === 'error'),
    warnings: validation.messages.filter(msg => msg.type === 'warning'),
    infos: validation.messages.filter(msg => msg.type === 'info'),
    
    // Message utilities
    getMessagesForElement: (elementId: string) => 
      validation.messages.filter(msg => msg.elementId === elementId),
    
    // Actions
    validate: (documentId: string) => validateModel(documentId)
  }), [
    validation.isValid,
    validation.errorCount,
    validation.warningCount,
    validation.infoCount,
    validation.messages,
    validation.lastValidated,
    validateModel
  ]);
  
  return validationState;
}

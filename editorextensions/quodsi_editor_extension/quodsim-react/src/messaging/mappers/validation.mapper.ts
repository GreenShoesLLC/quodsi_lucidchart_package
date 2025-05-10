import { ValidationState } from "@quodsi/shared";

/**
 * Transforms validation data from the message format to the ValidationState format
 * expected by UI components
 * 
 * @param validationResult The validation data from the message
 * @returns ValidationState formatted object or null if no data
 */
export function transformToValidationState(validationResult: any): ValidationState | null {
  if (!validationResult) return null;
  
  return {
    messages: validationResult.messages || [],
    summary: {
      errorCount: validationResult.errorCount || 0,
      warningCount: validationResult.warningCount || 0
    }
  };
}

/**
 * Determines if the validation state is valid (no errors)
 * Helper function since isValid is not part of the ValidationState interface
 * 
 * @param validationState The validation state
 * @returns true if validation is valid (no errors)
 */
export function isValidationValid(validationState: ValidationState | null): boolean {
  if (!validationState) return true;
  return validationState.summary.errorCount === 0;
}

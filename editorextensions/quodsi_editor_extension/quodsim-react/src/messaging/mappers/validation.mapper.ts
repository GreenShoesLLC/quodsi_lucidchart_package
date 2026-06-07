import { ValidationResult } from "@quodsi/lucid-shared";

/**
 * Transforms validation data from the message format to the ValidationResult format
 * expected by UI components
 *
 * @param validationResult The validation data from the message
 * @returns ValidationResult formatted object or null if no data
 */
export function transformToValidationState(validationResult: any): ValidationResult | null {
  if (!validationResult) return null;

  return {
    isValid: validationResult.isValid ?? (validationResult.summary?.errorCount === 0),
    issues: validationResult.issues || [],
    summary: {
      errorCount: validationResult.summary?.errorCount || 0,
      warningCount: validationResult.summary?.warningCount || 0,
      infoCount: validationResult.summary?.infoCount || 0
    }
  };
}

/**
 * Determines if the validation result is valid (no errors)
 *
 * @param validationResult The validation result
 * @returns true if validation is valid (no errors)
 */
export function isValidationValid(validationResult: ValidationResult | null): boolean {
  if (!validationResult) return true;
  return validationResult.isValid;
}

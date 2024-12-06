/**
 * Allowed validation message types
 */
export type ValidationMessageType = 'error' | 'warning' | 'info';
/**
 * Validation message structure
 */
export interface ValidationMessage {
    type: ValidationMessageType;
    message: string;
    elementId?: string;
}
/**
 * Validation result structure
 */
export interface ValidationResult {
    isValid: boolean;
    messages: ValidationMessage[];
}

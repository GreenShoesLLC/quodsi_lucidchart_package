// types/ValidationTypes.ts

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
    code?: string;      // Added for message categorization
}

/**
 * Validation result structure
 */
export interface ValidationResult {
    isValid: boolean;
    errorCount: number;  // Added for quick access to error count
    warningCount: number; // Added for quick access to warning count
    messages: ValidationMessage[];
}
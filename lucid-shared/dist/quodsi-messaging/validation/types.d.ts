/**
 * Canonical validation types for the Quodsi validation system.
 *
 * These types are used across the entire application:
 * - Shared library validation services
 * - Extension-to-React messaging protocol
 * - React UI components and state
 *
 * All other validation type definitions should import from here.
 */
/**
 * Severity levels for validation issues.
 */
export declare enum ValidationSeverity {
    ERROR = "error",
    WARNING = "warning",
    INFO = "info"
}
/**
 * Represents a single validation issue found in the model.
 *
 * This is the canonical type used throughout the application.
 */
export interface ValidationIssue {
    /** Unique identifier for this validation issue */
    id: string;
    /** ID of the model element this issue relates to (if applicable) */
    elementId?: string;
    /** Severity level of the issue */
    severity: ValidationSeverity;
    /** Machine-readable code identifying the type of issue */
    code: string;
    /** Human-readable description of the issue */
    message: string;
    /** Additional context data for the issue (optional) */
    context?: Record<string, unknown>;
}
/**
 * Result of model validation containing all issues found.
 */
export interface ValidationResult {
    /** Whether the model passed validation (no errors) */
    isValid: boolean;
    /** List of all validation issues found */
    issues: ValidationIssue[];
    /** Summary counts of issues by severity */
    summary: {
        errorCount: number;
        warningCount: number;
        infoCount: number;
    };
}
//# sourceMappingURL=types.d.ts.map
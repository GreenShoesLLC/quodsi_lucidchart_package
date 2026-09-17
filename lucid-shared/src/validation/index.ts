// Validation lives in @quodsi/shared: the rules, ModelValidationService and
// the gate. The extension reaches it through these two names.
// ValidationIssue / ValidationSeverity / ValidationResult are re-exported once,
// through ../quodsi-messaging (its validation/types.ts).
export { ValidationMessages, evaluateValidationGate } from '@quodsi/shared';

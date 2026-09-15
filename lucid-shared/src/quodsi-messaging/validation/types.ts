/**
 * Validation types for the Lucid messaging protocol.
 *
 * The one declaration lives in @quodsi/shared (validation/types.ts). They are
 * re-exported here so every existing lucid-shared, extension and panel import
 * keeps its path, and so a Lucid ValidationResult IS the shared type: enums
 * are nominal, and a second declaration would not assign to the first
 * (spec 2026-09-15 §2).
 */
export { ValidationSeverity } from '@quodsi/shared';
export type { ValidationIssue, ValidationResult } from '@quodsi/shared';

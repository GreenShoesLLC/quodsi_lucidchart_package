// Re-export the 15 behavior-identical validation files from the core
// (Phase 3 Slice 5: these files were deleted from lucid; they are now sourced from @quodsi/shared)
export {
    ValidationMessages,
    ValidationRule,
    ActivityValidation,
    ConnectorValidation,
    ElementCountsValidation,
    EntityValidation,
    GeneratorPathValidation,
    GeneratorValidation,
    ResourceValidation,
    TimePatternValidation,
    TimeDistributedConfigValidation,
    canRateScale,
    validateRateMultiplier,
    validateChangeRequestValue,
    isIntegerInput,
    ValidationRuleName,
} from '@quodsi/shared';
export type {
    ModelDefinitionState,
    ChangeRequestValidationResult,
} from '@quodsi/shared';

// Service export (stays in lucid — extends QuodsiLogger, a Bucket-B dependency)
export { ModelValidationService } from './services/ModelValidationService';

// NOTE: ValidationIssue, ValidationSeverity, and ValidationResult are exported from
// '../quodsi-messaging' at the top level, not here, to avoid duplicate exports

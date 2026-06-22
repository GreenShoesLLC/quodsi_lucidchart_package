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
    ValidationRuleName,
} from '@quodsi/shared';
export type {
    ModelDefinitionState,
} from '@quodsi/shared';

// Service export (stays in lucid — extends QuodsiLogger, a Bucket-B dependency)
export { ModelValidationService } from './services/ModelValidationService';

// Gate helpers — re-exported from @quodsi/shared so extension code can import from @quodsi/lucid-shared
export { evaluateValidationGate, getIssueTitle, wrapProjectionAsModelDefinition } from '@quodsi/shared';
export type { ValidationGateResult, SourceResolver } from '@quodsi/shared';

// Model-level issue classifier — re-exported so quodsim-react can import from @quodsi/lucid-shared
export { isModelLevelIssue, MODEL_LEVEL_ISSUE_CODES } from '@quodsi/shared';

// NOTE: ValidationIssue, ValidationSeverity, and ValidationResult are exported from
// '../quodsi-messaging' at the top level, not here, to avoid duplicate exports
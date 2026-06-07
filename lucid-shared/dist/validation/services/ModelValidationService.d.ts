import { ModelDefinition } from "../../types/elements/ModelDefinition";
import { QuodsiLogger } from "../../core/logging/QuodsiLogger";
import { ValidationResult } from "../../quodsi-messaging/validation/types";
import { ValidationRuleName } from "../types/ValidationRuleName";
/**
 * Service for validating ModelDefinition objects against business rules.
 *
 * Coordinates multiple validation rules and aggregates results into a single
 * ValidationResult. Implements caching to avoid re-validating unchanged models.
 *
 * @example
 * ```typescript
 * const validator = new ModelValidationService();
 * validator.setLogging(true);
 * const result = validator.validate(modelDefinition);
 *
 * if (!result.isValid) {
 *   console.error('Validation failed:', result.messages);
 * }
 * ```
 */
export declare class ModelValidationService extends QuodsiLogger {
    protected readonly LOG_PREFIX = "[ModelValidation]";
    private rules;
    private cachedState;
    private lastModelDefinitionHash;
    constructor();
    /**
     * Validates a ModelDefinition and returns structured validation results.
     *
     * Uses caching based on model hash. If the model hasn't changed since the
     * last validation, returns cached results. Otherwise, runs all validation
     * rules and caches the new results.
     *
     * @param modelDefinition - The model to validate
     * @returns ValidationResult containing validation status, summary counts, and issues
     */
    validate(modelDefinition: ModelDefinition): ValidationResult;
    /**
     * Enables or disables logging for a specific validation rule.
     *
     * @param ruleName - Name of the validation rule class (use ValidationRuleName enum for type safety)
     * @param enabled - Whether to enable logging for this rule
     */
    setRuleLogging(ruleName: ValidationRuleName | string, enabled: boolean): void;
    /**
     * Generates a hash of the model to detect changes.
     *
     * Hash includes both element counts and content hash of key properties.
     * Used for cache invalidation.
     *
     * @param modelDefinition - The model to hash
     * @returns Hash string representing current model state
     */
    private generateModelHash;
    private hashModelContent;
    private simpleStringHash;
    private getModelState;
    private batchValidate;
    private calculateValidationMetrics;
    private logValidationResults;
    /**
     * Builds a map of activity relationships for validation rules.
     *
     * Creates a comprehensive view of how activities are connected and
     * which resources they use. Used by validation rules to check
     * connectivity and resource usage.
     *
     * @param modelDefinition - The model to analyze
     * @returns Map of activity IDs to their relationship data
     */
    private buildActivityRelationships;
}
//# sourceMappingURL=ModelValidationService.d.ts.map
import { ModelDefinition, QuodsiLogger, ValidationResult } from "@quodsi/shared";
export declare class ModelValidationService extends QuodsiLogger {
    protected readonly LOG_PREFIX = "[ModelValidation]";
    private rules;
    private cachedState;
    private lastModelDefinitionHash;
    constructor();
    validate(modelDefinition: ModelDefinition): ValidationResult;
    /**
     * Enable or disable logging for a specific validation rule by its class name.
     * @param ruleName - The class name of the validation rule.
     * @param enabled - True to enable logging, false to disable.
     */
    setRuleLogging(ruleName: string, enabled: boolean): void;
    private generateModelHash;
    private getModelState;
    private batchValidate;
    private calculateValidationMetrics;
    private logValidationResults;
    private buildActivityRelationships;
}
//# sourceMappingURL=ModelValidationService.d.ts.map
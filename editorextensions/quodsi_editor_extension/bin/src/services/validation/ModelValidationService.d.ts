import { ModelDefinition, ValidationResult } from "@quodsi/shared";
export declare class ModelValidationService {
    private rules;
    private cachedState;
    private lastModelDefinitionHash;
    constructor();
    validate(modelDefinition: ModelDefinition): ValidationResult;
    private generateModelHash;
    private getModelState;
    private batchValidate;
    private calculateValidationMetrics;
    private logValidationResults;
    private buildActivityRelationships;
}
//# sourceMappingURL=ModelValidationService.d.ts.map
import { ModelDefinition } from "../../shared/types/elements/ModelDefinition";
import { ValidationResult } from "../../shared/types/ValidationTypes";
/**
 * Main validation service
 */
export declare class ModelValidationService {
    private rules;
    constructor();
    validate(modelDefinition: ModelDefinition): ValidationResult;
    private buildActivityRelationships;
}

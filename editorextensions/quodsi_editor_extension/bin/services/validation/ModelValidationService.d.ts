import { ValidationResult } from "../../shared/types/ValidationTypes";
import { ModelState } from "./interfaces/ModelState";
/**
 * Main validation service
 */
export declare class ModelValidationService {
    private rules;
    constructor();
    validate(state: ModelState): ValidationResult;
}

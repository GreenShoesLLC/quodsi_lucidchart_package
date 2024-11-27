import { ValidationMessage } from "../../../shared/types/ValidationTypes";
import { ModelState } from "../interfaces/ModelState";
import { ValidationRule } from "./ValidationRule";
/**
 * Validates activity-specific rules
 */
export declare class ActivityValidation extends ValidationRule {
    validate(state: ModelState, messages: ValidationMessage[]): void;
    private validateActivityConnectivity;
    private validateActivityData;
    private validateBufferCapacities;
    private validateOperationSteps;
}

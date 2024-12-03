import { ValidationRule } from "./ValidationRule";
import { ValidationMessage } from "../../../shared/types/ValidationTypes";
import { ModelState } from "../interfaces/ModelState";
export declare class ActivityValidation extends ValidationRule {
    validate(state: ModelState, messages: ValidationMessage[]): void;
    private validateActivityConnectivity;
    private validateActivityData;
    private validateBufferCapacities;
    private validateOperationSteps;
}

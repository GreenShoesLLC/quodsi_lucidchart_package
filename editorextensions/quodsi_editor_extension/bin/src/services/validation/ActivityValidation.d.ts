import { ValidationRule } from "./ValidationRule";
import { ValidationMessage } from "@quodsi/shared";
import { ModelState } from "./ModelState";
export declare class ActivityValidation extends ValidationRule {
    validate(state: ModelState, messages: ValidationMessage[]): void;
    private validateActivityConnectivity;
    private validateActivityData;
    private validateBufferCapacities;
    private validateOperationSteps;
}
//# sourceMappingURL=ActivityValidation.d.ts.map
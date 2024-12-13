import { ValidationRule } from "./ValidationRule";
import { ValidationMessage } from "@quodsi/shared";
import { ModelDefinitionState } from "./ModelDefinitionState";
export declare class ActivityValidation extends ValidationRule {
    validate(state: ModelDefinitionState, messages: ValidationMessage[]): void;
    private validateActivityConnectivity;
    private validateActivityData;
    private validateBufferCapacities;
    private validateOperationSteps;
}
//# sourceMappingURL=ActivityValidation.d.ts.map
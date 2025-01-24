import { ValidationRule } from "./ValidationRule";
import { ValidationMessage } from "@quodsi/shared";
import { ModelDefinitionState } from "./ModelDefinitionState";
export declare class ActivityValidation extends ValidationRule {
    private static readonly MAX_BUFFER_SIZE;
    private static readonly MIN_CYCLE_TIME;
    private static readonly MAX_CYCLE_TIME;
    validate(state: ModelDefinitionState, messages: ValidationMessage[]): void;
    private validateActivityConnectivity;
    private validateActivityData;
    private validateBufferCapacities;
    private validateOperationSteps;
    private validateOperationStep;
    private validateResourceRequirement;
    private validateOperationSequence;
    private validateBufferConstraints;
    private validateActivityInteractions;
    private detectCycles;
}
//# sourceMappingURL=ActivityValidation.d.ts.map
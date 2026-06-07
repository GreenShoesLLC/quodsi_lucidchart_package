import { ValidationRule } from "../common/ValidationRule";
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ValidationIssue } from "../../quodsi-messaging/validation/types";
export declare class ActivityValidation extends ValidationRule {
    private static readonly MAX_QUEUE_SIZE;
    private static readonly MIN_CYCLE_TIME;
    private static readonly MAX_CYCLE_TIME;
    validate(state: ModelDefinitionState, issues: ValidationIssue[]): void;
    private validateActivityConnectivity;
    private validateActivityData;
    private validateQueueCapacities;
    private validateActions;
    private validateAction;
    private validateActivityInteractions;
    private detectCycles;
}
//# sourceMappingURL=ActivityValidation.d.ts.map
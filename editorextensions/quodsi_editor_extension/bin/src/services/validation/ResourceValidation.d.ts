import { ValidationRule } from "./ValidationRule";
import { ValidationMessage } from "@quodsi/shared";
import { ModelDefinitionState } from "./ModelDefinitionState";
export declare class ResourceValidation extends ValidationRule {
    validate(state: ModelDefinitionState, messages: ValidationMessage[]): void;
    private validateResourceData;
    private validateResourceUsage;
    private processResourceRequirement;
    private addResourceUsage;
    private processResourceRequests;
    private checkResourceConflicts;
    private validateConcurrentResourceUsage;
    private calculateMaxResourceDemand;
}
//# sourceMappingURL=ResourceValidation.d.ts.map
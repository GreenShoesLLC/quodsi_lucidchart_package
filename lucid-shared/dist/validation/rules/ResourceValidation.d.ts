import { ValidationRule } from "../common/ValidationRule";
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ValidationIssue } from "../../quodsi-messaging/validation/types";
export declare class ResourceValidation extends ValidationRule {
    validate(state: ModelDefinitionState, issues: ValidationIssue[]): void;
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
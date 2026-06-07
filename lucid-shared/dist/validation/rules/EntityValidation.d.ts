import { ValidationRule } from "../common/ValidationRule";
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ValidationIssue } from "../../quodsi-messaging/validation/types";
export declare class EntityValidation extends ValidationRule {
    validate(state: ModelDefinitionState, issues: ValidationIssue[]): void;
    private validateEntityData;
    private validateEntityUsage;
}
//# sourceMappingURL=EntityValidation.d.ts.map
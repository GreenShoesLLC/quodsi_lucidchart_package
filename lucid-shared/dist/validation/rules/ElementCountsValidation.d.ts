import { ValidationIssue } from "../../quodsi-messaging/validation/types";
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ValidationRule } from "../common/ValidationRule";
/**
 * Validates basic element counts and requirements.
 */
export declare class ElementCountsValidation extends ValidationRule {
    validate(state: ModelDefinitionState, issues: ValidationIssue[]): void;
}
//# sourceMappingURL=ElementCountsValidation.d.ts.map
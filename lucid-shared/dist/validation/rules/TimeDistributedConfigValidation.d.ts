import { ValidationRule } from '../common/ValidationRule';
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ValidationIssue } from "../../quodsi-messaging/validation/types";
export declare class TimeDistributedConfigValidation extends ValidationRule {
    validate(state: ModelDefinitionState, issues: ValidationIssue[]): void;
    private validateTimeDistributedConfigData;
    private isValidISODate;
}
//# sourceMappingURL=TimeDistributedConfigValidation.d.ts.map
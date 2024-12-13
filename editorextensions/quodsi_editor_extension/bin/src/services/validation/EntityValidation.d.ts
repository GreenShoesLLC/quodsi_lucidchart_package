import { ValidationRule } from "./ValidationRule";
import { ValidationMessage } from "@quodsi/shared";
import { ModelDefinitionState } from "./ModelDefinitionState";
export declare class EntityValidation extends ValidationRule {
    validate(state: ModelDefinitionState, messages: ValidationMessage[]): void;
    private validateEntityData;
    private validateEntityUsage;
}
//# sourceMappingURL=EntityValidation.d.ts.map
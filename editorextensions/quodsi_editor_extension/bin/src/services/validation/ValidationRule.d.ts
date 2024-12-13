import { ValidationMessage } from "@quodsi/shared";
import { ModelDefinitionState } from "./ModelDefinitionState";
/**
 * Base class for validation rules
 */
export declare abstract class ValidationRule {
    abstract validate(state: ModelDefinitionState, messages: ValidationMessage[]): void;
}
//# sourceMappingURL=ValidationRule.d.ts.map
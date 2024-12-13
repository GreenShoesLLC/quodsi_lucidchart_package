import { ValidationMessage } from "@quodsi/shared";
import { ModelDefinitionState } from "./ModelDefinitionState";

/**
 * Base class for validation rules
 */
export abstract class ValidationRule {
    abstract validate(state: ModelDefinitionState, messages: ValidationMessage[]): void;
}
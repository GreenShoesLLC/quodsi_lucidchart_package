import { ValidationMessage } from "@quodsi/shared";
import { ModelState } from "./ModelState";
/**
 * Base class for validation rules
 */
export declare abstract class ValidationRule {
    abstract validate(state: ModelState, messages: ValidationMessage[]): void;
}

import { ValidationMessage } from "../../../shared/types/ValidationTypes";
import { ModelState } from "../interfaces/ModelState";
/**
 * Base class for validation rules
 */
export declare abstract class ValidationRule {
    abstract validate(state: ModelState, messages: ValidationMessage[]): void;
}

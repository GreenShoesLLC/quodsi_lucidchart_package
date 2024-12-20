import { ValidationMessage } from "@quodsi/shared";
import { ModelState } from "./ModelState";
import { ValidationRule } from "./ValidationRule";
/**
 * Validates basic element counts and requirements
 */
export declare class ElementCountsValidation extends ValidationRule {
    validate(state: ModelState, messages: ValidationMessage[]): void;
}

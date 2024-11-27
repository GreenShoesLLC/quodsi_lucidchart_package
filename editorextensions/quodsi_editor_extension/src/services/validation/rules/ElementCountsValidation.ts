import { ValidationMessage } from "../../../shared/types/ValidationTypes";
import { ModelState } from "../interfaces/ModelState";
import { ValidationRule } from "./ValidationRule";

/**
 * Validates basic element counts and requirements
 */
export class ElementCountsValidation extends ValidationRule {
    validate(state: ModelState, messages: ValidationMessage[]): void {
        if (state.relationships.generators.size === 0) {
            messages.push({
                type: 'error',
                message: 'Model must have at least one generator'
            });
        }

        if (state.relationships.activities.size === 0) {
            messages.push({
                type: 'error',
                message: 'Model must have at least one activity'
            });
        }

        if (state.relationships.resources.size === 0) {
            messages.push({
                type: 'warning',
                message: 'Model has no resources defined'
            });
        }
    }
}
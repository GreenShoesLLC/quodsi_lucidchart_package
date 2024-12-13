import { ValidationMessage } from "@quodsi/shared";
import { ModelDefinitionState } from "./ModelDefinitionState";
import { ValidationRule } from "./ValidationRule";

/**
 * Validates basic element counts and requirements
 */
export class ElementCountsValidation extends ValidationRule {
    validate(state: ModelDefinitionState, messages: ValidationMessage[]): void {
        const { modelDefinition } = state;

        if (modelDefinition.generators.size() === 0) {
            messages.push({
                type: 'error',
                message: 'Model must have at least one generator'
            });
        }

        if (modelDefinition.activities.size() === 0) {
            messages.push({
                type: 'error',
                message: 'Model must have at least one activity'
            });
        }

        if (modelDefinition.resources.size() === 0) {
            messages.push({
                type: 'warning',
                message: 'Model has no resources defined'
            });
        }
    }
}
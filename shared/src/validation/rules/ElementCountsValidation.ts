
import { ValidationMessage } from "../../types/validation";
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ValidationRule } from "../common/ValidationRule";

/**
 * Validates basic element counts and requirements.
 */
export class ElementCountsValidation extends ValidationRule {
    validate(state: ModelDefinitionState, messages: ValidationMessage[]): void {
        const { modelDefinition } = state;

        this.log("Starting validation of element counts.");

        if (modelDefinition.generators.size() === 0) {
            this.log("Validation failed: Model has no generators.");
            messages.push({
                type: 'error',
                message: 'Model must have at least one generator'
            });
        }

        if (modelDefinition.activities.size() === 0) {
            this.log("Validation failed: Model has no activities.");
            messages.push({
                type: 'error',
                message: 'Model must have at least one activity'
            });
        }

        // if (modelDefinition.resources.size() === 0) {
        //     this.log("Validation warning: Model has no resources defined.");
        //     messages.push({
        //         type: 'warning',
        //         message: 'Model has no resources defined'
        //     });
        // }

        if (modelDefinition.entities.size() === 0) {
            this.log("Validation failed: Model has no entities.");
            messages.push({
                type: 'error',
                message: 'Model must have at least one entity'
            });
        }

        this.log("Completed validation of element counts.");
    }
}

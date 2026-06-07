
import { ValidationIssue } from "../../quodsi-messaging/validation/types";
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ValidationRule } from "../common/ValidationRule";
import { ValidationMessages } from "../common/ValidationMessages";

/**
 * Validates basic element counts and requirements.
 */
export class ElementCountsValidation extends ValidationRule {
    validate(state: ModelDefinitionState, issues: ValidationIssue[]): void {
        const { modelDefinition } = state;

        this.log("Starting validation of element counts.");

        if (modelDefinition.generators.size() === 0) {
            this.log("Validation failed: Model has no generators.");
            issues.push(ValidationMessages.missingRequiredElement('generator'));
        }

        if (modelDefinition.activities.size() === 0) {
            this.log("Validation failed: Model has no activities.");
            issues.push(ValidationMessages.missingRequiredElement('activity'));
        }

        // if (modelDefinition.resources.size() === 0) {
        //     this.log("Validation warning: Model has no resources defined.");
        //     issues.push({
        //         type: 'warning',
        //         message: 'Model has no resources defined'
        //     });
        // }

        if (modelDefinition.entities.size() === 0) {
            this.log("Validation failed: Model has no entities.");
            issues.push(ValidationMessages.missingRequiredElement('entity'));
        }

        this.log("Completed validation of element counts.");
    }
}

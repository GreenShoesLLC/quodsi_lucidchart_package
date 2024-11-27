import { ValidationMessage, ValidationResult } from "../../shared/types/ValidationTypes";
import { ModelState } from "./interfaces/ModelState";
import { ActivityValidation } from "./rules/ActivityValidation";
import { ConnectorValidation } from "./rules/ConnectorValidation";
import { ElementCountsValidation } from "./rules/ElementCountsValidation";
import { GeneratorValidation } from "./rules/GeneratorValidation";
import { ResourceValidation } from "./rules/ResourceValidation";
import { ValidationRule } from "./rules/ValidationRule";

/**
 * Main validation service
 */
export class ModelValidationService {
    private rules: ValidationRule[];

    constructor() {
        this.rules = [
            new ElementCountsValidation(),
            new ActivityValidation(),
            new ConnectorValidation(),
            new GeneratorValidation(),
            new ResourceValidation()
        ];
    }

    public validate(state: ModelState): ValidationResult {
        const messages: ValidationMessage[] = [];

        try {
            // Apply all validation rules
            for (const rule of this.rules) {
                rule.validate(state, messages);
            }

            const isValid = !messages.some(m => m.type === 'error');
            return { isValid, messages };

        } catch (error) {
            console.error('[ModelValidation] Validation error:', error);
            messages.push({
                type: 'error',
                message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
            return { isValid: false, messages };
        }
    }
}
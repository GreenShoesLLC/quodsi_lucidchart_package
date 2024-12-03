import { ActivityRelationships } from "../../shared/types/ActivityRelationships";
import { ModelDefinition } from "../../shared/types/elements/ModelDefinition";
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

    public validate(modelDefinition: ModelDefinition): ValidationResult {
        const messages: ValidationMessage[] = [];

        try {
            // Create ModelState from ModelDefinition
            const state: ModelState = {
                modelDefinition,
                connections: new Map(modelDefinition.connectors.getAll().map(c => [c.id, c])),
                activityRelationships: this.buildActivityRelationships(modelDefinition)
            };

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

    private buildActivityRelationships(modelDefinition: ModelDefinition): Map<string, ActivityRelationships> {
        const relationships = new Map<string, ActivityRelationships>();
        const activities = modelDefinition.activities.getAll();
        const connectors = modelDefinition.connectors.getAll();

        // Initialize relationships for all activities
        activities.forEach(activity => {
            relationships.set(activity.id, {
                incomingConnectors: new Set<string>(),
                outgoingConnectors: new Set<string>(),
                assignedResources: new Set<string>()
            });
        });

        // Process connectors
        connectors.forEach(connector => {
            const sourceRel = relationships.get(connector.sourceId);
            const targetRel = relationships.get(connector.targetId);

            if (sourceRel) {
                sourceRel.outgoingConnectors.add(connector.id);
            }
            if (targetRel) {
                targetRel.incomingConnectors.add(connector.id);
            }
        });

        // Process resource assignments from activity operation steps
        activities.forEach(activity => {
            const activityRel = relationships.get(activity.id);
            if (activityRel && activity.operationSteps) {
                activity.operationSteps.forEach(step => {
                    if (step.resourceSetRequest?.requests) {
                        step.resourceSetRequest.requests.forEach(request => {
                            if ('resource' in request && request.resource) {
                                activityRel.assignedResources.add(request.resource.id);
                            }
                        });
                    }
                });
            }
        });

        return relationships;
    }
}

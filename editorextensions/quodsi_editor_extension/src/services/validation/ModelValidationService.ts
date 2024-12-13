import {
    ActivityRelationships,
    ModelDefinition,
    ValidationMessage,
    ValidationResult
} from "@quodsi/shared";
import { ModelDefinitionState } from "./ModelDefinitionState";
import { ActivityValidation } from "./ActivityValidation";
import { ConnectorValidation } from "./ConnectorValidation";
import { ElementCountsValidation } from "./ElementCountsValidation";
import { GeneratorValidation } from "./GeneratorValidation";
import { ResourceValidation } from "./ResourceValidation";
import { ValidationRule } from "./ValidationRule";

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
            const state: ModelDefinitionState = {
                modelDefinition,
                connections: new Map(modelDefinition.connectors.getAll().map(c => [c.id, c])),
                activityRelationships: this.buildActivityRelationships(modelDefinition)
            };

            // Apply all validation rules
            for (const rule of this.rules) {
                rule.validate(state, messages);
            }
            if (messages.length === 0) {
                messages.push({
                    type: 'info',
                    message: 'Model validation passed successfully'
                });
            }
            // Count errors and warnings
            const errorCount = messages.filter(m => m.type === 'error').length;
            const warningCount = messages.filter(m => m.type === 'warning').length;
            console.log('[ModelValidation] Validation results:', {
                isValid: errorCount === 0,
                errorCount,
                warningCount,
                messageCount: messages.length,
                messages: messages
            });
            return {
                isValid: errorCount === 0,
                errorCount,
                warningCount,
                messages
            };

        } catch (error) {
            console.error('[ModelValidation] Validation error:', error);
            messages.push({
                type: 'error',
                message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
            return {
                isValid: false,
                errorCount: 1,
                warningCount: 0,
                messages
            };
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
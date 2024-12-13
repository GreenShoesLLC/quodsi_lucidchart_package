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
import { ValidationMessages } from "./ValidationMessages";
import { EntityValidation } from "./EntityValidation";

export class ModelValidationService {
    private rules: ValidationRule[];
    private cachedState: ModelDefinitionState | null = null;
    private lastModelDefinitionHash: string | null = null;

    constructor() {
        this.rules = [
            new ElementCountsValidation(),
            new ActivityValidation(),
            new ConnectorValidation(),
            new GeneratorValidation(),
            new ResourceValidation(),
            new EntityValidation()
        ];
    }

    public validate(modelDefinition: ModelDefinition): ValidationResult {
        const messages: ValidationMessage[] = [];

        try {
            // Generate a hash of the model definition for cache comparison
            const currentHash = this.generateModelHash(modelDefinition);

            // Create or retrieve cached ModelState
            const state = this.getModelState(modelDefinition, currentHash);

            // Batch validate all rules
            this.batchValidate(state, messages);

            // Add success message if no issues found
            if (messages.length === 0) {
                messages.push(ValidationMessages.validationSuccess());
            }

            // Calculate validation metrics
            const result = this.calculateValidationMetrics(messages);

            // Log validation results
            this.logValidationResults(result);

            return result;

        } catch (error) {
            console.error('[ModelValidation] Validation error:', error);
            return {
                isValid: false,
                errorCount: 1,
                warningCount: 0,
                messages: [ValidationMessages.validationError(error)]
            };
        }
    }

    private generateModelHash(modelDefinition: ModelDefinition): string {
        // Create a simple hash based on model contents
        const activities = modelDefinition.activities.size();
        const connectors = modelDefinition.connectors.size();
        const resources = modelDefinition.resources.size();
        const generators = modelDefinition.generators.size();

        return `${activities}-${connectors}-${resources}-${generators}`;
    }

    private getModelState(modelDefinition: ModelDefinition, currentHash: string): ModelDefinitionState {
        // Reuse cached state if model hasn't changed
        if (this.cachedState && this.lastModelDefinitionHash === currentHash) {
            return this.cachedState;
        }

        // Create new state
        const state: ModelDefinitionState = {
            modelDefinition,
            connections: new Map(modelDefinition.connectors.getAll().map(c => [c.id, c])),
            activityRelationships: this.buildActivityRelationships(modelDefinition)
        };

        // Cache the new state
        this.cachedState = state;
        this.lastModelDefinitionHash = currentHash;

        return state;
    }

    private batchValidate(state: ModelDefinitionState, messages: ValidationMessage[]): void {
        // Run all validation rules in parallel if possible
        const validationPromises = this.rules.map(rule => {
            return new Promise<void>((resolve) => {
                rule.validate(state, messages);
                resolve();
            });
        });

        // Wait for all validations to complete
        Promise.all(validationPromises);
    }

    private calculateValidationMetrics(messages: ValidationMessage[]): ValidationResult {
        const errorCount = messages.filter(m => m.type === 'error').length;
        const warningCount = messages.filter(m => m.type === 'warning').length;

        return {
            isValid: errorCount === 0,
            errorCount,
            warningCount,
            messages
        };
    }

    private logValidationResults(result: ValidationResult): void {
        console.log('[ModelValidation] Validation results:', {
            isValid: result.isValid,
            errorCount: result.errorCount,
            warningCount: result.warningCount,
            messageCount: result.messages.length,
            messages: result.messages
        });
    }

    private buildActivityRelationships(modelDefinition: ModelDefinition): Map<string, ActivityRelationships> {
        const relationships = new Map<string, ActivityRelationships>();

        // Initialize relationships map for better performance
        const activities = modelDefinition.activities.getAll();
        const connectors = modelDefinition.connectors.getAll();

        // Pre-allocate relationships for all activities
        activities.forEach(activity => {
            relationships.set(activity.id, {
                incomingConnectors: new Set<string>(),
                outgoingConnectors: new Set<string>(),
                assignedResources: new Set<string>()
            });
        });

        // Process connectors in batch
        connectors.forEach(connector => {
            const sourceRel = relationships.get(connector.sourceId);
            const targetRel = relationships.get(connector.targetId);

            if (sourceRel) sourceRel.outgoingConnectors.add(connector.id);
            if (targetRel) targetRel.incomingConnectors.add(connector.id);
        });

        // Process resource assignments efficiently
        activities.forEach(activity => {
            const activityRel = relationships.get(activity.id);
            if (!activityRel || !activity.operationSteps) return;

            // Process resource requests using reduce instead of flatMap
            const resourceRequests = activity.operationSteps.reduce((requests: any[], step) => {
                if (step.resourceSetRequest?.requests) {
                    requests.push(...step.resourceSetRequest.requests);
                }
                return requests;
            }, []);

            // Batch process resource assignments
            resourceRequests.forEach(request => {
                if ('resource' in request && request.resource) {
                    activityRel.assignedResources.add(request.resource.id);
                }
            });
        });

        return relationships;
    }
}
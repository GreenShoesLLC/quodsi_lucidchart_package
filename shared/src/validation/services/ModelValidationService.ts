// import {
//     ActivityRelationships,
//     ModelDefinition,
//     ModelDefinitionLogger,
//     QuodsiLogger,
//     ValidationMessage,
//     ValidationResult
// } from "@quodsi/shared";
import { ActivityRelationships } from "../../types/ActivityRelationships";
import { ModelDefinition } from "../../types/elements/ModelDefinition";
import { ModelDefinitionLogger } from "../../types/elements/ModelDefinitionLogger";
import { QuodsiLogger } from "../../core/logging/QuodsiLogger";
import { ValidationMessage } from "../../types/validation"
import { ValidationMessages } from "../common/ValidationMessages";
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ActivityValidation } from "../rules/ActivityValidation";
import { ConnectorValidation } from "../rules/ConnectorValidation";
import { ElementCountsValidation } from "../rules/ElementCountsValidation";
import { GeneratorValidation } from "../rules/GeneratorValidation";
import { ResourceValidation } from "../rules/ResourceValidation";
import { ValidationRule } from "../common/ValidationRule";
import { EntityValidation } from "../rules/EntityValidation";
import { ValidationResult } from "../../types/validation";

export class ModelValidationService extends QuodsiLogger {
    protected readonly LOG_PREFIX = "[ModelValidation]";
    private rules: ValidationRule[];
    private cachedState: ModelDefinitionState | null = null;
    private lastModelDefinitionHash: string | null = null;

    constructor() {
        super();
        this.rules = [
            new ElementCountsValidation(),
            new ActivityValidation(),
            new ConnectorValidation(),
            new GeneratorValidation(),
            new ResourceValidation(),
            new EntityValidation()
        ];
        this.setLogging(false);
    }

    public validate(modelDefinition: ModelDefinition): ValidationResult {
        const messages: ValidationMessage[] = [];
        // ModelDefinitionLogger.log(modelDefinition)
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
            this.logError('[ModelValidation] Validation error:', error);
            return {
                isValid: false,
                errorCount: 1,
                warningCount: 0,
                messages: [ValidationMessages.validationError(error)]
            };
        }
    }
    /**
     * Enable or disable logging for a specific validation rule by its class name.
     * @param ruleName - The class name of the validation rule.
     * @param enabled - True to enable logging, false to disable.
     */
    public setRuleLogging(ruleName: string, enabled: boolean): void {
        const rule = this.rules.find(r => r.constructor.name === ruleName);
        if (rule) {
            rule.setLogging(enabled);
            this.log(`Logging for ${ruleName} set to ${enabled}`);
        } else {
            console.warn(`[ModelValidationService] Validation rule ${ruleName} not found.`);
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
            this.log(`Model Definition hasn't changed, reusing cached validation}`);
            return this.cachedState;
        }
        this.log(`Model Definition has change`);
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
        this.log("[ModelValidation] Starting batch validation.");

        // ModelDefinitionLogger.logModelDefinition(state.modelDefinition)

        // Validate all rules
        const validationPromises = this.rules.map(rule => {
            return new Promise<void>((resolve) => {
                rule.validate(state, messages);
                resolve();
            });
        });

        // Wait for all validations to complete
        Promise.all(validationPromises).then(() => {
            this.log("[ModelValidation] Batch validation completed.");
        });
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
        this.log('[ModelValidation] Validation results:', {
            isValid: result.isValid,
            errorCount: result.errorCount,
            warningCount: result.warningCount,
            messageCount: result.messages.length,
            messages: result.messages
        });
    }

    private buildActivityRelationships(
        modelDefinition: ModelDefinition
    ): Map<string, ActivityRelationships> {
        const relationships = new Map<string, ActivityRelationships>();

        // Get resources and their requirements for lookup
        const resourceRequirements = modelDefinition.resourceRequirements?.getAll() || [];
        const requirementMap = new Map(
            resourceRequirements.map(req => [req.id, req])
        );

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

            // Process resource requirements for each operation step
            activity.operationSteps.forEach(step => {
                if (step.requirementId) {
                    const requirement = requirementMap.get(step.requirementId);
                    if (requirement) {
                        requirement.rootClauses.forEach(clause => {
                            clause.requests.forEach(request => {
                                activityRel.assignedResources.add(request.resourceId);
                            });
                        })
                    }
                }
            });
        });

        return relationships;
    }
}
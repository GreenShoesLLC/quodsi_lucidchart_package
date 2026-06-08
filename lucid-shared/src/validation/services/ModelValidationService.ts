import { ActivityRelationships } from "../../types/ActivityRelationships";
import { ModelDefinition } from '@quodsi/shared';
import { QuodsiLogger } from "../../core/logging/QuodsiLogger";
import { ValidationIssue, ValidationResult, ValidationSeverity } from "../../quodsi-messaging/validation/types";
import {
    ValidationMessages,
    ModelDefinitionState,
    ActivityValidation,
    ConnectorValidation,
    ElementCountsValidation,
    GeneratorValidation,
    GeneratorPathValidation,
    ResourceValidation,
    ValidationRule,
    EntityValidation,
    ValidationRuleName,
} from "@quodsi/shared";
import { ActionType } from '@quodsi/shared';
import { SeizeAction, ReleaseAction, DelayWithResourceAction } from '@quodsi/shared';

/**
 * Service for validating ModelDefinition objects against business rules.
 *
 * Coordinates multiple validation rules and aggregates results into a single
 * ValidationResult. Implements caching to avoid re-validating unchanged models.
 *
 * @example
 * ```typescript
 * const validator = new ModelValidationService();
 * validator.setLogging(true);
 * const result = validator.validate(modelDefinition);
 *
 * if (!result.isValid) {
 *   console.error('Validation failed:', result.messages);
 * }
 * ```
 */
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
            new GeneratorPathValidation(),
            new ResourceValidation(),
            new EntityValidation()
        ];
        this.setLogging(false);
    }

    /**
     * Validates a ModelDefinition and returns structured validation results.
     *
     * Uses caching based on model hash. If the model hasn't changed since the
     * last validation, returns cached results. Otherwise, runs all validation
     * rules and caches the new results.
     *
     * @param modelDefinition - The model to validate
     * @returns ValidationResult containing validation status, summary counts, and issues
     */
    public validate(modelDefinition: ModelDefinition): ValidationResult {
        const issues: ValidationIssue[] = [];
        try {
            // Generate a hash of the model definition for cache comparison
            const currentHash = this.generateModelHash(modelDefinition);

            // Create or retrieve cached ModelState
            const state = this.getModelState(modelDefinition, currentHash);

            // Batch validate all rules
            this.batchValidate(state, issues);

            // Add success message if no issues found
            if (issues.length === 0) {
                issues.push(ValidationMessages.validationSuccess());
            }

            // Calculate validation metrics
            const result = this.calculateValidationMetrics(issues);

            // Log validation results
            this.logValidationResults(result);

            return result;

        } catch (error) {
            // Always log critical validation errors, regardless of logging settings
            console.error(`${this.LOG_PREFIX} Critical validation error:`, error);
            return {
                isValid: false,
                issues: [ValidationMessages.validationError(error)],
                summary: {
                    errorCount: 1,
                    warningCount: 0,
                    infoCount: 0
                }
            };
        }
    }
    /**
     * Enables or disables logging for a specific validation rule.
     *
     * @param ruleName - Name of the validation rule class (use ValidationRuleName enum for type safety)
     * @param enabled - Whether to enable logging for this rule
     */
    public setRuleLogging(ruleName: ValidationRuleName | string, enabled: boolean): void {
        const rule = this.rules.find(r => r.constructor.name === ruleName);
        if (rule) {
            rule.setLogging(enabled);
            this.log(`Logging for ${ruleName} set to ${enabled}`);
        } else {
            this.logWarning(`Validation rule ${ruleName} not found.`);
        }
    }

    /**
     * Generates a hash of the model to detect changes.
     *
     * Hash includes both element counts and content hash of key properties.
     * Used for cache invalidation.
     *
     * @param modelDefinition - The model to hash
     * @returns Hash string representing current model state
     */
    private generateModelHash(modelDefinition: ModelDefinition): string {
        // Include element counts and content hash
        const counts = [
            modelDefinition.activities.size(),
            modelDefinition.connectors.size(),
            modelDefinition.resources.size(),
            modelDefinition.generators.size(),
            modelDefinition.entities.size()
        ].join('-');

        const contentHash = this.hashModelContent(modelDefinition);
        return `${counts}:${contentHash}`;
    }

    private hashModelContent(modelDefinition: ModelDefinition): string {
        // Hash key properties of elements
        const activities = modelDefinition.activities.getAll()
            .map(a => `${a.id}:${a.name}:${a.capacity}`)
            .sort()
            .join('|');

        const connectors = modelDefinition.connectors.getAll()
            .map(c => `${c.id}:${c.sourceId}:${c.targetId}:${c.weight}`)
            .sort()
            .join('|');

        const resources = modelDefinition.resources.getAll()
            .map(r => `${r.id}:${r.name}:${r.capacity}`)
            .sort()
            .join('|');

        const combined = `${activities}||${connectors}||${resources}`;
        return this.simpleStringHash(combined);
    }

    private simpleStringHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    private getModelState(modelDefinition: ModelDefinition, currentHash: string): ModelDefinitionState {
        // Reuse cached state if model hasn't changed
        if (this.cachedState && this.lastModelDefinitionHash === currentHash) {
            this.log(`Model Definition hasn't changed, reusing cached validation`);
            return this.cachedState;
        }
        this.log(`Model Definition has changed`);
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

    private batchValidate(state: ModelDefinitionState, issues: ValidationIssue[]): void {
        this.log("[ModelValidation] Starting batch validation.");

        // Synchronous validation - rules are all synchronous
        this.rules.forEach(rule => {
            rule.validate(state, issues);
        });

        this.log("[ModelValidation] Batch validation completed.");
    }


    private calculateValidationMetrics(issues: ValidationIssue[]): ValidationResult {
        const errorCount = issues.filter(i => i.severity === ValidationSeverity.ERROR).length;
        const warningCount = issues.filter(i => i.severity === ValidationSeverity.WARNING).length;
        const infoCount = issues.filter(i => i.severity === ValidationSeverity.INFO).length;

        return {
            isValid: errorCount === 0,
            issues,
            summary: {
                errorCount,
                warningCount,
                infoCount
            }
        };
    }

    private logValidationResults(result: ValidationResult): void {
        this.log('[ModelValidation] Validation results:', {
            isValid: result.isValid,
            errorCount: result.summary.errorCount,
            warningCount: result.summary.warningCount,
            infoCount: result.summary.infoCount,
            issueCount: result.issues.length,
            issues: result.issues
        });
    }

    /**
     * Builds a map of activity relationships for validation rules.
     *
     * Creates a comprehensive view of how activities are connected and
     * which resources they use. Used by validation rules to check
     * connectivity and resource usage.
     *
     * @param modelDefinition - The model to analyze
     * @returns Map of activity IDs to their relationship data
     */
    private buildActivityRelationships(
        modelDefinition: ModelDefinition
    ): Map<string, ActivityRelationships> {
        const relationships = new Map<string, ActivityRelationships>();
        const activities = modelDefinition.activities.getAll();
        const connectors = modelDefinition.connectors.getAll();
        const resourceRequirements = modelDefinition.resourceRequirements?.getAll() || [];

        // Build requirement map once
        const requirementMap = new Map(
            resourceRequirements.map(req => [req.id, req])
        );

        // Single pass: initialize relationships and populate resource assignments
        activities.forEach(activity => {
            const assignedResources = new Set<string>();

            // Process resource assignments from actions
            activity.actions?.forEach(action => {
                let requirementId: string | null = null;

                // Extract requirementId based on action type
                switch (action.actionType) {
                    case ActionType.SEIZE:
                        requirementId = (action as SeizeAction).resourceRequirementId || null;
                        break;
                    case ActionType.RELEASE:
                        requirementId = (action as ReleaseAction).resourceRequirementId || null;
                        break;
                    case ActionType.DELAY_WITH_RESOURCE:
                        requirementId = (action as DelayWithResourceAction).resourceRequirementId;
                        break;
                }

                if (requirementId) {
                    const requirement = requirementMap.get(requirementId);
                    if (requirement) {
                        requirement.rootClauses.forEach(clause => {
                            clause.requests.forEach(request => {
                                assignedResources.add(request.resourceId);
                            });
                        });
                    }
                }
            });

            relationships.set(activity.id, {
                incomingConnectors: new Set<string>(),
                outgoingConnectors: new Set<string>(),
                assignedResources
            });
        });

        // Single pass for connectors
        connectors.forEach(connector => {
            const source = relationships.get(connector.sourceId);
            const target = relationships.get(connector.targetId);

            if (source) {
                source.outgoingConnectors.add(connector.id);
            }
            if (target) {
                target.incomingConnectors.add(connector.id);
            }
        });

        return relationships;
    }
}
import { ValidationRule } from "../common/ValidationRule";
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ValidationMessages } from "../common/ValidationMessages";
import { ValidationIssue, ValidationSeverity } from "../../quodsi-messaging/validation/types";
import { Resource } from "../../types/elements/Resource";
import { ResourceRequirement } from "../../types/elements/ResourceRequirement";
import { Activity } from "../../types/elements/Activity";
import { RequirementMode } from "../../types/elements/RequirementMode";


export class ResourceValidation extends ValidationRule {
    validate(state: ModelDefinitionState, issues: ValidationIssue[]): void {
        const resources = state.modelDefinition.resources.getAll();

        this.log("Starting validation of resources.");

        // First validate each resource's data
        resources.forEach(resource => {
            this.validateResourceData(resource, issues);
        });

        // Then check resource usage across activities
        this.validateResourceUsage(state, issues);

        this.log("Completed validation of resources.");
    }

    private validateResourceData(resource: Resource, issues: ValidationIssue[]): void {
        /**
         * Validates the basic properties of a resource, such as name and capacity.
         */

        this.log(`Validating data for Resource ID: ${resource.id}`);

        if (!resource.name || resource.name.trim().length === 0) {
            this.log(`Resource ID ${resource.id} has no name.`);
            issues.push(ValidationMessages.missingName('Resource', resource.id, resource.name));
        }

        if (typeof resource.capacity !== 'number' || resource.capacity < 1) {
            this.log(`Resource ID ${resource.id} has invalid capacity: ${resource.capacity}`);
            issues.push(ValidationMessages.invalidCapacity('Resource', resource.id, 1, resource.name));
        }

        if (Math.floor(resource.capacity) !== resource.capacity) {
            this.log(`Resource ID ${resource.id} has non-integer capacity: ${resource.capacity}`);
            issues.push(ValidationMessages.createIssue(
                ValidationSeverity.ERROR,
                'resource_non_integer_capacity',
                `Resource ${resource.id} capacity must be a whole number`,
                resource.id
            ));
        }

        if (resource.capacity > 1000000) {
            this.log(`Resource ID ${resource.id} has unusually high capacity: ${resource.capacity}`);
            issues.push(ValidationMessages.createIssue(
                ValidationSeverity.WARNING,
                'resource_high_capacity',
                `Resource ${resource.id} has unusually high capacity (${resource.capacity})`,
                resource.id
            ));
        }
    }

    private validateResourceUsage(state: ModelDefinitionState, issues: ValidationIssue[]): void {
        this.log("Validating resource usage across activities.");

        const resources = state.modelDefinition.resources.getAll();
        const activities = state.modelDefinition.activities.getAll();
        const resourceRequirements = state.modelDefinition.resourceRequirements?.getAll() || [];
        const requirementMap = new Map(
            resourceRequirements.map(req => [req.id, req])
        );

        // Resource ID -> Set of Activity IDs
        const resourceUsage = new Map<string, Set<string>>();

        // Initialize resource usage map
        resources.forEach(resource => {
            resourceUsage.set(resource.id, new Set<string>());
        });

        // Process activities and their resource requirements
        activities.forEach(activity => {
            if (activity.operationSteps) {
                activity.operationSteps.forEach(step => {
                    if (step.requirementId) {
                        const requirement = requirementMap.get(step.requirementId);
                        if (requirement) {
                            this.processResourceRequirement(
                                requirement,
                                activity,
                                resourceUsage,
                                issues
                            );
                        } else {
                            issues.push(ValidationMessages.createIssue(
                                ValidationSeverity.ERROR,
                                'invalid_requirement_reference',
                                `Invalid resource requirement reference: ${step.requirementId}`,
                                activity.id
                            ));
                        }
                    }
                });
            }
        });

        // Check for unused resources
        resourceUsage.forEach((usedByActivities, resourceId) => {
            if (usedByActivities.size === 0) {
                this.log(`Resource ID ${resourceId} is not used by any activity.`);

                // Look up resource to get name
                const resource = resources.find(r => r.id === resourceId);
                const displayName = resource?.name && resource.name.trim() !== ''
                    ? `'${resource.name}'`
                    : resourceId;

                issues.push(ValidationMessages.createIssue(
                    ValidationSeverity.WARNING,
                    'resource_not_used',
                    `Resource ${displayName} is not used by any activity`,
                    resourceId
                ));
            }
        });

        this.checkResourceConflicts(state, resourceUsage, issues);
    }

    private processResourceRequirement(
        requirement: ResourceRequirement,
        activity: Activity,
        resourceUsage: Map<string, Set<string>>,
        issues: ValidationIssue[]
    ): void {
        requirement.rootClauses.forEach(clause => {
            // Process based on requirement mode
            if (clause.mode === RequirementMode.REQUIRE_ALL) {
                // All resources must be available
                clause.requests.forEach(request => {
                    this.addResourceUsage(request.resourceId, activity, resourceUsage);
                });
            } else if (clause.mode === RequirementMode.REQUIRE_ANY) {
                // At least one resource must be available
                // Just mark all as potentially used, detailed conflict resolution 
                // will be handled in checkResourceConflicts
                clause.requests.forEach(request => {
                    this.addResourceUsage(request.resourceId, activity, resourceUsage);
                });
            }
        })

    }

    private addResourceUsage(
        resourceId: string,
        activity: Activity,
        resourceUsage: Map<string, Set<string>>
    ): void {
        const usageSet = resourceUsage.get(resourceId);
        if (usageSet) {
            usageSet.add(activity.id);
        } else {
            this.log(`Warning: Reference to non-existent resource ID: ${resourceId}`);
        }
    }

    private processResourceRequests(
        requests: Array<any>,
        activity: any,
        resourceUsage: Map<string, Set<string>>,
        issues: ValidationIssue[]
    ): void {
        /**
         * Processes resource requests within an activity's operation steps.
         */

        requests.forEach(request => {
            if (request.requests) {
                this.processResourceRequests(
                    request.requests,
                    activity,
                    resourceUsage,
                    issues
                );
                return;
            }

            if (request.resource) {
                const resourceId = request.resource.id;
                const usageSet = resourceUsage.get(resourceId);

                if (usageSet) {
                    usageSet.add(activity.id);

                    if (typeof request.quantity !== 'number' || request.quantity < 1) {
                        this.log(`Activity ID ${activity.id} has invalid resource quantity for Resource ID ${resourceId}`);
                        issues.push(ValidationMessages.createIssue(
                            ValidationSeverity.ERROR,
                            'invalid_resource_quantity',
                            `Invalid resource quantity in activity ${activity.id} for resource ${resourceId}`,
                            activity.id
                        ));
                    }
                } else {
                    this.log(`Activity ID ${activity.id} references non-existent Resource ID ${resourceId}`);
                    issues.push(ValidationMessages.createIssue(
                        ValidationSeverity.ERROR,
                        'nonexistent_resource_reference',
                        `Activity ${activity.id} references non-existent resource ${resourceId}`,
                        activity.id
                    ));
                }
            }
        });
    }

    private checkResourceConflicts(
        state: ModelDefinitionState,
        resourceUsage: Map<string, Set<string>>,
        issues: ValidationIssue[]
    ): void {
        /**
         * Checks for conflicts in resource usage, such as overutilization.
         */

        this.log("Checking for resource usage conflicts.");

        const resources = state.modelDefinition.resources.getAll();

        resources.forEach(resource => {
            const usedByActivities = resourceUsage.get(resource.id);
            if (usedByActivities && usedByActivities.size > 1) {
                this.validateConcurrentResourceUsage(
                    state,
                    resource,
                    Array.from(usedByActivities),
                    issues
                );
            }
        });
    }

    private validateConcurrentResourceUsage(
        state: ModelDefinitionState,
        resource: Resource,
        activityIds: string[],
        issues: ValidationIssue[]
    ): void {
        /**
         * Validates concurrent usage of a resource across multiple activities.
         */

        this.log(`Validating concurrent usage for Resource ID: ${resource.id}`);

        const activities = activityIds
            .map(id => state.modelDefinition.activities.get(id))
            .filter(activity => activity !== undefined);

        let totalMaxPossibleDemand = 0;
        activities.forEach(activity => {
            const maxDemand = this.calculateMaxResourceDemand(activity!, resource.id);
            totalMaxPossibleDemand += maxDemand;
        });

        if (totalMaxPossibleDemand > resource.capacity) {
            this.log(`Resource ID ${resource.id} might be overutilized. Capacity: ${resource.capacity}, Demand: ${totalMaxPossibleDemand}`);
            issues.push(ValidationMessages.createIssue(
                ValidationSeverity.WARNING,
                'resource_overutilized',
                `Potential resource conflict: Resource ${resource.id} (capacity: ${resource.capacity}) might be overutilized. Maximum possible demand: ${totalMaxPossibleDemand}`,
                resource.id
            ));
        }
    }

    private calculateMaxResourceDemand(activity: any, resourceId: string): number {
        /**
         * Calculates the maximum possible demand for a resource by a single activity.
         */

        let maxDemand = 0;

        activity.operationSteps?.forEach((step: any) => {
            if (step.resourceSetRequest?.requests) {
                step.resourceSetRequest.requests.forEach((request: any) => {
                    if (request.resource?.id === resourceId) {
                        maxDemand = Math.max(maxDemand, request.quantity || 0);
                    }
                });
            }
        });

        return maxDemand;
    }
}

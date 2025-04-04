import { ValidationRule } from "../common/ValidationRule";
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ValidationMessage } from "../../types/validation";
import { Resource } from "../../types/elements/Resource";
import { ResourceRequirement } from "../../types/elements/ResourceRequirement";
import { Activity } from "../../types/elements/Activity";
import { RequirementMode } from "../../types/elements/RequirementMode";


export class ResourceValidation extends ValidationRule {
    validate(state: ModelDefinitionState, messages: ValidationMessage[]): void {
        const resources = state.modelDefinition.resources.getAll();

        this.log("Starting validation of resources.");

        // First validate each resource's data
        resources.forEach(resource => {
            this.validateResourceData(resource, messages);
        });

        // Then check resource usage across activities
        this.validateResourceUsage(state, messages);

        this.log("Completed validation of resources.");
    }

    private validateResourceData(resource: Resource, messages: ValidationMessage[]): void {
        /**
         * Validates the basic properties of a resource, such as name and capacity.
         */

        this.log(`Validating data for Resource ID: ${resource.id}`);

        if (!resource.name || resource.name.trim().length === 0) {
            this.log(`Resource ID ${resource.id} has no name.`);
            messages.push({
                type: 'warning',
                message: `Resource ${resource.id} has no name`,
                elementId: resource.id
            });
        }

        if (typeof resource.capacity !== 'number' || resource.capacity < 1) {
            this.log(`Resource ID ${resource.id} has invalid capacity: ${resource.capacity}`);
            messages.push({
                type: 'error',
                message: `Resource ${resource.id} has invalid capacity (must be >= 1)`,
                elementId: resource.id
            });
        }

        if (Math.floor(resource.capacity) !== resource.capacity) {
            this.log(`Resource ID ${resource.id} has non-integer capacity: ${resource.capacity}`);
            messages.push({
                type: 'error',
                message: `Resource ${resource.id} capacity must be a whole number`,
                elementId: resource.id
            });
        }

        if (resource.capacity > 1000000) {
            this.log(`Resource ID ${resource.id} has unusually high capacity: ${resource.capacity}`);
            messages.push({
                type: 'warning',
                message: `Resource ${resource.id} has unusually high capacity (${resource.capacity})`,
                elementId: resource.id
            });
        }
    }

    private validateResourceUsage(state: ModelDefinitionState, messages: ValidationMessage[]): void {
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
                                messages
                            );
                        } else {
                            messages.push({
                                type: 'error',
                                message: `Invalid resource requirement reference: ${step.requirementId}`,
                                elementId: activity.id
                            });
                        }
                    }
                });
            }
        });

        // Check for unused resources
        resourceUsage.forEach((usedByActivities, resourceId) => {
            if (usedByActivities.size === 0) {
                this.log(`Resource ID ${resourceId} is not used by any activity.`);
                messages.push({
                    type: 'warning',
                    message: `Resource ${resourceId} is not used by any activity`,
                    elementId: resourceId
                });
            }
        });

        this.checkResourceConflicts(state, resourceUsage, messages);
    }

    private processResourceRequirement(
        requirement: ResourceRequirement,
        activity: Activity,
        resourceUsage: Map<string, Set<string>>,
        messages: ValidationMessage[]
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
        messages: ValidationMessage[]
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
                    messages
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
                        messages.push({
                            type: 'error',
                            message: `Invalid resource quantity in activity ${activity.id} for resource ${resourceId}`,
                            elementId: activity.id
                        });
                    }
                } else {
                    this.log(`Activity ID ${activity.id} references non-existent Resource ID ${resourceId}`);
                    messages.push({
                        type: 'error',
                        message: `Activity ${activity.id} references non-existent resource ${resourceId}`,
                        elementId: activity.id
                    });
                }
            }
        });
    }

    private checkResourceConflicts(
        state: ModelDefinitionState,
        resourceUsage: Map<string, Set<string>>,
        messages: ValidationMessage[]
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
                    messages
                );
            }
        });
    }

    private validateConcurrentResourceUsage(
        state: ModelDefinitionState,
        resource: Resource,
        activityIds: string[],
        messages: ValidationMessage[]
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
            messages.push({
                type: 'warning',
                message: `Potential resource conflict: Resource ${resource.id} (capacity: ${resource.capacity}) might be overutilized. Maximum possible demand: ${totalMaxPossibleDemand}`,
                elementId: resource.id
            });
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

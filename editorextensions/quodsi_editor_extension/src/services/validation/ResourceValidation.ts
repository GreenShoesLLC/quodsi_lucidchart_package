import { ValidationRule } from "./ValidationRule";
import { ValidationMessage, Resource } from "@quodsi/shared";
import { ModelDefinitionState } from "./ModelDefinitionState";

export class ResourceValidation extends ValidationRule {
    validate(state: ModelDefinitionState, messages: ValidationMessage[]): void {
        const resources = state.modelDefinition.resources.getAll();

        // First validate each resource's data
        resources.forEach(resource => {
            this.validateResourceData(resource, messages);
        });

        // Then check resource usage across activities
        this.validateResourceUsage(state, messages);
    }

    private validateResourceData(resource: Resource, messages: ValidationMessage[]): void {
        // Validate name
        if (!resource.name || resource.name.trim().length === 0) {
            messages.push({
                type: 'warning',
                message: `Resource ${resource.id} has no name`,
                elementId: resource.id
            });
        }

        // Validate capacity
        if (typeof resource.capacity !== 'number' || resource.capacity < 1) {
            messages.push({
                type: 'error',
                message: `Resource ${resource.id} has invalid capacity (must be >= 1)`,
                elementId: resource.id
            });
        }

        // Validate that capacity is an integer
        if (Math.floor(resource.capacity) !== resource.capacity) {
            messages.push({
                type: 'error',
                message: `Resource ${resource.id} capacity must be a whole number`,
                elementId: resource.id
            });
        }

        // Additional capacity validation for maximum reasonable value
        if (resource.capacity > 1000000) {
            messages.push({
                type: 'warning',
                message: `Resource ${resource.id} has unusually high capacity (${resource.capacity})`,
                elementId: resource.id
            });
        }
    }

    private validateResourceUsage(state: ModelDefinitionState, messages: ValidationMessage[]): void {
        const resources = state.modelDefinition.resources.getAll();
        const activities = state.modelDefinition.activities.getAll();
        const resourceUsage = new Map<string, Set<string>>(); // Resource ID -> Set of Activity IDs

        // Initialize resource usage tracking
        resources.forEach(resource => {
            resourceUsage.set(resource.id, new Set<string>());
        });

        // Check each activity's operation steps for resource usage
        activities.forEach(activity => {
            if (activity.operationSteps) {
                activity.operationSteps.forEach(step => {
                    if (step.resourceSetRequest?.requests) {
                        this.processResourceRequests(
                            step.resourceSetRequest.requests,
                            activity,
                            resourceUsage,
                            messages
                        );
                    }
                });
            }
        });

        // Check for unused resources
        resourceUsage.forEach((usedByActivities, resourceId) => {
            if (usedByActivities.size === 0) {
                messages.push({
                    type: 'warning',
                    message: `Resource ${resourceId} is not used by any activity`,
                    elementId: resourceId
                });
            }
        });

        // Check for potential resource conflicts
        this.checkResourceConflicts(state, resourceUsage, messages);
    }

    private processResourceRequests(
        requests: Array<any>,
        activity: any,
        resourceUsage: Map<string, Set<string>>,
        messages: ValidationMessage[]
    ): void {
        requests.forEach(request => {
            // Handle nested resource set requests
            if (request.requests) {
                this.processResourceRequests(
                    request.requests,
                    activity,
                    resourceUsage,
                    messages
                );
                return;
            }

            // Handle direct resource requests
            if (request.resource) {
                const resourceId = request.resource.id;
                const usageSet = resourceUsage.get(resourceId);

                if (usageSet) {
                    usageSet.add(activity.id);

                    // Validate resource request quantity
                    if (typeof request.quantity !== 'number' || request.quantity < 1) {
                        messages.push({
                            type: 'error',
                            message: `Invalid resource quantity in activity ${activity.id} for resource ${resourceId}`,
                            elementId: activity.id
                        });
                    }
                } else {
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
        const resources = state.modelDefinition.resources.getAll();

        resources.forEach(resource => {
            const usedByActivities = resourceUsage.get(resource.id);
            if (usedByActivities && usedByActivities.size > 1) {
                // Check if activities using this resource might run concurrently
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
        // Get all activities that use this resource
        const activities = activityIds
            .map(id => state.modelDefinition.activities.get(id))
            .filter(activity => activity !== undefined);

        // Check if total requested resource quantity might exceed capacity
        let totalMaxPossibleDemand = 0;
        activities.forEach(activity => {
            const maxDemand = this.calculateMaxResourceDemand(activity!, resource.id);
            totalMaxPossibleDemand += maxDemand;
        });

        if (totalMaxPossibleDemand > resource.capacity) {
            messages.push({
                type: 'warning',
                message: `Potential resource conflict: Resource ${resource.id} (capacity: ${resource.capacity}) might be overutilized. Maximum possible demand: ${totalMaxPossibleDemand}`,
                elementId: resource.id
            });
        }
    }

    private calculateMaxResourceDemand(activity: any, resourceId: string): number {
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
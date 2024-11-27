import { ValidationRule } from './ValidationRule';
import { ValidationMessage } from '../../../shared/types/ValidationTypes';
import { ModelState } from '../interfaces/ModelState';

export class ResourceValidation extends ValidationRule {
    validate(state: ModelState, messages: ValidationMessage[]): void {
        for (const resourceId of state.relationships.resources) {
            const resource = state.elements.get(resourceId);
            if (!resource) {
                messages.push({
                    type: 'error',
                    message: `Resource ${resourceId} exists in relationships but not in elements`,
                    elementId: resourceId
                });
                continue;
            }

            // Check if resource is used by any activity
            let isUsed = false;
            for (const relationships of state.activityRelationships.values()) {
                if (relationships.assignedResources.has(resourceId)) {
                    isUsed = true;
                    break;
                }
            }

            if (!isUsed) {
                messages.push({
                    type: 'warning',
                    message: `Resource ${resourceId} is not used by any activity`,
                    elementId: resourceId
                });
            }

            this.validateResourceData(resource, messages);
        }
    }

    private validateResourceData(resource: any, messages: ValidationMessage[]): void {
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

        // Validate availability if present
        if (resource.availability && typeof resource.availability !== 'number') {
            messages.push({
                type: 'error',
                message: `Resource ${resource.id} has invalid availability setting`,
                elementId: resource.id
            });
        }
    }
}
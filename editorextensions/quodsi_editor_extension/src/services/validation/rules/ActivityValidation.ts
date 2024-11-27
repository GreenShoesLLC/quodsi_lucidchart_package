import { SimulationElement } from "../../../shared/types/SimulationElement";
import { ValidationMessage } from "../../../shared/types/ValidationTypes";
import { ModelState } from "../interfaces/ModelState";
import { ValidationRule } from "./ValidationRule";

/**
 * Validates activity-specific rules
 */
export class ActivityValidation extends ValidationRule {
    validate(state: ModelState, messages: ValidationMessage[]): void {
        for (const activityId of state.relationships.activities) {
            const activity = state.elements.get(activityId);
            if (!activity) {
                messages.push({
                    type: 'error',
                    message: `Activity ${activityId} exists in relationships but not in elements`,
                    elementId: activityId
                });
                continue;
            }

            this.validateActivityConnectivity(activityId, state, messages);
            this.validateActivityData(activity, messages);
        }
    }

    private validateActivityConnectivity(
        activityId: string,
        state: ModelState,
        messages: ValidationMessage[]
    ): void {
        const relationships = state.activityRelationships.get(activityId);
        if (!relationships) {
            messages.push({
                type: 'error',
                message: `Activity ${activityId} has no relationship tracking`,
                elementId: activityId
            });
            return;
        }

        if (relationships.incomingConnectors.size === 0 &&
            relationships.outgoingConnectors.size === 0) {
            messages.push({
                type: 'error',
                message: `Activity ${activityId} is isolated (no connections)`,
                elementId: activityId
            });
        }
    }

    private validateActivityData(activity: SimulationElement, messages: ValidationMessage[]): void {
        const activityData = activity as any;

        if (!activityData.name?.trim()) {
            messages.push({
                type: 'warning',
                message: `Activity ${activity.id} has no name`,
                elementId: activity.id
            });
        }

        if (typeof activityData.capacity !== 'number' || activityData.capacity < 1) {
            messages.push({
                type: 'error',
                message: `Activity ${activity.id} has invalid capacity (must be >= 1)`,
                elementId: activity.id
            });
        }

        this.validateBufferCapacities(activity.id, activityData, messages);
        this.validateOperationSteps(activity.id, activityData, messages);
    }

    private validateBufferCapacities(
        id: string,
        data: any,
        messages: ValidationMessage[]
    ): void {
        if (typeof data.inputBufferCapacity !== 'number' || data.inputBufferCapacity < 0) {
            messages.push({
                type: 'error',
                message: `Activity ${id} has invalid input buffer capacity`,
                elementId: id
            });
        }

        if (typeof data.outputBufferCapacity !== 'number' || data.outputBufferCapacity < 0) {
            messages.push({
                type: 'error',
                message: `Activity ${id} has invalid output buffer capacity`,
                elementId: id
            });
        }
    }

    private validateOperationSteps(
        id: string,
        data: any,
        messages: ValidationMessage[]
    ): void {
        if (!Array.isArray(data.operationSteps)) {
            messages.push({
                type: 'error',
                message: `Activity ${id} is missing operation steps property`,
                elementId: id
            });
            return;
        }

        if (data.operationSteps.length === 0) {
            messages.push({
                type: 'warning',
                message: `Activity ${id} has no operation steps defined`,
                elementId: id
            });
            return;
        }

        data.operationSteps.forEach((step: any, index: number) => {
            if (!step.duration?.durationLength) {
                messages.push({
                    type: 'error',
                    message: `Activity ${id} operation step ${index + 1} has invalid duration`,
                    elementId: id
                });
            }
        });
    }
}
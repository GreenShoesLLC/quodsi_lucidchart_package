import { ValidationRule } from "./ValidationRule";
import { ValidationMessage } from "../../../shared/types/ValidationTypes";
import { ModelState } from "../interfaces/ModelState";
import { Activity } from "../../../shared/types/elements/Activity";

export class ActivityValidation extends ValidationRule {
    validate(state: ModelState, messages: ValidationMessage[]): void {
        const activities = state.modelDefinition.activities.getAll();

        activities.forEach(activity => {
            this.validateActivityConnectivity(activity.id, state, messages);
            this.validateActivityData(activity, messages);
        });
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

    private validateActivityData(activity: Activity, messages: ValidationMessage[]): void {
        if (!activity.name?.trim()) {
            messages.push({
                type: 'warning',
                message: `Activity ${activity.id} has no name`,
                elementId: activity.id
            });
        }

        if (typeof activity.capacity !== 'number' || activity.capacity < 1) {
            messages.push({
                type: 'error',
                message: `Activity ${activity.id} has invalid capacity (must be >= 1)`,
                elementId: activity.id
            });
        }

        this.validateBufferCapacities(activity, messages);
        this.validateOperationSteps(activity, messages);
    }

    private validateBufferCapacities(
        activity: Activity,
        messages: ValidationMessage[]
    ): void {
        if (typeof activity.inputBufferCapacity !== 'number' || activity.inputBufferCapacity < 0) {
            messages.push({
                type: 'error',
                message: `Activity ${activity.id} has invalid input buffer capacity`,
                elementId: activity.id
            });
        }

        if (typeof activity.outputBufferCapacity !== 'number' || activity.outputBufferCapacity < 0) {
            messages.push({
                type: 'error',
                message: `Activity ${activity.id} has invalid output buffer capacity`,
                elementId: activity.id
            });
        }
    }

    private validateOperationSteps(
        activity: Activity,
        messages: ValidationMessage[]
    ): void {
        if (!Array.isArray(activity.operationSteps)) {
            messages.push({
                type: 'error',
                message: `Activity ${activity.id} is missing operation steps property`,
                elementId: activity.id
            });
            return;
        }

        if (activity.operationSteps.length === 0) {
            messages.push({
                type: 'warning',
                message: `Activity ${activity.id} has no operation steps defined`,
                elementId: activity.id
            });
            return;
        }

        activity.operationSteps.forEach((step, index) => {
            if (!step.duration?.durationLength) {
                messages.push({
                    type: 'error',
                    message: `Activity ${activity.id} operation step ${index + 1} has invalid duration`,
                    elementId: activity.id
                });
            }
        });
    }
}
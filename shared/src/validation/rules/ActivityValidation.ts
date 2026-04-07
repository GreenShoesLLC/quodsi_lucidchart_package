import { ValidationRule } from "../common/ValidationRule";
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ValidationMessages } from "../common/ValidationMessages";
import { ValidationIssue } from "../../quodsi-messaging/validation/types";
import { Activity } from "../../types/elements/Activity";
import { Action } from "../../types/elements/actions/Action";
import { ActionType } from "../../types/elements/actions/ActionType";



export class ActivityValidation extends ValidationRule {
    private static readonly MAX_QUEUE_SIZE = 999999;
    private static readonly MIN_CYCLE_TIME = 0.001;
    private static readonly MAX_CYCLE_TIME = 86400; // 24 hours in seconds

    validate(state: ModelDefinitionState, issues: ValidationIssue[]): void {
        const activities = state.modelDefinition.activities.getAll();

        activities.forEach((activity: Activity) => {
            this.validateActivityConnectivity(activity, state, issues);
            this.validateActivityData(activity, issues);

        });

        this.validateActivityInteractions(state, issues);
    }

    private validateActivityConnectivity(
        activity: Activity,
        state: ModelDefinitionState,
        issues: ValidationIssue[]
    ): void {
        /**
         * Validates that an activity is properly connected.
         * Ensures it has at least one incoming or outgoing connection.
         */

        this.log(`Validating connectivity for Activity ID: ${activity.id}`);

        const relationships = state.activityRelationships.get(activity.id);
        if (!relationships) {
            this.log(`Activity ID ${activity.id} is isolated.`);
            issues.push(ValidationMessages.isolatedElement("Activity", activity.id, activity.name));
            return;
        }

        if (relationships.incomingConnectors.size === 0 && relationships.outgoingConnectors.size === 0) {
            this.log(`Activity ID ${activity.id} has no incoming or outgoing connections.`);
            issues.push(ValidationMessages.isolatedElement("Activity", activity.id, activity.name));
        }

        if (relationships.incomingConnectors.size === 0) {
            this.log(`Activity ID ${activity.id} has no incoming connections.`);
            issues.push(ValidationMessages.noConnections("Activity", activity.id, "incoming", activity.name));
        }
    }

    private validateActivityData(activity: Activity, issues: ValidationIssue[]): void {
        /**
         * Validates the core data of an activity, including its name, capacity, and buffer sizes.
         */

        this.log(`Validating data for Activity ID: ${activity.id}`);

        if (!activity.name?.trim()) {
            this.log(`Activity ID ${activity.id} has a missing name.`);
            issues.push(ValidationMessages.missingName("Activity", activity.id, activity.name));
        }

        if (typeof activity.capacity !== "number" || activity.capacity < 1) {
            this.log(`Activity ID ${activity.id} has an invalid capacity: ${activity.capacity}`);
            issues.push(ValidationMessages.invalidCapacity("Activity", activity.id, 1, activity.name));
        }

        this.validateQueueCapacities(activity, issues);
        this.validateActions(activity, issues);
    }

    private validateQueueCapacities(
        activity: Activity,
        issues: ValidationIssue[]
    ): void {
        /**
         * Validates the inbound and outbound queue capacities of an activity.
         */

        this.log(`Validating queue capacities for Activity ID: ${activity.id}`);

        if (typeof activity.inboundQueueCapacity !== "number" || activity.inboundQueueCapacity < 0) {
            this.log(`Activity ID ${activity.id} has an invalid inbound queue capacity: ${activity.inboundQueueCapacity}`);
            issues.push(ValidationMessages.invalidQueueCapacity("Activity", activity.id, "inbound", activity.name));
        } else if (activity.inboundQueueCapacity > ActivityValidation.MAX_QUEUE_SIZE) {
            this.log(`Activity ID ${activity.id} has a large inbound queue capacity: ${activity.inboundQueueCapacity}`);
            issues.push(ValidationMessages.largeQueueCapacity("Activity", activity.id, "inbound", activity.name));
        }

        if (typeof activity.outboundQueueCapacity !== "number" || activity.outboundQueueCapacity < 0) {
            this.log(`Activity ID ${activity.id} has an invalid outbound queue capacity: ${activity.outboundQueueCapacity}`);
            issues.push(ValidationMessages.invalidQueueCapacity("Activity", activity.id, "outbound", activity.name));
        } else if (activity.outboundQueueCapacity > ActivityValidation.MAX_QUEUE_SIZE) {
            this.log(`Activity ID ${activity.id} has a large outbound queue capacity: ${activity.outboundQueueCapacity}`);
            issues.push(ValidationMessages.largeQueueCapacity("Activity", activity.id, "outbound", activity.name));
        }
    }

    private validateActions(
        activity: Activity,
        issues: ValidationIssue[]
    ): void {
        /**
         * Validates the actions defined for an activity.
         */

        this.log(`Validating actions for Activity ID: ${activity.id}`);

        if (!Array.isArray(activity.actions)) {
            this.log(`Activity ID ${activity.id} has no actions defined.`);
            issues.push(ValidationMessages.missingActions(activity.id, activity.name));
            return;
        }

        if (activity.actions.length === 0) {
            this.log(`Activity ID ${activity.id} has an empty actions list.`);
            issues.push(ValidationMessages.noActions(activity.id, activity.name));
            return;
        }

        activity.actions.forEach((action, index) => {
            this.validateAction(activity.id, action, index, issues);
        });
    }

    private validateAction(
        activityId: string,
        action: Action,
        index: number,
        issues: ValidationIssue[]
    ): void {
        this.log(`Validating action ${index + 1} (${action.actionType}) for Activity ID: ${activityId}`);

        // Basic validation - ensure action has a valid type
        if (!action.actionType) {
            this.log(`Action ${index + 1} for Activity ID ${activityId} has no action type.`);
            return;
        }

        // Type-specific validation can be added here in the future
        // For now, just log that we validated the action
        switch (action.actionType) {
            case ActionType.DELAY:
            case ActionType.DELAY_WITH_RESOURCE:
                // Could validate duration exists
                break;
            case ActionType.SEIZE:
            case ActionType.RELEASE:
                // Could validate resourceRequirementId exists
                break;
            case ActionType.ASSIGN:
                // Could validate stateModifications exist
                break;
        }
    }

    private validateActivityInteractions(
        state: ModelDefinitionState,
        issues: ValidationIssue[]
    ): void {
        /**
         * Validates interactions among activities to detect deadlocks or circular dependencies.
         */

        this.log("Validating activity interactions for potential deadlocks.");

        const activities = state.modelDefinition.activities.getAll();
        const visited = new Set<string>();
        const stack = new Set<string>();

        activities.forEach((activity: { id: string; }) => {
            if (!visited.has(activity.id)) {
                this.detectCycles(activity.id, state, visited, stack, issues);
            }
        });
    }

    private detectCycles(
        activityId: string,
        state: ModelDefinitionState,
        visited: Set<string>,
        stack: Set<string>,
        issues: ValidationIssue[]
    ): void {
        /**
         * Detects cycles within the activity graph.
         */

        visited.add(activityId);
        stack.add(activityId);

        const relationships = state.activityRelationships.get(activityId);
        if (relationships) {
            relationships.outgoingConnectors.forEach((connectorId: string) => {
                const connector = state.connections.get(connectorId);
                if (connector) {
                    const targetId = connector.targetId;
                    if (!visited.has(targetId)) {
                        this.detectCycles(targetId, state, visited, stack, issues);
                    } else if (stack.has(targetId)) {
                        this.log(`Circular dependency detected involving Activity ID ${activityId}`);
                        const activity = state.modelDefinition.activities.get(activityId);
                        issues.push(ValidationMessages.circularDependency(activityId, activity?.name));
                    }
                }
            });
        }

        stack.delete(activityId);
    }


}

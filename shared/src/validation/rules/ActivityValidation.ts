import { ValidationRule } from "../common/ValidationRule";
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ValidationMessages } from "../common/ValidationMessages";
import { ValidationMessage } from "../../types/validation";
import { Activity } from "../../types/elements/Activity";
import { OperationStep } from "../../types/elements/OperationStep";
import { ResourceRequirement } from "../../types/elements/ResourceRequirement";



export class ActivityValidation extends ValidationRule {
    private static readonly MAX_BUFFER_SIZE = 10000;
    private static readonly MIN_CYCLE_TIME = 0.001;
    private static readonly MAX_CYCLE_TIME = 86400; // 24 hours in seconds

    validate(state: ModelDefinitionState, messages: ValidationMessage[]): void {
        const activities = state.modelDefinition.activities.getAll();

        activities.forEach((activity: Activity) => {
            this.validateActivityConnectivity(activity.id, state, messages);
            this.validateActivityData(activity, messages);
            this.validateOperationSequence(activity, state, messages);
            this.validateBufferConstraints(activity, state, messages);
        });

        this.validateActivityInteractions(state, messages);
    }

    private validateActivityConnectivity(
        activityId: string,
        state: ModelDefinitionState,
        messages: ValidationMessage[]
    ): void {
        /**
         * Validates that an activity is properly connected.
         * Ensures it has at least one incoming or outgoing connection.
         */

        this.log(`Validating connectivity for Activity ID: ${activityId}`);

        const relationships = state.activityRelationships.get(activityId);
        if (!relationships) {
            this.log(`Activity ID ${activityId} is isolated.`);
            messages.push(ValidationMessages.isolatedElement("Activity", activityId));
            return;
        }

        if (relationships.incomingConnectors.size === 0 && relationships.outgoingConnectors.size === 0) {
            this.log(`Activity ID ${activityId} has no incoming or outgoing connections.`);
            messages.push(ValidationMessages.isolatedElement("Activity", activityId));
        }

        if (relationships.incomingConnectors.size === 0) {
            this.log(`Activity ID ${activityId} has no incoming connections.`);
            messages.push(ValidationMessages.noConnections("Activity", activityId, "incoming"));
        }

        if (relationships.outgoingConnectors.size === 0) {
            this.log(`Activity ID ${activityId} has no outgoing connections.`);
            messages.push(ValidationMessages.noConnections("Activity", activityId, "outgoing"));
        }
    }

    private validateActivityData(activity: Activity, messages: ValidationMessage[]): void {
        /**
         * Validates the core data of an activity, including its name, capacity, and buffer sizes.
         */

        this.log(`Validating data for Activity ID: ${activity.id}`);

        if (!activity.name?.trim()) {
            this.log(`Activity ID ${activity.id} has a missing name.`);
            messages.push(ValidationMessages.missingName("Activity", activity.id));
        }

        if (typeof activity.capacity !== "number" || activity.capacity < 1) {
            this.log(`Activity ID ${activity.id} has an invalid capacity: ${activity.capacity}`);
            messages.push(ValidationMessages.invalidCapacity("Activity", activity.id));
        }

        this.validateBufferCapacities(activity, messages);
        this.validateOperationSteps(activity, messages);
    }

    private validateBufferCapacities(
        activity: Activity,
        messages: ValidationMessage[]
    ): void {
        /**
         * Validates the input and output buffer capacities of an activity.
         */

        this.log(`Validating buffer capacities for Activity ID: ${activity.id}`);

        if (typeof activity.inputBufferCapacity !== "number" || activity.inputBufferCapacity < 0) {
            this.log(`Activity ID ${activity.id} has an invalid input buffer capacity: ${activity.inputBufferCapacity}`);
            messages.push(ValidationMessages.invalidBufferCapacity("Activity", activity.id, "input"));
        } else if (activity.inputBufferCapacity > ActivityValidation.MAX_BUFFER_SIZE) {
            this.log(`Activity ID ${activity.id} has a large input buffer capacity: ${activity.inputBufferCapacity}`);
            messages.push(ValidationMessages.largeBufferCapacity("Activity", activity.id, "input"));
        }

        if (typeof activity.outputBufferCapacity !== "number" || activity.outputBufferCapacity < 0) {
            this.log(`Activity ID ${activity.id} has an invalid output buffer capacity: ${activity.outputBufferCapacity}`);
            messages.push(ValidationMessages.invalidBufferCapacity("Activity", activity.id, "output"));
        } else if (activity.outputBufferCapacity > ActivityValidation.MAX_BUFFER_SIZE) {
            this.log(`Activity ID ${activity.id} has a large output buffer capacity: ${activity.outputBufferCapacity}`);
            messages.push(ValidationMessages.largeBufferCapacity("Activity", activity.id, "output"));
        }
    }

    private validateOperationSteps(
        activity: Activity,
        messages: ValidationMessage[]
    ): void {
        /**
         * Validates the operation steps defined for an activity.
         */

        this.log(`Validating operation steps for Activity ID: ${activity.id}`);

        if (!Array.isArray(activity.operationSteps)) {
            this.log(`Activity ID ${activity.id} has no operation steps defined.`);
            messages.push(ValidationMessages.missingOperationSteps(activity.id));
            return;
        }

        if (activity.operationSteps.length === 0) {
            this.log(`Activity ID ${activity.id} has an empty operation step list.`);
            messages.push(ValidationMessages.noOperationSteps(activity.id));
            return;
        }

        activity.operationSteps.forEach((step, index) => {
            this.validateOperationStep(activity.id, step, index, messages);
        });
    }

    private validateOperationStep(
        activityId: string,
        step: OperationStep,
        index: number,
        messages: ValidationMessage[]
    ): void {
        this.log(`Validating operation step ${index + 1} for Activity ID: ${activityId}`);

        // Validate duration
        if (!step.duration?.durationLength) {
            this.log(`Operation step ${index + 1} for Activity ID ${activityId} has an invalid duration.`);
            messages.push(ValidationMessages.invalidStepDuration(activityId, index + 1));
        } else {
            const duration = step.duration.durationLength;
            if (duration < ActivityValidation.MIN_CYCLE_TIME || duration > ActivityValidation.MAX_CYCLE_TIME) {
                this.log(`Operation step ${index + 1} for Activity ID ${activityId} has an unusual duration: ${duration}`);
                messages.push(ValidationMessages.unusualStepDuration(activityId, index + 1, duration));
            }
        }

        // Validate resource requirement
        if (step.requirementId) {
            this.validateResourceRequirement(
                activityId,
                step.requirementId,
                step.quantity,
                index,
                messages
            );
        }
    }

    private validateResourceRequirement(
        activityId: string,
        requirementId: string,
        quantity: number,
        stepIndex: number,
        messages: ValidationMessage[]
    ): void {
        // You might want to pass ModelDefinitionState to this method to look up requirements
        if (quantity < 1) {
            messages.push({
                type: 'error',
                message: `Operation step ${stepIndex + 1} has invalid quantity: ${quantity}`,
                elementId: activityId
            });
        }
    }

    private validateOperationSequence(
        activity: Activity,
        state: ModelDefinitionState,
        messages: ValidationMessage[]
    ): void {
        this.log(`Validating operation sequence for Activity ID: ${activity.id}`);

        if (!activity.operationSteps?.length) return;

        const resourceRequirements: ResourceRequirement[] = state.modelDefinition.resourceRequirements?.getAll() || [];
        const requirementMap = new Map<string, ResourceRequirement>(
            resourceRequirements.map(req => [req.id, req])
        );

        let hasResourceRequest = false;

        activity.operationSteps.forEach((step) => {
            if (step.requirementId) {
                const requirement = requirementMap.get(step.requirementId);
                if (requirement && requirement.rootClauses) {
                    requirement.rootClauses.forEach(clause => {
                        if (clause && clause.requests.length > 0) {
                            hasResourceRequest = true;
                        }
                    });
                }
            }
        });

        if (hasResourceRequest) {
            this.log(`Resource requests detected but no release logic for Activity ID: ${activity.id}`);
            messages.push(ValidationMessages.resourceLeak(activity.id));
        }
    }


    private validateBufferConstraints(
        activity: Activity,
        state: ModelDefinitionState,
        messages: ValidationMessage[]
    ): void {
        this.log(`Validating buffer constraints for Activity ID: ${activity.id}`);

        const relationships = state.activityRelationships.get(activity.id);
        if (!relationships) return;

        const incomingCapacity = Array.from(relationships.incomingConnectors as Set<string>).reduce((total, connectorId) => {
            const connector = state.connections.get(connectorId);
            if (connector) {
                const sourceActivity = state.modelDefinition.activities.get(connector.sourceId);
                if (sourceActivity) {
                    total += sourceActivity.capacity;
                }
            }
            return total;
        }, 0);

        if (incomingCapacity > activity.inputBufferCapacity * 2) {
            this.log(`Activity ID ${activity.id} has insufficient input buffer capacity.`);
            messages.push(ValidationMessages.smallInputBuffer(activity.id));
        }
    }

    private validateActivityInteractions(
        state: ModelDefinitionState,
        messages: ValidationMessage[]
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
                this.detectCycles(activity.id, state, visited, stack, messages);
            }
        });
    }

    private detectCycles(
        activityId: string,
        state: ModelDefinitionState,
        visited: Set<string>,
        stack: Set<string>,
        messages: ValidationMessage[]
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
                        this.detectCycles(targetId, state, visited, stack, messages);
                    } else if (stack.has(targetId)) {
                        this.log(`Circular dependency detected involving Activity ID ${activityId}`);
                        messages.push(ValidationMessages.circularDependency(activityId));
                    }
                }
            });
        }

        stack.delete(activityId);
    }


}

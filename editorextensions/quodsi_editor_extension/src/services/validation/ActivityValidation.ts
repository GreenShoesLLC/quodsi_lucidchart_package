import { ValidationRule } from "./ValidationRule";
import { ValidationMessage, Activity, OperationStep } from "@quodsi/shared";
import { ModelDefinitionState } from "./ModelDefinitionState";
import { ValidationMessages } from "./ValidationMessages";

interface CycleTimeAnalysis {
    totalMinTime: number;
    totalMaxTime: number;
    hasVariableTime: boolean;
}

export class ActivityValidation extends ValidationRule {
    private static readonly MAX_BUFFER_SIZE = 10000;
    private static readonly MIN_CYCLE_TIME = 0.001;
    private static readonly MAX_CYCLE_TIME = 86400; // 24 hours in seconds

    validate(state: ModelDefinitionState, messages: ValidationMessage[]): void {
        const activities = state.modelDefinition.activities.getAll();

        activities.forEach(activity => {
            this.validateActivityConnectivity(activity.id, state, messages);
            this.validateActivityData(activity, messages);
            this.validateOperationSequence(activity, state, messages);
            this.validateCycleTimeAndThroughput(activity, messages);
            this.validateBufferConstraints(activity, state, messages);
        });

        // Validate activity interactions and potential deadlocks
        this.validateActivityInteractions(state, messages);
    }

    private validateActivityConnectivity(
        activityId: string,
        state: ModelDefinitionState,
        messages: ValidationMessage[]
    ): void {
        const relationships = state.activityRelationships.get(activityId);
        if (!relationships) {
            messages.push(ValidationMessages.isolatedElement('Activity', activityId));
            return;
        }

        // Check for isolated activities
        if (relationships.incomingConnectors.size === 0 &&
            relationships.outgoingConnectors.size === 0) {
            messages.push(ValidationMessages.isolatedElement('Activity', activityId));
        }

        // Check for activities with only incoming or only outgoing connections
        if (relationships.incomingConnectors.size === 0 && relationships.outgoingConnectors.size > 0) {
            messages.push(ValidationMessages.noConnections('Activity', activityId, 'incoming'));
        }

        if (relationships.incomingConnectors.size > 0 && relationships.outgoingConnectors.size === 0) {
            messages.push(ValidationMessages.noConnections('Activity', activityId, 'outgoing'));
        }
    }

    private validateActivityData(activity: Activity, messages: ValidationMessage[]): void {
        // Basic property validation
        if (!activity.name?.trim()) {
            messages.push(ValidationMessages.missingName('Activity', activity.id));
        }

        if (typeof activity.capacity !== 'number' || activity.capacity < 1) {
            messages.push(ValidationMessages.invalidCapacity('Activity', activity.id));
        }

        this.validateBufferCapacities(activity, messages);
        this.validateOperationSteps(activity, messages);
    }

    private validateBufferCapacities(
        activity: Activity,
        messages: ValidationMessage[]
    ): void {
        // Input buffer validation
        if (typeof activity.inputBufferCapacity !== 'number' || activity.inputBufferCapacity < 0) {
            messages.push(ValidationMessages.invalidBufferCapacity('Activity', activity.id, 'input'));
        } else if (activity.inputBufferCapacity > ActivityValidation.MAX_BUFFER_SIZE) {
            messages.push(ValidationMessages.largeBufferCapacity('Activity', activity.id, 'input'));
        }

        // Output buffer validation
        if (typeof activity.outputBufferCapacity !== 'number' || activity.outputBufferCapacity < 0) {
            messages.push(ValidationMessages.invalidBufferCapacity('Activity', activity.id, 'output'));
        } else if (activity.outputBufferCapacity > ActivityValidation.MAX_BUFFER_SIZE) {
            messages.push(ValidationMessages.largeBufferCapacity('Activity', activity.id, 'output'));
        }
    }

    private validateOperationSteps(
        activity: Activity,
        messages: ValidationMessage[]
    ): void {
        if (!Array.isArray(activity.operationSteps)) {
            messages.push(ValidationMessages.missingOperationSteps(activity.id));
            return;
        }

        if (activity.operationSteps.length === 0) {
            messages.push(ValidationMessages.noOperationSteps(activity.id));
            return;
        }

        // Validate each operation step
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
        // Duration validation
        if (!step.duration?.durationLength) {
            messages.push(ValidationMessages.invalidStepDuration(activityId, index + 1));
        } else {
            const duration = step.duration.durationLength;
            if (duration < ActivityValidation.MIN_CYCLE_TIME || duration > ActivityValidation.MAX_CYCLE_TIME) {
                messages.push(ValidationMessages.unusualStepDuration(activityId, index + 1, duration));
            }
        }

        // Resource request validation
        if (step.resourceSetRequest?.requests) {
            this.validateResourceRequests(activityId, step.resourceSetRequest.requests, index, messages);
        }
    }

    private validateResourceRequests(
        activityId: string,
        requests: any[],
        stepIndex: number,
        messages: ValidationMessage[]
    ): void {
        const seenResources = new Set<string>();

        requests.forEach(request => {
            if (request.resource?.id) {
                // Check for duplicate resource requests
                if (seenResources.has(request.resource.id)) {
                    messages.push(ValidationMessages.duplicateResourceRequest(activityId, stepIndex + 1));
                }
                seenResources.add(request.resource.id);

                // Validate request quantity
                if (typeof request.quantity !== 'number' || request.quantity < 1) {
                    messages.push(ValidationMessages.invalidResourceQuantity(activityId, stepIndex + 1));
                }
            }
        });
    }

    private validateCycleTimeAndThroughput(
        activity: Activity,
        messages: ValidationMessage[]
    ): void {
        const cycleTime = this.analyzeCycleTime(activity);

        // Check for extremely short cycle times
        if (cycleTime.totalMinTime < ActivityValidation.MIN_CYCLE_TIME) {
            messages.push(ValidationMessages.unusualCycleTime(activity.id, 'short', cycleTime.totalMinTime));
        }

        // Check for extremely long cycle times
        if (cycleTime.totalMaxTime > ActivityValidation.MAX_CYCLE_TIME) {
            messages.push(ValidationMessages.unusualCycleTime(activity.id, 'long', cycleTime.totalMaxTime));
        }

        // Calculate theoretical maximum throughput
        const maxThroughput = activity.capacity / cycleTime.totalMinTime;
        if (maxThroughput * activity.inputBufferCapacity > ActivityValidation.MAX_BUFFER_SIZE) {
            messages.push(ValidationMessages.bufferOverflowRisk(activity.id));
        }
    }

    private analyzeCycleTime(activity: Activity): CycleTimeAnalysis {
        let totalMinTime = 0;
        let totalMaxTime = 0;
        let hasVariableTime = false;

        activity.operationSteps?.forEach(step => {
            if (step.duration?.durationLength) {
                totalMinTime += step.duration.durationLength;
                totalMaxTime += step.duration.durationLength;
            }

            // Check for variable time components
            if (step.duration?.distribution) {
                hasVariableTime = true;
                // Add potential variation to max time
                totalMaxTime += (step.duration.durationLength * 0.5); // Assuming 50% variation
            }
        });

        return {
            totalMinTime,
            totalMaxTime,
            hasVariableTime
        };
    }

    private validateBufferConstraints(
        activity: Activity,
        state: ModelDefinitionState,
        messages: ValidationMessage[]
    ): void {
        const relationships = state.activityRelationships.get(activity.id);
        if (!relationships) return;

        // Calculate total incoming flow capacity
        const incomingCapacity = Array.from(relationships.incomingConnectors).reduce((total, connectorId) => {
            const connector = state.connections.get(connectorId);
            if (connector) {
                const sourceActivity = state.modelDefinition.activities.get(connector.sourceId);
                if (sourceActivity) {
                    total += sourceActivity.capacity;
                }
            }
            return total;
        }, 0);

        // Check if input buffer can handle incoming flow
        if (incomingCapacity > activity.inputBufferCapacity * 2) {
            messages.push(ValidationMessages.smallInputBuffer(activity.id));
        }
    }

    private validateActivityInteractions(
        state: ModelDefinitionState,
        messages: ValidationMessage[]
    ): void {
        const activities = state.modelDefinition.activities.getAll();
        const visited = new Set<string>();
        const stack = new Set<string>();

        // Check for cycles and potential deadlocks
        activities.forEach(activity => {
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
        visited.add(activityId);
        stack.add(activityId);

        const relationships = state.activityRelationships.get(activityId);
        if (relationships) {
            relationships.outgoingConnectors.forEach(connectorId => {
                const connector = state.connections.get(connectorId);
                if (connector) {
                    const targetId = connector.targetId;
                    if (!visited.has(targetId)) {
                        this.detectCycles(targetId, state, visited, stack, messages);
                    } else if (stack.has(targetId)) {
                        messages.push(ValidationMessages.circularDependency(activityId));
                    }
                }
            });
        }

        stack.delete(activityId);
    }

    private validateOperationSequence(
        activity: Activity,
        state: ModelDefinitionState,
        messages: ValidationMessage[]
    ): void {
        if (!activity.operationSteps?.length) return;

        let hasResourceRelease = false;
        let hasResourceRequest = false;

        activity.operationSteps.forEach((step, index) => {
            if (step.resourceSetRequest?.requests?.length) {
                hasResourceRequest = true;
            }
        });

        // Check for resource leaks
        if (hasResourceRequest && !hasResourceRelease) {
            messages.push(ValidationMessages.resourceLeak(activity.id));
        }
    }
}
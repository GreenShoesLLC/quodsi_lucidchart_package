import { ActionType } from './ActionType';

/**
 * Action that captures resource capacity.
 *
 * SeizeAction acquires resources according to a resource requirement.
 * The entity will wait until all required resources are available.
 * Resources remain seized until explicitly released with ReleaseAction.
 *
 * This is the TypeScript equivalent of the Python SeizeAction.
 *
 * Use cases:
 * - Acquiring a workstation before processing
 * - Reserving equipment for multiple operations
 * - Capturing shared resources for a sequence of steps
 */
export interface SeizeAction {
    /**
     * Action type discriminator
     */
    actionType: ActionType.SEIZE;

    /**
     * ID of the ResourceRequirement that defines what resources to seize
     */
    resourceRequirementId: string;
}

/**
 * Creates a SeizeAction
 */
export function createSeizeAction(resourceRequirementId: string): SeizeAction {
    return {
        actionType: ActionType.SEIZE,
        resourceRequirementId
    };
}

/**
 * Type guard for SeizeAction
 */
export function isSeizeAction(action: { actionType: ActionType }): action is SeizeAction {
    return action.actionType === ActionType.SEIZE;
}

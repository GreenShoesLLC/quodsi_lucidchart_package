import { ActionType } from './ActionType';
import { StateCondition } from '../StateCondition';

/**
 * Action that releases previously seized resource capacity.
 *
 * ReleaseAction releases resources that were seized with a matching SeizeAction.
 * The resourceRequirementId should match the one used in the corresponding SeizeAction.
 *
 * This is the TypeScript equivalent of the Python ReleaseAction.
 *
 * Use cases:
 * - Releasing a workstation after processing completes
 * - Freeing equipment for other entities to use
 * - Releasing shared resources after a sequence of steps
 */
export interface ReleaseAction {
    /**
     * Action type discriminator
     */
    actionType: ActionType.RELEASE;

    /**
     * ID of the ResourceRequirement that defines what resources to release
     */
    resourceRequirementId: string;

    /**
     * Optional guard condition — action only executes if condition is met
     */
    stateCondition?: StateCondition | null;
}

/**
 * Creates a ReleaseAction
 */
export function createReleaseAction(resourceRequirementId: string, stateCondition?: StateCondition | null): ReleaseAction {
    return {
        actionType: ActionType.RELEASE,
        resourceRequirementId,
        stateCondition: stateCondition ?? null
    };
}

/**
 * Type guard for ReleaseAction
 */
export function isReleaseAction(action: { actionType: ActionType }): action is ReleaseAction {
    return action.actionType === ActionType.RELEASE;
}

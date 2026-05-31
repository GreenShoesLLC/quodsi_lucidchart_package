import { ActionType } from './ActionType';
import { StateCondition } from '../StateCondition';
import { generateUUID } from '../../../utils/uuidUtils';

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
     * Stable unique identifier for this action instance
     */
    id: string;

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
export function createReleaseAction(resourceRequirementId: string, stateCondition?: StateCondition | null, id?: string): ReleaseAction {
    return {
        id: id ?? generateUUID(),
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

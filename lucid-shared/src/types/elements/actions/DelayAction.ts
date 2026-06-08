import { ActionType } from './ActionType';
import { Duration } from '@quodsi/shared';
import { StateCondition } from '@quodsi/shared';
import { generateUUID } from '../../../utils/uuidUtils';

/**
 * Action that waits for a duration without resource requirements.
 *
 * DelayAction causes the entity to wait for a specified duration.
 * Unlike DelayWithResourceAction, no resources are seized during the delay.
 *
 * This is the TypeScript equivalent of the Python DelayAction.
 *
 * Use cases:
 * - Cooling time after processing
 * - Transit time between locations
 * - Waiting periods that don't require equipment
 */
export interface DelayAction {
    /**
     * Stable unique identifier for this action instance
     */
    id: string;

    /**
     * Action type discriminator
     */
    actionType: ActionType.DELAY;

    /**
     * Duration to wait
     */
    duration: Duration;

    /**
     * Optional guard condition — action only executes if condition is met
     */
    stateCondition?: StateCondition | null;
}

/**
 * Creates a DelayAction
 */
export function createDelayAction(duration: Duration, stateCondition?: StateCondition | null, id?: string): DelayAction {
    return {
        id: id ?? generateUUID(),
        actionType: ActionType.DELAY,
        duration,
        stateCondition: stateCondition ?? null
    };
}

/**
 * Type guard for DelayAction
 */
export function isDelayAction(action: { actionType: ActionType }): action is DelayAction {
    return action.actionType === ActionType.DELAY;
}

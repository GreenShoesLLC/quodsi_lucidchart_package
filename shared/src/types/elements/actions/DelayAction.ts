import { ActionType } from './ActionType';
import { Duration } from '../Duration';

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
     * Action type discriminator
     */
    actionType: ActionType.DELAY;

    /**
     * Duration to wait
     */
    duration: Duration;
}

/**
 * Creates a DelayAction
 */
export function createDelayAction(duration: Duration): DelayAction {
    return {
        actionType: ActionType.DELAY,
        duration
    };
}

/**
 * Type guard for DelayAction
 */
export function isDelayAction(action: { actionType: ActionType }): action is DelayAction {
    return action.actionType === ActionType.DELAY;
}

import { ActionType } from './ActionType';
import { Action } from './Action';
import { StateCondition } from '../StateCondition';

/**
 * Action that repeats a set of actions a specified number of times.
 *
 * LoopAction executes its nested actions repeatedly. The current iteration
 * index (0-based) is available via context.get_loop_index() during execution.
 *
 * This is the TypeScript equivalent of the Python LoopAction.
 *
 * Use cases:
 * - Repeat a delay-assign sequence multiple times
 * - Execute multiple processing cycles
 * - Iterate through a sequence with index-based state modifications
 *
 * Note: Loop index is available during execution:
 * - First iteration: loop_index = 0
 * - Second iteration: loop_index = 1
 * - etc.
 */
export interface LoopAction {
    /**
     * Action type discriminator
     */
    actionType: ActionType.LOOP;

    /**
     * Number of times to repeat the actions
     */
    count: number;

    /**
     * List of actions to repeat
     */
    actions: Action[];

    /**
     * Optional guard condition — action only executes if condition is met
     */
    stateCondition?: StateCondition | null;
}

/**
 * Creates a LoopAction with default values.
 *
 * @param count Number of iterations (default: 1)
 * @param actions Optional list of actions to repeat
 */
export function createLoopAction(
    count: number = 1,
    actions: Action[] = [],
    stateCondition?: StateCondition | null
): LoopAction {
    return {
        actionType: ActionType.LOOP,
        count,
        actions,
        stateCondition: stateCondition ?? null
    };
}

/**
 * Type guard for LoopAction
 */
export function isLoopAction(action: { actionType: ActionType }): action is LoopAction {
    return action.actionType === ActionType.LOOP;
}

import { ActionType } from './ActionType';

/**
 * Action that terminates an entity early, before it reaches the natural exit point.
 *
 * DisposeAction allows entities to be removed from the simulation during
 * processing, useful for:
 * - Quality control (removing defective items)
 * - Conditional termination (patients who leave without treatment)
 * - Resource optimization (canceling low-priority work)
 *
 * This is the TypeScript equivalent of the Python DisposeAction.
 *
 * Use cases:
 * - Remove defective items in a BranchAction
 * - Terminate entities that don't meet criteria
 * - Cancel work items based on conditions
 */
export interface DisposeAction {
    /**
     * Action type discriminator
     */
    actionType: ActionType.DISPOSE;
}

/**
 * Creates a DisposeAction.
 *
 * DisposeAction has no parameters - it simply terminates the entity.
 */
export function createDisposeAction(): DisposeAction {
    return {
        actionType: ActionType.DISPOSE
    };
}

/**
 * Type guard for DisposeAction
 */
export function isDisposeAction(action: { actionType: ActionType }): action is DisposeAction {
    return action.actionType === ActionType.DISPOSE;
}

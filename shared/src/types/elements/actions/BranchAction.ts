import { ActionType } from './ActionType';
import { Action } from './Action';
import { StateCondition } from '../StateCondition';

/**
 * Action that conditionally executes actions based on a state condition.
 *
 * BranchAction evaluates a StateCondition and executes either the ifTrue
 * actions or the ifFalse actions based on the result.
 *
 * This is the TypeScript equivalent of the Python BranchAction.
 *
 * Use cases:
 * - Quality control (remove defective items vs continue processing)
 * - Priority routing (high priority gets fast track)
 * - Conditional delays (different processing times based on type)
 */
export interface BranchAction {
    /**
     * Action type discriminator
     */
    actionType: ActionType.BRANCH;

    /**
     * The StateCondition to evaluate
     */
    condition: StateCondition | null;

    /**
     * Actions to execute if condition evaluates to true
     */
    ifTrue: Action[];

    /**
     * Actions to execute if condition evaluates to false
     */
    ifFalse: Action[];
}

/**
 * Creates a BranchAction with default values.
 *
 * @param options Optional configuration for the branch action
 */
export function createBranchAction(
    options?: Partial<Omit<BranchAction, 'actionType'>>
): BranchAction {
    return {
        actionType: ActionType.BRANCH,
        condition: options?.condition ?? null,
        ifTrue: options?.ifTrue ?? [],
        ifFalse: options?.ifFalse ?? []
    };
}

/**
 * Type guard for BranchAction
 */
export function isBranchAction(action: { actionType: ActionType }): action is BranchAction {
    return action.actionType === ActionType.BRANCH;
}

import { ActionType } from './ActionType';
import { StateModification } from '../StateModification';

/**
 * Action that modifies state values.
 *
 * AssignAction applies a list of state modifications to an entity or model.
 * This is the TypeScript equivalent of the Python AssignAction.
 *
 * Use cases:
 * - Setting entity attributes when entering an activity
 * - Incrementing counters during processing
 * - Recording timestamps or status changes
 */
export interface AssignAction {
    /**
     * Action type discriminator
     */
    actionType: ActionType.ASSIGN;

    /**
     * List of state modifications to apply
     */
    modifications: StateModification[];
}

/**
 * Creates an AssignAction
 */
export function createAssignAction(modifications: StateModification[]): AssignAction {
    return {
        actionType: ActionType.ASSIGN,
        modifications
    };
}

/**
 * Type guard for AssignAction
 */
export function isAssignAction(action: { actionType: ActionType }): action is AssignAction {
    return action.actionType === ActionType.ASSIGN;
}

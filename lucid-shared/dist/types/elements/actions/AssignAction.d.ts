import { ActionType } from './ActionType';
import { StateModification } from '../StateModification';
import { StateCondition } from '../StateCondition';
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
     * Stable unique identifier for this action instance
     */
    id: string;
    /**
     * Action type discriminator
     */
    actionType: ActionType.ASSIGN;
    /**
     * List of state modifications to apply
     */
    modifications: StateModification[];
    /**
     * Optional guard condition — action only executes if condition is met
     */
    stateCondition?: StateCondition | null;
}
/**
 * Creates an AssignAction
 */
export declare function createAssignAction(modifications: StateModification[], stateCondition?: StateCondition | null, id?: string): AssignAction;
/**
 * Type guard for AssignAction
 */
export declare function isAssignAction(action: {
    actionType: ActionType;
}): action is AssignAction;
//# sourceMappingURL=AssignAction.d.ts.map
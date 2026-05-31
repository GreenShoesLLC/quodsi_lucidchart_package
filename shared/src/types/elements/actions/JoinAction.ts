import { ActionType } from './ActionType';
import { StateModification } from '../StateModification';
import { StateCondition } from '../StateCondition';
import { generateUUID } from '../../../utils/uuidUtils';

/**
 * Action that waits for entities with matching state value to join.
 *
 * JoinAction waits for N entities with the same state value to arrive,
 * then combines them into a single entity and routes it to the destination.
 * Original entities are disposed after joining.
 *
 * This is the TypeScript equivalent of the Python JoinAction.
 *
 * IMPORTANT: Both matchState and destinationId are REQUIRED for execution.
 *
 * Use cases:
 * - Rejoining split entities (shirts + pants → completed order)
 * - Assembly operations (parts with same work_order_id)
 * - Batch completion (items with same batch_id)
 */
export interface JoinAction {
    /**
     * Stable unique identifier for this action instance
     */
    id: string;

    /**
     * Action type discriminator
     */
    actionType: ActionType.JOIN;

    /**
     * State name to group entities by (e.g., "order_id") - REQUIRED
     */
    matchState: string | null;

    /**
     * Number of entities to wait for before combining (default: 2)
     */
    joinCount: number;

    /**
     * Template ID for the combined entity (null = use first entity's template)
     */
    combinedTemplateId: string | null;

    /**
     * Activity ID where the combined entity will be routed - REQUIRED
     */
    destinationId: string | null;

    /**
     * State names to copy from first entity to the combined entity
     */
    inheritStates: string[];

    /**
     * State modifications to apply to the combined entity
     */
    modifications: StateModification[];

    /**
     * State name to store the actual number of entities that were joined
     */
    joinCountState: string | null;

    /**
     * Optional guard condition — action only executes if condition is met
     */
    stateCondition?: StateCondition | null;
}

/**
 * Creates a JoinAction with default values.
 *
 * @param options Optional configuration for the join action
 */
export function createJoinAction(
    options?: Partial<Omit<JoinAction, 'actionType' | 'id'>>,
    id?: string
): JoinAction {
    return {
        id: id ?? generateUUID(),
        actionType: ActionType.JOIN,
        matchState: options?.matchState ?? null,
        joinCount: options?.joinCount ?? 2,
        combinedTemplateId: options?.combinedTemplateId ?? null,
        destinationId: options?.destinationId ?? null,
        inheritStates: options?.inheritStates ?? [],
        modifications: options?.modifications ?? [],
        joinCountState: options?.joinCountState ?? null,
        stateCondition: options?.stateCondition ?? null
    };
}

/**
 * Type guard for JoinAction
 */
export function isJoinAction(action: { actionType: ActionType }): action is JoinAction {
    return action.actionType === ActionType.JOIN;
}

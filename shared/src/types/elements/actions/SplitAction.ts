import { ActionType } from './ActionType';
import { StateModification } from '../StateModification';
import { StateCondition } from '../StateCondition';

/**
 * Action that replaces the current entity with N new entities.
 *
 * SplitAction disposes the original entity and creates multiple new entities
 * in its place. Each new entity can inherit states from the original and
 * have a split_index state set to identify which split it is.
 *
 * This is the TypeScript equivalent of the Python SplitAction.
 *
 * IMPORTANT: destinationId is REQUIRED for execution. The engine validates that:
 * - destinationId is set (non-empty)
 * - destinationId is different from the current activity (to prevent infinite loops)
 *
 * Use cases:
 * - Batch splitting: A batch of 10 items splits into 10 individual items
 * - Order splitting: An order splits into multiple shipments
 * - Document splitting: A document splits into pages for parallel processing
 */
export interface SplitAction {
    /**
     * Action type discriminator
     */
    actionType: ActionType.SPLIT;

    /**
     * Number of entities to create (replaces the original)
     */
    count: number;

    /**
     * Template ID for new entities (null = use original's template)
     */
    entityTemplateId: string | null;

    /**
     * Where to route new entities (REQUIRED - must be different from current activity)
     */
    destinationId: string | null;

    /**
     * State names to copy from original entity to each new entity
     */
    inheritStates: string[];

    /**
     * State modifications to apply to each new entity
     */
    modifications: StateModification[];

    /**
     * State name to store the split index (0, 1, 2, ...).
     * If specified, each new entity gets its index stored in this state.
     */
    splitIndexState: string | null;

    /**
     * Optional guard condition — action only executes if condition is met
     */
    stateCondition?: StateCondition | null;
}

/**
 * Creates a SplitAction with default values.
 *
 * @param count Number of entities to create (default: 1)
 * @param options Optional configuration for the split action
 */
export function createSplitAction(
    count: number = 1,
    options?: Partial<Omit<SplitAction, 'actionType' | 'count'>>
): SplitAction {
    return {
        actionType: ActionType.SPLIT,
        count,
        entityTemplateId: options?.entityTemplateId ?? null,
        destinationId: options?.destinationId ?? null,
        inheritStates: options?.inheritStates ?? [],
        modifications: options?.modifications ?? [],
        splitIndexState: options?.splitIndexState ?? null,
        stateCondition: options?.stateCondition ?? null
    };
}

/**
 * Type guard for SplitAction
 */
export function isSplitAction(action: { actionType: ActionType }): action is SplitAction {
    return action.actionType === ActionType.SPLIT;
}

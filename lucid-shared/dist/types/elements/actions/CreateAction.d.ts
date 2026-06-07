import { ActionType } from './ActionType';
import { StateModification } from '../StateModification';
import { StateCondition } from '../StateCondition';
/**
 * Action that creates a new entity while the original continues processing.
 *
 * CreateAction spawns a new entity from a specified template and routes it
 * to a destination activity. The original entity continues its normal flow.
 *
 * This is the TypeScript equivalent of the Python CreateAction.
 *
 * IMPORTANT: Both entityTemplateId and destinationId are REQUIRED for execution.
 *
 * Use cases:
 * - Order processing creates a shipping label entity
 * - Manufacturing creates inspection record for each item
 * - Service creates follow-up ticket entity
 */
export interface CreateAction {
    /**
     * Stable unique identifier for this action instance
     */
    id: string;
    /**
     * Action type discriminator
     */
    actionType: ActionType.CREATE;
    /**
     * Template ID for the new entity (REQUIRED)
     */
    entityTemplateId: string | null;
    /**
     * Activity ID where the new entity will be routed (REQUIRED)
     */
    destinationId: string | null;
    /**
     * State names to copy from parent entity to the new entity
     */
    inheritStates: string[];
    /**
     * State modifications to apply to the new entity
     */
    modifications: StateModification[];
    /**
     * Optional guard condition — action only executes if condition is met
     */
    stateCondition?: StateCondition | null;
}
/**
 * Creates a CreateAction with default values.
 *
 * @param options Optional configuration for the create action
 */
export declare function createCreateAction(options?: Partial<Omit<CreateAction, 'actionType' | 'id'>>, id?: string): CreateAction;
/**
 * Type guard for CreateAction
 */
export declare function isCreateAction(action: {
    actionType: ActionType;
}): action is CreateAction;
//# sourceMappingURL=CreateAction.d.ts.map
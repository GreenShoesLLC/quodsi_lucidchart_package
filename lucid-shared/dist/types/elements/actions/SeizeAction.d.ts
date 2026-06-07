import { ActionType } from './ActionType';
import { StateCondition } from '../StateCondition';
/**
 * Action that captures resource capacity.
 *
 * SeizeAction acquires resources according to a resource requirement.
 * The entity will wait until all required resources are available.
 * Resources remain seized until explicitly released with ReleaseAction.
 *
 * This is the TypeScript equivalent of the Python SeizeAction.
 *
 * Use cases:
 * - Acquiring a workstation before processing
 * - Reserving equipment for multiple operations
 * - Capturing shared resources for a sequence of steps
 */
export interface SeizeAction {
    /**
     * Stable unique identifier for this action instance
     */
    id: string;
    /**
     * Action type discriminator
     */
    actionType: ActionType.SEIZE;
    /**
     * ID of the ResourceRequirement that defines what resources to seize
     */
    resourceRequirementId: string;
    /**
     * Optional guard condition — action only executes if condition is met
     */
    stateCondition?: StateCondition | null;
}
/**
 * Creates a SeizeAction
 */
export declare function createSeizeAction(resourceRequirementId: string, stateCondition?: StateCondition | null, id?: string): SeizeAction;
/**
 * Type guard for SeizeAction
 */
export declare function isSeizeAction(action: {
    actionType: ActionType;
}): action is SeizeAction;
//# sourceMappingURL=SeizeAction.d.ts.map
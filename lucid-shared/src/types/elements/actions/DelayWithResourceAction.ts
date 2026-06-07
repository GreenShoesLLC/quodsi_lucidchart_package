import { ActionType } from './ActionType';
import { Duration } from '../Duration';
import { StateModification } from '../StateModification';
import { StateCondition } from '../StateCondition';
import { generateUUID } from '../../../utils/uuidUtils';

/**
 * Composite action that combines resource seizure with a delay.
 *
 * DelayWithResourceAction is the classic "operation step" pattern:
 * 1. Seize resources (optional)
 * 2. Delay for the specified duration
 * 3. Release resources (unless keepResource is true)
 *
 * This replaces the legacy OperationStep interface and is the TypeScript
 * equivalent of the Python DelayWithResourceAction.
 *
 * Use cases:
 * - Processing time at a workstation
 * - Machine operation with equipment
 * - Any activity that requires holding resources during processing
 */
export interface DelayWithResourceAction {
    /**
     * Stable unique identifier for this action instance
     */
    id: string;

    /**
     * Action type discriminator
     */
    actionType: ActionType.DELAY_WITH_RESOURCE;

    /**
     * ID of the ResourceRequirement that defines what resources to seize.
     * If null, no resources are required (equivalent to a pure delay).
     */
    resourceRequirementId: string | null;

    /**
     * Duration of the delay (while resources are held)
     */
    duration: Duration;

    /**
     * If true, resources are NOT released after the delay.
     * Useful when the same resources are needed for subsequent actions.
     * Default: false (resources are released)
     */
    keepResource?: boolean;

    /**
     * State modifications to apply during this action
     */
    stateModifications?: StateModification[];

    /**
     * Optional guard condition — action only executes if condition is met
     */
    stateCondition?: StateCondition | null;
}

/**
 * Creates a DelayWithResourceAction
 */
export function createDelayWithResourceAction(
    duration: Duration,
    options?: {
        resourceRequirementId?: string | null;
        keepResource?: boolean;
        stateModifications?: StateModification[];
        stateCondition?: StateCondition | null;
    },
    id?: string
): DelayWithResourceAction {
    return {
        id: id ?? generateUUID(),
        actionType: ActionType.DELAY_WITH_RESOURCE,
        duration,
        resourceRequirementId: options?.resourceRequirementId ?? null,
        keepResource: options?.keepResource ?? false,
        stateModifications: options?.stateModifications ?? [],
        stateCondition: options?.stateCondition ?? null
    };
}

/**
 * Type guard for DelayWithResourceAction
 */
export function isDelayWithResourceAction(action: { actionType: ActionType }): action is DelayWithResourceAction {
    return action.actionType === ActionType.DELAY_WITH_RESOURCE;
}

import { AssignAction } from './AssignAction';
import { SeizeAction } from './SeizeAction';
import { ReleaseAction } from './ReleaseAction';
import { DelayAction } from './DelayAction';
import { DelayWithResourceAction } from './DelayWithResourceAction';
import { SplitAction } from './SplitAction';

/**
 * Union type representing all possible actions in the simulation.
 *
 * Actions are the building blocks of entity processing. They form a sequence
 * that defines what happens to an entity at an Activity or Connector.
 *
 * This is a discriminated union - use the `actionType` field to determine
 * which specific action type you're working with.
 *
 * Example:
 * ```typescript
 * function processAction(action: Action) {
 *     switch (action.actionType) {
 *         case ActionType.ASSIGN:
 *             // action is AssignAction
 *             break;
 *         case ActionType.DELAY_WITH_RESOURCE:
 *             // action is DelayWithResourceAction
 *             break;
 *         // ... etc
 *     }
 * }
 * ```
 *
 * This corresponds to the Python Action discriminated union in the simulation engine.
 */
export type Action =
    | AssignAction
    | SeizeAction
    | ReleaseAction
    | DelayAction
    | DelayWithResourceAction
    | SplitAction;

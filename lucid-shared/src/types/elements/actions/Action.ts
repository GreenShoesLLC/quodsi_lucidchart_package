import { AssignAction } from './AssignAction';
import { SeizeAction } from './SeizeAction';
import { ReleaseAction } from './ReleaseAction';
import { DelayAction } from './DelayAction';
import { DelayWithResourceAction } from './DelayWithResourceAction';
import { SplitAction } from './SplitAction';
import { CreateAction } from './CreateAction';
import { DisposeAction } from './DisposeAction';
import { JoinAction } from './JoinAction';
import { LoopAction } from './LoopAction';
import { BranchAction } from './BranchAction';

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
 *         case ActionType.DISPOSE:
 *             // action is DisposeAction
 *             break;
 *         case ActionType.JOIN:
 *             // action is JoinAction
 *             break;
 *         case ActionType.LOOP:
 *             // action is LoopAction
 *             break;
 *         case ActionType.BRANCH:
 *             // action is BranchAction
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
    | SplitAction
    | CreateAction
    | DisposeAction
    | JoinAction
    | LoopAction
    | BranchAction;

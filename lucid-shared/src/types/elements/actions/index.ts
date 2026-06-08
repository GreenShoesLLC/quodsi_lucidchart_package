// Action system exports
// This module provides the Action types that replace the legacy OperationStep system

export * from './ActionType';
export * from './Action';
export * from './AssignAction';
export * from './SeizeAction';
export * from './ReleaseAction';
export * from './DelayAction';
export * from './DelayWithResourceAction';
export * from './SplitAction';
export * from './CreateAction';
export * from './DisposeAction';
export * from './JoinAction';
export * from './LoopAction';
export * from './BranchAction';

// Re-export factory functions for convenience
import { ActionType } from './ActionType';
import { Action } from './Action';
import { createAssignAction } from './AssignAction';
import { createSeizeAction } from './SeizeAction';
import { createReleaseAction } from './ReleaseAction';
import { createDelayAction } from './DelayAction';
import { createDelayWithResourceAction } from './DelayWithResourceAction';
import { createSplitAction } from './SplitAction';
import { createCreateAction } from './CreateAction';
import { createDisposeAction } from './DisposeAction';
import { createJoinAction } from './JoinAction';
import { createLoopAction } from './LoopAction';
import { createBranchAction } from './BranchAction';
import { Duration } from '@quodsi/shared';

/**
 * Create a default action based on action type.
 */
export function createDefaultAction(actionType: ActionType): Action {
    switch (actionType) {
        case ActionType.ASSIGN:
            return createAssignAction([]);
        case ActionType.SEIZE:
            return createSeizeAction("");
        case ActionType.RELEASE:
            return createReleaseAction("");
        case ActionType.DELAY:
            return createDelayAction(new Duration());
        case ActionType.DELAY_WITH_RESOURCE:
            return createDelayWithResourceAction(new Duration());
        case ActionType.SPLIT:
            return createSplitAction(1);
        case ActionType.CREATE:
            return createCreateAction();
        case ActionType.DISPOSE:
            return createDisposeAction();
        case ActionType.JOIN:
            return createJoinAction();
        case ActionType.LOOP:
            return createLoopAction();
        case ActionType.BRANCH:
            return createBranchAction();
        default:
            throw new Error(`Unknown action type: ${actionType}`);
    }
}

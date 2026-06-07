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
import { ActionType } from './ActionType';
import { Action } from './Action';
/**
 * Create a default action based on action type.
 */
export declare function createDefaultAction(actionType: ActionType): Action;
//# sourceMappingURL=index.d.ts.map
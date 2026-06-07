import { ISerializedDuration } from './ISerializedDuration';
/**
 * Discriminator for action types in serialized form
 */
export type SerializedActionType = 'ASSIGN' | 'SEIZE' | 'RELEASE' | 'DELAY' | 'DELAY_WITH_RESOURCE' | 'SPLIT' | 'CREATE' | 'DISPOSE' | 'JOIN' | 'LOOP' | 'BRANCH';
/**
 * Base interface for all serialized actions
 */
export interface ISerializedActionBase {
    /** Stable action identity, carried through to the engine for scenario-change addressing. */
    id?: string;
    actionType: SerializedActionType;
    stateCondition?: any | null;
}
/**
 * Serialized AssignAction
 */
export interface ISerializedAssignAction extends ISerializedActionBase {
    actionType: 'ASSIGN';
    modifications: any[];
}
/**
 * Serialized SeizeAction
 */
export interface ISerializedSeizeAction extends ISerializedActionBase {
    actionType: 'SEIZE';
    resourceRequirementId: string;
}
/**
 * Serialized ReleaseAction
 */
export interface ISerializedReleaseAction extends ISerializedActionBase {
    actionType: 'RELEASE';
    resourceRequirementId: string;
}
/**
 * Serialized DelayAction
 */
export interface ISerializedDelayAction extends ISerializedActionBase {
    actionType: 'DELAY';
    duration: ISerializedDuration;
}
/**
 * Serialized DelayWithResourceAction (replaces OperationStep)
 */
export interface ISerializedDelayWithResourceAction extends ISerializedActionBase {
    actionType: 'DELAY_WITH_RESOURCE';
    resourceRequirementId: string | null;
    duration: ISerializedDuration;
    keepResource?: boolean;
    stateModifications?: any[];
}
/**
 * Serialized SplitAction
 */
export interface ISerializedSplitAction extends ISerializedActionBase {
    actionType: 'SPLIT';
    count: number;
    entityTemplateId: string | null;
    destinationId: string | null;
    inheritStates: string[];
    modifications: any[];
    splitIndexState: string | null;
}
/**
 * Serialized CreateAction
 */
export interface ISerializedCreateAction extends ISerializedActionBase {
    actionType: 'CREATE';
    entityTemplateId: string | null;
    destinationId: string | null;
    inheritStates: string[];
    modifications: any[];
}
/**
 * Serialized DisposeAction
 */
export interface ISerializedDisposeAction extends ISerializedActionBase {
    actionType: 'DISPOSE';
}
/**
 * Serialized JoinAction
 */
export interface ISerializedJoinAction extends ISerializedActionBase {
    actionType: 'JOIN';
    matchState: string | null;
    joinCount: number;
    combinedTemplateId: string | null;
    destinationId: string | null;
    inheritStates: string[];
    modifications: any[];
    joinCountState: string | null;
}
/**
 * Serialized LoopAction
 */
export interface ISerializedLoopAction extends ISerializedActionBase {
    actionType: 'LOOP';
    count: number;
    actions: ISerializedAction[];
}
/**
 * Serialized BranchAction
 */
export interface ISerializedBranchAction extends ISerializedActionBase {
    actionType: 'BRANCH';
    condition: any | null;
    ifTrue: ISerializedAction[];
    ifFalse: ISerializedAction[];
}
/**
 * Union type for all serialized actions
 */
export type ISerializedAction = ISerializedAssignAction | ISerializedSeizeAction | ISerializedReleaseAction | ISerializedDelayAction | ISerializedDelayWithResourceAction | ISerializedSplitAction | ISerializedCreateAction | ISerializedDisposeAction | ISerializedJoinAction | ISerializedLoopAction | ISerializedBranchAction;
//# sourceMappingURL=ISerializedAction.d.ts.map
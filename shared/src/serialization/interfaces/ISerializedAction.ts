import { ISerializedDuration } from './ISerializedDuration';

/**
 * Discriminator for action types in serialized form
 */
export type SerializedActionType =
    | 'ASSIGN'
    | 'SEIZE'
    | 'RELEASE'
    | 'DELAY'
    | 'DELAY_WITH_RESOURCE'
    | 'SPLIT';

/**
 * Base interface for all serialized actions
 */
export interface ISerializedActionBase {
    actionType: SerializedActionType;
}

/**
 * Serialized AssignAction
 */
export interface ISerializedAssignAction extends ISerializedActionBase {
    actionType: 'ASSIGN';
    modifications: any[]; // StateModification[]
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
    stateModifications?: any[]; // StateModification[]
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
    modifications: any[]; // StateModification[]
    splitIndexState: string | null;
}

/**
 * Union type for all serialized actions
 */
export type ISerializedAction =
    | ISerializedAssignAction
    | ISerializedSeizeAction
    | ISerializedReleaseAction
    | ISerializedDelayAction
    | ISerializedDelayWithResourceAction
    | ISerializedSplitAction;

import { EditorReferenceData } from './EditorReferenceData';
import { SimulationObjectType } from './elements/SimulationObjectType';
import { SelectionState } from './SelectionState';
import { ValidationResult } from './ValidationTypes';
import { ModelStructure } from './accordion/ModelStructure';

export enum MessageTypes {
    // React App Lifecycle
    REACT_APP_READY = 'reactAppReady',
    INITIAL_STATE = 'initialState',

    // Selection Management
    SELECTION_CHANGED = 'selectionChanged',

    // Model Conversion
    CONVERT_PAGE = 'convertPage',
    CONVERSION_STARTED = 'conversionStarted',
    CONVERSION_COMPLETE = 'conversionComplete',
    CONVERSION_ERROR = 'conversionError',

    // Element Data Operations
    GET_ELEMENT_DATA = 'getElementData',
    ELEMENT_DATA = 'elementData',
    UPDATE_ELEMENT_DATA = 'updateElementData',
    UPDATE_SUCCESS = 'updateSuccess',

    // Model Validation
    VALIDATE_MODEL = 'validateModel',
    VALIDATION_RESULT = 'validationResult',

    // Error Handling
    ERROR = 'error',

    // Model Operations
    MODEL_SAVED = 'modelSaved',
    MODEL_LOADED = 'modelLoaded',
    REMOVE_MODEL = 'removeModel',
    MODEL_REMOVED = 'modelRemoved',
    SIMULATE_MODEL = 'simulateModel',

    // Component Operations
    ACTIVITY_SAVED = 'activitySaved',
    CONNECTOR_SAVED = 'connectorSaved',
    ENTITY_SAVED = 'entitySaved',
    GENERATOR_SAVED = 'generatorSaved',
    RESOURCE_SAVED = 'resourceSaved',

    // Tree View State Management
    TREE_STATE_UPDATE = 'treeStateUpdate',
    TREE_NODE_TOGGLE = 'treeNodeToggle',
    TREE_NODE_EXPAND_PATH = 'treeNodeExpandPath',
    TREE_STATE_SYNC = 'treeStateSync'
}

/**
 * Message payload type definitions
 */
export interface MessagePayloads {
    [MessageTypes.REACT_APP_READY]: undefined;

    [MessageTypes.INITIAL_STATE]: {
        isModel: boolean;
        pageId: string;
        documentId: string;
        canConvert: boolean;
        modelData: any | null;
        selectionState: SelectionState;
        modelStructure?: ModelStructure;
        expandedNodes?: string[];
    };

    [MessageTypes.SELECTION_CHANGED]: {
        selectionState: SelectionState;
        elementData?: any[];
        modelStructure?: ModelStructure;
        expandedNodes?: string[];
    };

    [MessageTypes.CONVERT_PAGE]: undefined;

    [MessageTypes.CONVERSION_STARTED]: undefined;

    [MessageTypes.CONVERSION_COMPLETE]: {
        success: boolean;
        modelId: string;
        elementCount: {
            activities: number;
            generators: number;
            resources: number;
            connectors: number;
        };
    };

    [MessageTypes.CONVERSION_ERROR]: {
        error: string;
    };

    [MessageTypes.GET_ELEMENT_DATA]: {
        elementId: string;
    };

    [MessageTypes.ELEMENT_DATA]: {
        id: string;
        data: any;
        metadata: any;
        referenceData: EditorReferenceData;
    };

    [MessageTypes.UPDATE_ELEMENT_DATA]: {
        elementId: string;
        data: any;
        type: SimulationObjectType;
    };

    [MessageTypes.UPDATE_SUCCESS]: {
        elementId: string;
    };

    [MessageTypes.VALIDATE_MODEL]: undefined;
    [MessageTypes.REMOVE_MODEL]: undefined;
    [MessageTypes.MODEL_REMOVED]: undefined;
    [MessageTypes.SIMULATE_MODEL]: undefined;

    [MessageTypes.VALIDATION_RESULT]: ValidationResult;

    [MessageTypes.ERROR]: {
        error: string;
        details?: any;
    };

    [MessageTypes.MODEL_SAVED]: {
        modelId: string;
        data: any;
    };

    [MessageTypes.MODEL_LOADED]: {
        modelId: string;
        data: any;
    };

    [MessageTypes.ACTIVITY_SAVED]: {
        elementId: string;
        data: any;
    };

    [MessageTypes.CONNECTOR_SAVED]: {
        elementId: string;
        data: any;
    };

    [MessageTypes.ENTITY_SAVED]: {
        elementId: string;
        data: any;
    };

    [MessageTypes.GENERATOR_SAVED]: {
        elementId: string;
        data: any;
    };

    [MessageTypes.RESOURCE_SAVED]: {
        elementId: string;
        data: any;
    };

    // Tree View State Management Payloads
    [MessageTypes.TREE_STATE_UPDATE]: {
        expandedNodes: string[];
        pageId: string;
    };

    [MessageTypes.TREE_NODE_TOGGLE]: {
        nodeId: string;
        expanded: boolean;
        pageId: string;
    };

    [MessageTypes.TREE_NODE_EXPAND_PATH]: {
        nodeId: string;
        pageId: string;
    };

    [MessageTypes.TREE_STATE_SYNC]: {
        expandedNodes: string[];
        pageId: string;
    };
}

/**
 * Type-safe message creator function
 */
export function createSerializableMessage<T extends MessageTypes>(
    type: T,
    payload?: MessagePayloads[T]
): { [key: string]: any } {
    return {
        messagetype: type,
        data: payload ?? null
    };
}

/**
 * Type guard to check if a message is valid
 */
export function isValidMessage(message: any): message is { messagetype: MessageTypes; data: any } {
    return message
        && typeof message === 'object'
        && 'messagetype' in message
        && Object.values(MessageTypes).includes(message.messagetype);
}

/**
 * Helper to extract payload type from message type
 */
export type PayloadType<T extends MessageTypes> = MessagePayloads[T];
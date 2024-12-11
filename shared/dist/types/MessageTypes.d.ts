export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonSerializable[];
export type JsonObject = {
    [key: string]: JsonSerializable;
};
export type JsonSerializable = JsonPrimitive | JsonObject | JsonArray;
import { EditorReferenceData } from './EditorReferenceData';
import { SimulationObjectType } from './elements/SimulationObjectType';
import { SelectionState } from './SelectionState';
import { ValidationResult } from './ValidationTypes';
import { ModelStructure } from './accordion/ModelStructure';
export declare enum MessageTypes {
    REACT_APP_READY = "reactAppReady",
    INITIAL_STATE = "initialState",
    SELECTION_CHANGED = "selectionChanged",
    CONVERT_PAGE = "convertPage",
    CONVERSION_STARTED = "conversionStarted",
    CONVERSION_COMPLETE = "conversionComplete",
    CONVERSION_ERROR = "conversionError",
    GET_ELEMENT_DATA = "getElementData",
    ELEMENT_DATA = "elementData",
    UPDATE_ELEMENT_DATA = "updateElementData",
    UPDATE_SUCCESS = "updateSuccess",
    VALIDATE_MODEL = "validateModel",
    VALIDATION_RESULT = "validationResult",
    ERROR = "error",
    MODEL_SAVED = "modelSaved",
    MODEL_LOADED = "modelLoaded",
    REMOVE_MODEL = "removeModel",
    MODEL_REMOVED = "modelRemoved",
    SIMULATE_MODEL = "simulateModel",
    ACTIVITY_SAVED = "activitySaved",
    CONNECTOR_SAVED = "connectorSaved",
    ENTITY_SAVED = "entitySaved",
    GENERATOR_SAVED = "generatorSaved",
    RESOURCE_SAVED = "resourceSaved",
    TREE_STATE_UPDATE = "treeStateUpdate",
    TREE_NODE_TOGGLE = "treeNodeToggle",
    TREE_NODE_EXPAND_PATH = "treeNodeExpandPath",
    TREE_STATE_SYNC = "treeStateSync"
}
export interface ElementData {
    id: string;
    data: JsonObject;
    metadata: {
        type: SimulationObjectType;
        version: string;
    };
    name: string | null;
}
export interface ModelData extends JsonObject {
    name: string;
}
/**
 * Message payload type definitions - All payloads must be JSON-serializable
 */
export interface MessagePayloads {
    [MessageTypes.REACT_APP_READY]: undefined;
    [MessageTypes.INITIAL_STATE]: {
        isModel: boolean;
        pageId: string;
        documentId: string;
        canConvert: boolean;
        modelData: JsonSerializable | null;
        selectionState: SelectionState;
        modelStructure?: ModelStructure;
        expandedNodes?: string[];
    };
    [MessageTypes.SELECTION_CHANGED]: {
        selectionState: SelectionState;
        elementData?: ElementData[];
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
        data: JsonSerializable;
        metadata: JsonSerializable;
        referenceData: EditorReferenceData;
    };
    [MessageTypes.UPDATE_ELEMENT_DATA]: {
        elementId: string;
        data: JsonSerializable;
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
        details?: JsonSerializable;
    };
    [MessageTypes.MODEL_SAVED]: {
        modelId: string;
        data: JsonSerializable;
    };
    [MessageTypes.MODEL_LOADED]: {
        modelId: string;
        data: JsonSerializable;
    };
    [MessageTypes.ACTIVITY_SAVED]: {
        elementId: string;
        data: JsonSerializable;
    };
    [MessageTypes.CONNECTOR_SAVED]: {
        elementId: string;
        data: JsonSerializable;
    };
    [MessageTypes.ENTITY_SAVED]: {
        elementId: string;
        data: JsonSerializable;
    };
    [MessageTypes.GENERATOR_SAVED]: {
        elementId: string;
        data: JsonSerializable;
    };
    [MessageTypes.RESOURCE_SAVED]: {
        elementId: string;
        data: JsonSerializable;
    };
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
 * Creates a serializable message. At runtime, enums will serialize to their string values.
 */
export declare function createSerializableMessage<T extends MessageTypes>(type: T, payload?: MessagePayloads[T]): JsonObject;
/**
 * Type guard to check if a message is valid
 */
export declare function isValidMessage(message: any): message is {
    messagetype: MessageTypes;
    data: JsonSerializable;
};
/**
 * Helper to extract payload type from message type
 */
export type PayloadType<T extends MessageTypes> = MessagePayloads[T];
export {};
//# sourceMappingURL=MessageTypes.d.ts.map
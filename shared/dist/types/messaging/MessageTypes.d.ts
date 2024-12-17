import { AppLifecyclePayloads } from './payloads/AppLifecyclePayloads';
import { ModelPayloads } from './payloads/ModelPayloads';
import { ModelItemPayloads } from './payloads/ModelItemPayloads';
import { ValidationPayloads } from './payloads/ValidationPayloads';
import { ModelTreePayloads } from './payloads/ModelTreePayloads';
import { SelectionPayloads } from './payloads';
export declare enum MessageTypes {
    REACT_APP_READY = "reactAppReady",
    INITIAL_STATE = "initialState",
    SELECTION_CHANGED = "selectionChanged",
    SELECTION_CHANGED_PAGE_NO_MODEL = "selectionPageNoModel",
    SELECTION_CHANGED_PAGE_WITH_MODEL = "selectionPageWithModel",
    SELECTION_CHANGED_SIMULATION_OBJECT = "selectionSimObject",
    SELECTION_CHANGED_MULTIPLE = "selectionMultiple",
    SELECTION_CHANGED_UNCONVERTED = "selectionUnconverted",
    CONVERT_PAGE = "convertPage",
    CONVERSION_STARTED = "conversionStarted",
    CONVERSION_COMPLETE = "conversionComplete",
    CONVERSION_ERROR = "conversionError",
    GET_ELEMENT_DATA = "getElementData",
    ELEMENT_DATA = "elementData",
    UPDATE_ELEMENT_DATA = "updateElementData",
    UPDATE_SUCCESS = "updateSuccess",
    CONVERT_ELEMENT = "convertElement",
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
export interface MessagePayloads extends AppLifecyclePayloads, SelectionPayloads, ModelPayloads, ModelItemPayloads, ValidationPayloads, ModelTreePayloads {
}
export type Message<T extends MessageTypes> = {
    messagetype: T;
    data: MessagePayloads[T];
};
//# sourceMappingURL=MessageTypes.d.ts.map
import { AppLifecyclePayloads } from './payloads/AppLifecyclePayloads';
import { ModelPayloads } from './payloads/ModelPayloads';
import { ModelItemPayloads } from './payloads/ModelItemPayloads';
import { ValidationPayloads } from './payloads/ValidationPayloads';
import { ModelTreePayloads } from './payloads/ModelTreePayloads';
import { SelectionPayloads } from './payloads';
export declare enum MessageTypes {
    REACT_APP_READY = "reactAppReady",
    SELECTION_CHANGED_PAGE_NO_MODEL = "selectionPageNoModel",
    SELECTION_CHANGED_PAGE_WITH_MODEL = "selectionPageWithModel",
    SELECTION_CHANGED_SIMULATION_OBJECT = "selectionSimObject",
    SELECTION_CHANGED_MULTIPLE = "selectionMultiple",
    SELECTION_CHANGED_UNCONVERTED = "selectionUnconverted",
    CONVERT_PAGE = "convertPage",
    CONVERSION_ERROR = "conversionError",
    GET_ELEMENT_DATA = "getElementData",
    UPDATE_ELEMENT_DATA = "updateElementData",
    UPDATE_SUCCESS = "updateSuccess",
    CONVERT_ELEMENT = "convertElement",
    VALIDATE_MODEL = "validateModel",
    VALIDATION_RESULT = "validationResult",
    ERROR = "error",
    REMOVE_MODEL = "removeModel",
    MODEL_REMOVED = "modelRemoved",
    SIMULATE_MODEL = "simulateModel",
    SIMULATION_STARTED = "SIMULATION_STARTED",
    SIMULATION_STATUS_UPDATE = "SIMULATION_STATUS_UPDATE",
    SIMULATION_STATUS_CHECK = "SIMULATION_STATUS_CHECK",
    SIMULATION_STATUS_ERROR = "SIMULATION_STATUS_ERROR",
    OUTPUT_CREATE_PAGE = "outputCreatePage",
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
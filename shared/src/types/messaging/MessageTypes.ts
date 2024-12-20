import { AppLifecyclePayloads } from './payloads/AppLifecyclePayloads';
import { ModelPayloads } from './payloads/ModelPayloads';
import { ModelItemPayloads } from './payloads/ModelItemPayloads';
import { ValidationPayloads } from './payloads/ValidationPayloads';
import { ModelTreePayloads } from './payloads/ModelTreePayloads';
import { SelectionPayloads } from './payloads';

export enum MessageTypes {
    // React App Lifecycle
    REACT_APP_READY = 'reactAppReady',

    // Selection Management
    SELECTION_CHANGED_PAGE_NO_MODEL = 'selectionPageNoModel',     // Page selected, no model exists
    SELECTION_CHANGED_PAGE_WITH_MODEL = 'selectionPageWithModel',   // Page selected, has model
    SELECTION_CHANGED_SIMULATION_OBJECT = 'selectionSimObject', // Single simulation object selected
    SELECTION_CHANGED_MULTIPLE = 'selectionMultiple',         // Multiple items selected
    SELECTION_CHANGED_UNCONVERTED = 'selectionUnconverted',      // Unconverted element selected

    // Model Conversion
    CONVERT_PAGE = 'convertPage',

    CONVERSION_ERROR = 'conversionError',

    // Element Data Operations
    GET_ELEMENT_DATA = 'getElementData',
    UPDATE_ELEMENT_DATA = 'updateElementData', //used in quodsi editors
    UPDATE_SUCCESS = 'updateSuccess',
    CONVERT_ELEMENT = 'convertElement',

    // Model Validation
    VALIDATE_MODEL = 'validateModel',
    VALIDATION_RESULT = 'validationResult',

    // Error Handling
    ERROR = 'error',

    // Model Operations
    REMOVE_MODEL = 'removeModel',
    MODEL_REMOVED = 'modelRemoved',
    SIMULATE_MODEL = 'simulateModel',
    SIMULATION_STARTED = 'SIMULATION_STARTED',
    SIMULATION_STATUS_UPDATE = 'SIMULATION_STATUS_UPDATE',
    SIMULATION_STATUS_CHECK = 'SIMULATION_STATUS_CHECK',
    SIMULATION_STATUS_ERROR = 'SIMULATION_STATUS_ERROR',

    // Tree View State Management
    TREE_STATE_UPDATE = 'treeStateUpdate',
    TREE_NODE_TOGGLE = 'treeNodeToggle',
    TREE_NODE_EXPAND_PATH = 'treeNodeExpandPath',
    TREE_STATE_SYNC = 'treeStateSync',
}

export interface MessagePayloads extends
    AppLifecyclePayloads,
    SelectionPayloads,
    ModelPayloads,
    ModelItemPayloads,
    ValidationPayloads,
    ModelTreePayloads { }

export type Message<T extends MessageTypes> = {
    messagetype: T;
    data: MessagePayloads[T];
};

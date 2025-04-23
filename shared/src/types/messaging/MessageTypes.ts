import { AppLifecyclePayloads } from './payloads/AppLifecyclePayloads';
import { ModelPayloads } from './payloads/ModelPayloads';
import { ModelItemPayloads } from './payloads/ModelItemPayloads';
import { ValidationPayloads } from './payloads/ValidationPayloads';
import { SelectionPayloads } from './payloads';
import { AuthPayloads } from './payloads/AuthPayloads';

export enum MessageTypes {
    // React App Lifecycle
    REACT_APP_READY = 'reactAppReady',
    
    // Authentication
    AUTH_PANEL_INIT = 'authPanelInit',
    AUTH_STATUS_REQUEST = 'authStatusRequest',
    AUTH_STATUS_RESPONSE = 'authStatusResponse',
    AUTH_SIGN_IN = 'authSignIn',
    AUTH_SIGN_OUT = 'authSignOut',
    AUTH_COMPLETED = 'authCompleted',
    AUTH_ERROR = 'authError',
    SHOW_AUTH_PANEL = 'SHOW_AUTH_PANEL',
    MODEL_PANEL_FOCUS = 'model_panel_focus',

    // Selection Management
    // SELECTION_CHANGED_PAGE_NO_MODEL = 'selectionPageNoModel',
    // SELECTION_CHANGED_PAGE_WITH_MODEL = 'selectionPageWithModel',
    // SELECTION_CHANGED_SIMULATION_OBJECT = 'selectionSimObject',
    // SELECTION_CHANGED_MULTIPLE = 'selectionMultiple',
    // SELECTION_CHANGED_UNCONVERTED = 'selectionUnconverted',

    SELECTION_CHANGED = 'selectionChanged',

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
    OUTPUT_CREATE_PAGE = 'outputCreatePage',
    
    // Simulation Results Management
    MARK_RESULTS_VIEWED = 'markResultsViewed',
    SIMULATION_RESULTS_ACKNOWLEDGED = 'simulationResultsAcknowledged',
    VIEW_SIMULATION_RESULTS = 'viewSimulationResults'
}

export interface MessagePayloads extends
    AppLifecyclePayloads,
    SelectionPayloads,
    ModelPayloads,
    ModelItemPayloads,
    ValidationPayloads,
    AuthPayloads { }

export type Message<T extends MessageTypes> = {
    messagetype: T;
    data: MessagePayloads[T];
};

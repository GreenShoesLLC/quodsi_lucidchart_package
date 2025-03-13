"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageTypes = void 0;
var MessageTypes;
(function (MessageTypes) {
    // React App Lifecycle
    MessageTypes["REACT_APP_READY"] = "reactAppReady";
    // Selection Management
    MessageTypes["SELECTION_CHANGED_PAGE_NO_MODEL"] = "selectionPageNoModel";
    MessageTypes["SELECTION_CHANGED_PAGE_WITH_MODEL"] = "selectionPageWithModel";
    MessageTypes["SELECTION_CHANGED_SIMULATION_OBJECT"] = "selectionSimObject";
    MessageTypes["SELECTION_CHANGED_MULTIPLE"] = "selectionMultiple";
    MessageTypes["SELECTION_CHANGED_UNCONVERTED"] = "selectionUnconverted";
    // Model Conversion
    MessageTypes["CONVERT_PAGE"] = "convertPage";
    MessageTypes["CONVERSION_ERROR"] = "conversionError";
    // Element Data Operations
    MessageTypes["GET_ELEMENT_DATA"] = "getElementData";
    MessageTypes["UPDATE_ELEMENT_DATA"] = "updateElementData";
    MessageTypes["UPDATE_SUCCESS"] = "updateSuccess";
    MessageTypes["CONVERT_ELEMENT"] = "convertElement";
    // Model Validation
    MessageTypes["VALIDATE_MODEL"] = "validateModel";
    MessageTypes["VALIDATION_RESULT"] = "validationResult";
    // Error Handling
    MessageTypes["ERROR"] = "error";
    // Model Operations
    MessageTypes["REMOVE_MODEL"] = "removeModel";
    MessageTypes["MODEL_REMOVED"] = "modelRemoved";
    MessageTypes["SIMULATE_MODEL"] = "simulateModel";
    MessageTypes["SIMULATION_STARTED"] = "SIMULATION_STARTED";
    MessageTypes["SIMULATION_STATUS_UPDATE"] = "SIMULATION_STATUS_UPDATE";
    MessageTypes["SIMULATION_STATUS_CHECK"] = "SIMULATION_STATUS_CHECK";
    MessageTypes["SIMULATION_STATUS_ERROR"] = "SIMULATION_STATUS_ERROR";
    MessageTypes["OUTPUT_CREATE_PAGE"] = "outputCreatePage";
    // Tree View State Management
    MessageTypes["TREE_STATE_UPDATE"] = "treeStateUpdate";
    MessageTypes["TREE_NODE_TOGGLE"] = "treeNodeToggle";
    MessageTypes["TREE_NODE_EXPAND_PATH"] = "treeNodeExpandPath";
    MessageTypes["TREE_STATE_SYNC"] = "treeStateSync";
    // Simulation Results Management
    MessageTypes["MARK_RESULTS_VIEWED"] = "markResultsViewed";
    MessageTypes["SIMULATION_RESULTS_ACKNOWLEDGED"] = "simulationResultsAcknowledged";
    MessageTypes["VIEW_SIMULATION_RESULTS"] = "viewSimulationResults";
})(MessageTypes = exports.MessageTypes || (exports.MessageTypes = {}));

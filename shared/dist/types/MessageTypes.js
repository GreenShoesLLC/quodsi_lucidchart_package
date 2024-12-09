"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidMessage = exports.createSerializableMessage = exports.MessageTypes = void 0;
var MessageTypes;
(function (MessageTypes) {
    // React App Lifecycle
    MessageTypes["REACT_APP_READY"] = "reactAppReady";
    MessageTypes["INITIAL_STATE"] = "initialState";
    // Selection Management
    MessageTypes["SELECTION_CHANGED"] = "selectionChanged";
    // Model Conversion
    MessageTypes["CONVERT_PAGE"] = "convertPage";
    MessageTypes["CONVERSION_STARTED"] = "conversionStarted";
    MessageTypes["CONVERSION_COMPLETE"] = "conversionComplete";
    MessageTypes["CONVERSION_ERROR"] = "conversionError";
    // Element Data Operations
    MessageTypes["GET_ELEMENT_DATA"] = "getElementData";
    MessageTypes["ELEMENT_DATA"] = "elementData";
    MessageTypes["UPDATE_ELEMENT_DATA"] = "updateElementData";
    MessageTypes["UPDATE_SUCCESS"] = "updateSuccess";
    // Model Validation
    MessageTypes["VALIDATE_MODEL"] = "validateModel";
    MessageTypes["VALIDATION_RESULT"] = "validationResult";
    // Error Handling
    MessageTypes["ERROR"] = "error";
    // Model Operations
    MessageTypes["MODEL_SAVED"] = "modelSaved";
    MessageTypes["MODEL_LOADED"] = "modelLoaded";
    MessageTypes["REMOVE_MODEL"] = "removeModel";
    MessageTypes["MODEL_REMOVED"] = "modelRemoved";
    MessageTypes["SIMULATE_MODEL"] = "simulateModel";
    // Component Operations
    MessageTypes["ACTIVITY_SAVED"] = "activitySaved";
    MessageTypes["CONNECTOR_SAVED"] = "connectorSaved";
    MessageTypes["ENTITY_SAVED"] = "entitySaved";
    MessageTypes["GENERATOR_SAVED"] = "generatorSaved";
    MessageTypes["RESOURCE_SAVED"] = "resourceSaved";
    // Tree View State Management
    MessageTypes["TREE_STATE_UPDATE"] = "treeStateUpdate";
    MessageTypes["TREE_NODE_TOGGLE"] = "treeNodeToggle";
    MessageTypes["TREE_NODE_EXPAND_PATH"] = "treeNodeExpandPath";
    MessageTypes["TREE_STATE_SYNC"] = "treeStateSync";
})(MessageTypes = exports.MessageTypes || (exports.MessageTypes = {}));
/**
 * Type-safe message creator function
 */
function createSerializableMessage(type, payload) {
    return {
        messagetype: type,
        data: payload !== null && payload !== void 0 ? payload : null
    };
}
exports.createSerializableMessage = createSerializableMessage;
/**
 * Type guard to check if a message is valid
 */
function isValidMessage(message) {
    return message
        && typeof message === 'object'
        && 'messagetype' in message
        && Object.values(MessageTypes).includes(message.messagetype);
}
exports.isValidMessage = isValidMessage;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageTypes = void 0;
var MessageTypes;
(function (MessageTypes) {
    // React App Lifecycle
    MessageTypes["REACT_APP_READY"] = "reactAppReady";
    MessageTypes["AUTH"] = "auth";
    MessageTypes["SELECTION_CHANGED"] = "selectionChanged";
    // New Action Message Types
    MessageTypes["ACTION_REQUEST"] = "actionRequest";
    MessageTypes["ACTION_RESPONSE"] = "actionResponse";
    MessageTypes["VALIDATION_RESULT"] = "validationResult";
})(MessageTypes = exports.MessageTypes || (exports.MessageTypes = {}));

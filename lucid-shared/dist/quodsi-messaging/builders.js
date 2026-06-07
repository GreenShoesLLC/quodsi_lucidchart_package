"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEntitlementsStatusMessage = exports.createModelRunStatusMessage = exports.createModelRunRequestMessage = exports.createAuthStatusMessage = exports.createAuthLogoutMessage = exports.createAuthLoginSuccessMessage = exports.createLogMessage = exports.createErrorMessage = exports.createReactAppReadyMessage = exports.createBaseMessage = void 0;
var uuidUtils_1 = require("../utils/uuidUtils");
var index_1 = require("./index");
/**
 * Create a base message envelope with standard fields
 *
 * @param type Message type
 * @param source Message source
 * @param target Message target
 * @param data Message payload
 * @returns A properly formatted message envelope
 */
function createBaseMessage(type, source, target, data) {
    return {
        id: (0, uuidUtils_1.generateUUID)(),
        type: type,
        source: source,
        target: target,
        version: '1.0',
        data: data
    };
}
exports.createBaseMessage = createBaseMessage;
// Framework message builders
/**
 * Create a REACT_APP_READY message
 *
 * @param panel Panel type (auth or model)
 * @param isAuthenticated Authentication status
 * @param user Optional user info
 * @returns A properly formatted REACT_APP_READY message
 */
function createReactAppReadyMessage(panel, isAuthenticated, user) {
    return createBaseMessage(index_1.EnvelopeMessageType.REACT_APP_READY, panel === 'auth' ? 'auth-iframe' : 'model-iframe', 'host', { panel: panel, isAuthenticated: isAuthenticated, user: user });
}
exports.createReactAppReadyMessage = createReactAppReadyMessage;
/**
 * Create an ERROR message
 *
 * @param source Message source
 * @param code Error code
 * @param message Error message
 * @param id Optional correlation ID
 * @returns A properly formatted ERROR message
 */
function createErrorMessage(source, code, message, id) {
    return createBaseMessage(index_1.EnvelopeMessageType.ERROR, source, 'host', { code: code, message: message, id: id });
}
exports.createErrorMessage = createErrorMessage;
/**
 * Create a LOG message (development only)
 *
 * @param source Message source
 * @param level Log level
 * @param text Log text
 * @returns A properly formatted LOG message
 */
function createLogMessage(source, level, text) {
    return createBaseMessage(index_1.EnvelopeMessageType.LOG, source, 'host', { level: level, text: text });
}
exports.createLogMessage = createLogMessage;
// Auth message builders
/**
 * Create an AUTH_LOGIN_SUCCESS message
 *
 * @param idToken JWT token from authentication
 * @param user User information
 * @param newUser Flag indicating if this is a new user
 * @returns A properly formatted AUTH_LOGIN_SUCCESS message
 */
function createAuthLoginSuccessMessage(idToken, user, newUser) {
    return createBaseMessage(index_1.EnvelopeMessageType.AUTH_LOGIN_SUCCESS, 'auth-iframe', 'host', { idToken: idToken, user: user, newUser: newUser });
}
exports.createAuthLoginSuccessMessage = createAuthLoginSuccessMessage;
/**
 * Create an AUTH_LOGOUT message
 *
 * @returns A properly formatted AUTH_LOGOUT message
 */
function createAuthLogoutMessage() {
    return createBaseMessage(index_1.EnvelopeMessageType.AUTH_LOGOUT, 'auth-iframe', 'host', {});
}
exports.createAuthLogoutMessage = createAuthLogoutMessage;
/**
 * Create an AUTH_STATUS message
 *
 * @param isAuthenticated Authentication status
 * @param user Optional user info if authenticated
 * @returns A properly formatted AUTH_STATUS message
 */
function createAuthStatusMessage(isAuthenticated, user) {
    return createBaseMessage(index_1.EnvelopeMessageType.AUTH_STATUS, 'host', 'broadcast', { isAuthenticated: isAuthenticated, user: user });
}
exports.createAuthStatusMessage = createAuthStatusMessage;
// Simulation message builders
/**
 * Create a MODEL_RUN_REQUEST message
 *
 * @param documentId Document ID to simulate
 * @param scenarioName Optional scenario name
 * @param durationDays Optional duration in days
 * @param repetitions Optional number of repetitions
 * @param parameters Additional parameters
 * @returns A properly formatted MODEL_RUN_REQUEST message
 */
function createModelRunRequestMessage(documentId, scenarioName, durationDays, repetitions, parameters) {
    return createBaseMessage(index_1.EnvelopeMessageType.MODEL_RUN_REQUEST, 'model-iframe', 'host', { documentId: documentId, scenarioName: scenarioName, durationDays: durationDays, repetitions: repetitions, parameters: parameters });
}
exports.createModelRunRequestMessage = createModelRunRequestMessage;
/**
 * Create a MODEL_RUN_STATUS message
 *
 * @param jobId Job ID
 * @param documentId Document ID
 * @param scenarioId Scenario ID
 * @param scenarioName Scenario name
 * @param status Current status
 * @param progress Progress percentage (0-100)
 * @param lastChecked ISO timestamp of last status check
 * @param queuedAt ISO timestamp when job was queued
 * @param currentStep Optional description of current step
 * @param error Optional error message if status is FAILED
 * @param resultUrl Optional result URL if status is COMPLETED
 * @returns A properly formatted MODEL_RUN_STATUS message
 */
function createModelRunStatusMessage(jobId, documentId, scenarioId, scenarioName, status, progress, lastChecked, queuedAt, currentStep, error, resultUrl) {
    return createBaseMessage(index_1.EnvelopeMessageType.MODEL_RUN_STATUS, 'host', 'model-iframe', { jobId: jobId, documentId: documentId, scenarioId: scenarioId, scenarioName: scenarioName, status: status, progress: progress, lastChecked: lastChecked, queuedAt: queuedAt, currentStep: currentStep, error: error, resultUrl: resultUrl });
}
exports.createModelRunStatusMessage = createModelRunStatusMessage;
// Entitlements
/**
 * Create an ENTITLEMENTS_STATUS message from the /me/entitlements response.
 * Broadcast to the React panel after login and after any refresh so the UI
 * can gate paid features and show plan/trial badges.
 */
function createEntitlementsStatusMessage(data) {
    return createBaseMessage(index_1.EnvelopeMessageType.ENTITLEMENTS_STATUS, 'host', 'model-iframe', data);
}
exports.createEntitlementsStatusMessage = createEntitlementsStatusMessage;
// Add other category builders as needed...

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasRequiredDataFields = exports.isForTarget = exports.isFromSource = exports.createMessageTypeGuard = void 0;
/**
 * Type guard factory that creates a specialized type guard for a specific message type.
 *
 * @param type The message type to check for
 * @returns A type guard function checking if the message matches the specified type
 */
function createMessageTypeGuard(type) {
    return function isMessageType(msg) {
        return msg.type === type;
    };
}
exports.createMessageTypeGuard = createMessageTypeGuard;
/**
 * Type guard to check if a message is from a specific source
 *
 * @param source The source context to check for
 * @returns A type guard function checking if the message is from the specified source
 */
function isFromSource(source) {
    return function (msg) {
        return msg.source === source;
    };
}
exports.isFromSource = isFromSource;
/**
 * Type guard to check if a message is targeted to a specific destination
 *
 * @param target The target context to check for
 * @returns A type guard function checking if the message is for the specified target
 */
function isForTarget(target) {
    return function (msg) {
        return msg.target === target;
    };
}
exports.isForTarget = isForTarget;
/**
 * Type guard to check if the data property contains required fields
 *
 * @param requiredFields Array of field names that must exist in the data object
 * @returns A type guard function checking if all required fields are present
 */
function hasRequiredDataFields(requiredFields) {
    return function (msg) {
        if (!msg.data || typeof msg.data !== 'object') {
            return false;
        }
        var data = msg.data;
        return requiredFields.every(function (field) { return field in data; });
    };
}
exports.hasRequiredDataFields = hasRequiredDataFields;

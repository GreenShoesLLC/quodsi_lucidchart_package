"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSerializableMessage = void 0;
/**
 * Creates a serializable message. At runtime, enums will serialize to their string values.
 */
function createSerializableMessage(type, payload) {
    return {
        messagetype: type,
        data: payload !== null && payload !== void 0 ? payload : null
    };
}
exports.createSerializableMessage = createSerializableMessage;

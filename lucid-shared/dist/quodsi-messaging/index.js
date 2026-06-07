"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidEnvelopMsg = exports.ValidationSeverity = exports.SimulationStatus = exports.hasRequiredDataFields = exports.isForTarget = exports.isFromSource = exports.createMessageTypeGuard = exports.isEnvelope = exports.EnvelopeMessageType = void 0;
var envelope_1 = require("./envelope/envelope");
var envelopeMessageTypes_1 = require("./envelope/envelopeMessageTypes");
// Export message types enum
var envelopeMessageTypes_2 = require("./envelope/envelopeMessageTypes");
Object.defineProperty(exports, "EnvelopeMessageType", { enumerable: true, get: function () { return envelopeMessageTypes_2.EnvelopeMessageType; } });
// Export envelope base
var envelope_2 = require("./envelope/envelope");
Object.defineProperty(exports, "isEnvelope", { enumerable: true, get: function () { return envelope_2.isEnvelope; } });
// Export guard utilities
var guards_1 = require("./envelope/guards");
Object.defineProperty(exports, "createMessageTypeGuard", { enumerable: true, get: function () { return guards_1.createMessageTypeGuard; } });
Object.defineProperty(exports, "isFromSource", { enumerable: true, get: function () { return guards_1.isFromSource; } });
Object.defineProperty(exports, "isForTarget", { enumerable: true, get: function () { return guards_1.isForTarget; } });
Object.defineProperty(exports, "hasRequiredDataFields", { enumerable: true, get: function () { return guards_1.hasRequiredDataFields; } });
// Export simulation messages
var messages_1 = require("./simulation/messages");
Object.defineProperty(exports, "SimulationStatus", { enumerable: true, get: function () { return messages_1.SimulationStatus; } });
// Export model operations messages
var messages_2 = require("./modelOps/messages");
Object.defineProperty(exports, "ValidationSeverity", { enumerable: true, get: function () { return messages_2.ValidationSeverity; } });
/**
 * Type guard to check if a message is a valid Quodsi message
 */
function isValidEnvelopMsg(value) {
    return (0, envelope_1.isEnvelope)(value);
}
exports.isValidEnvelopMsg = isValidEnvelopMsg;

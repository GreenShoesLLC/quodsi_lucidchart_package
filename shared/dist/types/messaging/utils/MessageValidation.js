"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidMessage = void 0;
var MessageTypes_1 = require("../MessageTypes");
/**
 * Type guard to check if a message is valid
 */
function isValidMessage(message) {
    return message
        && typeof message === 'object'
        && 'messagetype' in message
        && Object.values(MessageTypes_1.MessageTypes).includes(message.messagetype);
}
exports.isValidMessage = isValidMessage;

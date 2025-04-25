"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionMessaging = void 0;
var ComponentLogger_1 = require("../../../core/logging/ComponentLogger");
// Define a constant for the logger prefix
var LOG_PREFIX = '[ExtensionMessaging]';
var ExtensionMessaging = /** @class */ (function () {
    /**
     * Private constructor for singleton pattern
     */
    function ExtensionMessaging() {
        this.handlers = new Map();
        // Set logging to disabled by default
        this.setLogging(false);
    }
    ExtensionMessaging.getInstance = function () {
        if (!ExtensionMessaging.instance) {
            ExtensionMessaging.instance = new ExtensionMessaging();
        }
        return ExtensionMessaging.instance;
    };
    /**
     * Enable or disable logging for this component
     */
    ExtensionMessaging.prototype.setLogging = function (enabled) {
        ComponentLogger_1.ComponentLogger.setEnabled(LOG_PREFIX, enabled);
    };
    /**
     * Creates a serializable message. At runtime, enums will serialize to their string values.
     */
    ExtensionMessaging.prototype.createSerializableMessage = function (type, payload) {
        return {
            messagetype: type,
            data: payload !== null && payload !== void 0 ? payload : null
        };
    };
    ExtensionMessaging.prototype.handleIncomingMessage = function (message) {
        ComponentLogger_1.ComponentLogger.log(LOG_PREFIX, 'Received incoming message:', message);
        if (!(message === null || message === void 0 ? void 0 : message.messagetype)) {
            ComponentLogger_1.ComponentLogger.warn(LOG_PREFIX, 'Message missing messagetype:', message);
            return;
        }
        var handlers = this.handlers.get(message.messagetype);
        if (handlers) {
            ComponentLogger_1.ComponentLogger.log(LOG_PREFIX, "Found ".concat(handlers.size, " handlers for incoming message type: ").concat(message.messagetype));
            handlers.forEach(function (handler) { return handler(message.data); });
        }
        else {
            ComponentLogger_1.ComponentLogger.warn(LOG_PREFIX, "No handlers found for incoming message type: ".concat(message.messagetype));
        }
    };
    ExtensionMessaging.prototype.onMessage = function (type, handler) {
        var _this = this;
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type).add(handler);
        // Return unsubscribe function
        return function () {
            var _a;
            (_a = _this.handlers.get(type)) === null || _a === void 0 ? void 0 : _a.delete(handler);
        };
    };
    ExtensionMessaging.prototype.sendMessage = function (type, payload) {
        ComponentLogger_1.ComponentLogger.log(LOG_PREFIX, 'Sending message:', { type: type, payload: payload });
        try {
            // First, notify any local handlers
            var handlers = this.handlers.get(type);
            if (handlers) {
                handlers.forEach(function (handler) { return handler(payload); });
            }
            // Then, send to parent window
            var message = this.createSerializableMessage(type, payload);
            window.parent.postMessage(message, "*");
            ComponentLogger_1.ComponentLogger.log(LOG_PREFIX, 'Message posted to parent window');
        }
        catch (error) {
            ComponentLogger_1.ComponentLogger.error(LOG_PREFIX, 'Failed to send message:', error);
            throw error;
        }
    };
    return ExtensionMessaging;
}());
exports.ExtensionMessaging = ExtensionMessaging;

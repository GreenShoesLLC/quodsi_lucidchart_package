"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionMessaging = void 0;
var MessageCreator_1 = require("./MessageCreator");
// import { createSerializableMessage } from "@quodsi/shared";
var ExtensionMessaging = /** @class */ (function () {
    function ExtensionMessaging() {
        this.handlers = new Map();
    }
    ExtensionMessaging.getInstance = function () {
        if (!ExtensionMessaging.instance) {
            ExtensionMessaging.instance = new ExtensionMessaging();
        }
        return ExtensionMessaging.instance;
    };
    ExtensionMessaging.prototype.handleIncomingMessage = function (message) {
        console.log('[ExtensionMessaging] Received incoming message:', message);
        if (!(message === null || message === void 0 ? void 0 : message.messagetype)) {
            console.warn('[ExtensionMessaging] Message missing messagetype:', message);
            return;
        }
        var handlers = this.handlers.get(message.messagetype);
        if (handlers) {
            console.log("[ExtensionMessaging] Found ".concat(handlers.size, " handlers for incoming message type: ").concat(message.messagetype));
            handlers.forEach(function (handler) { return handler(message.data); });
        }
        else {
            console.warn("[ExtensionMessaging] No handlers found for incoming message type: ".concat(message.messagetype));
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
        console.log('[ExtensionMessaging] Sending message:', { type: type, payload: payload });
        try {
            // First, notify any local handlers
            var handlers = this.handlers.get(type);
            if (handlers) {
                handlers.forEach(function (handler) { return handler(payload); });
            }
            // Then, send to parent window
            var message = (0, MessageCreator_1.createSerializableMessage)(type, payload);
            window.parent.postMessage(message, "*");
            console.log('[ExtensionMessaging] Message posted to parent window');
        }
        catch (error) {
            console.error('[ExtensionMessaging] Failed to send message:', error);
            throw error;
        }
    };
    return ExtensionMessaging;
}());
exports.ExtensionMessaging = ExtensionMessaging;

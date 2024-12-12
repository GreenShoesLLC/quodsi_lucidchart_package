"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionMessaging = void 0;
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
        if (!(message === null || message === void 0 ? void 0 : message.messagetype)) {
            return;
        }
        var handlers = this.handlers.get(message.messagetype);
        if (handlers) {
            // Pass the message data to all registered handlers
            handlers.forEach(function (handler) { return handler(message.data); });
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
        var handlers = this.handlers.get(type);
        if (handlers) {
            handlers.forEach(function (handler) { return handler(payload); });
        }
    };
    return ExtensionMessaging;
}());
exports.ExtensionMessaging = ExtensionMessaging;

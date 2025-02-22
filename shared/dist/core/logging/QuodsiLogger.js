"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuodsiLogger = void 0;
var QuodsiLogger = /** @class */ (function () {
    // No initialization in constructor since we can't access LOG_PREFIX
    function QuodsiLogger() {
        this.loggingEnabled = false;
    }
    QuodsiLogger.prototype.setLogging = function (enabled) {
        // Initialize on first use if needed
        if (!QuodsiLogger.instanceMap.has(this.LOG_PREFIX)) {
            QuodsiLogger.instanceMap.set(this.LOG_PREFIX, enabled);
        }
        else {
            QuodsiLogger.instanceMap.set(this.LOG_PREFIX, enabled);
        }
        this.loggingEnabled = enabled;
        if (enabled) {
            this.log("Logging enabled");
        }
    };
    QuodsiLogger.prototype.isLoggingEnabled = function () {
        // Initialize as false if not yet set
        if (!QuodsiLogger.instanceMap.has(this.LOG_PREFIX)) {
            QuodsiLogger.instanceMap.set(this.LOG_PREFIX, false);
            this.loggingEnabled = false;
        }
        return this.loggingEnabled;
    };
    QuodsiLogger.prototype.log = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (this.isLoggingEnabled()) {
            console.log.apply(console, __spreadArray(["".concat(this.LOG_PREFIX, " ").concat(message)], args, false));
        }
    };
    QuodsiLogger.prototype.logError = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (this.isLoggingEnabled()) {
            console.error.apply(console, __spreadArray(["".concat(this.LOG_PREFIX, " ").concat(message)], args, false));
        }
    };
    QuodsiLogger.prototype.logWarning = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (this.isLoggingEnabled()) {
            console.warn.apply(console, __spreadArray(["".concat(this.LOG_PREFIX, " ").concat(message)], args, false));
        }
    };
    QuodsiLogger.prototype.logDebug = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (this.isLoggingEnabled()) {
            console.debug.apply(console, __spreadArray(["".concat(this.LOG_PREFIX, " ").concat(message)], args, false));
        }
    };
    QuodsiLogger.instanceMap = new Map();
    return QuodsiLogger;
}());
exports.QuodsiLogger = QuodsiLogger;

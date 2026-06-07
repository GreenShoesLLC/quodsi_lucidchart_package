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
exports.ComponentLogger = void 0;
/**
 * ComponentLogger - A simple logging utility that allows enabling/disabling logs per component
 */
var ComponentLogger = /** @class */ (function () {
    function ComponentLogger() {
    }
    /**
     * Enable or disable logging for a specific component prefix
     * @param prefix The component prefix to configure (e.g., '[ComponentName]')
     * @param enabled Whether logging should be enabled for this component
     */
    ComponentLogger.setEnabled = function (prefix, enabled) {
        ComponentLogger.enabledPrefixes.set(prefix, enabled);
        if (enabled) {
            console.log("".concat(prefix, " Logging enabled"));
        }
    };
    /**
     * Check if logging is enabled for a specific component prefix
     * @param prefix The component prefix to check
     * @returns True if logging is enabled for this prefix, false otherwise
     */
    ComponentLogger.isEnabled = function (prefix) {
        return ComponentLogger.enabledPrefixes.get(prefix) || false;
    };
    /**
     * Log a message if logging is enabled for the specified component
     * @param prefix The component prefix
     * @param message The message to log
     * @param args Additional arguments to log
     */
    ComponentLogger.log = function (prefix, message) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        if (ComponentLogger.isEnabled(prefix)) {
            console.log.apply(console, __spreadArray(["".concat(prefix, " ").concat(message)], args, false));
        }
    };
    /**
     * Log an error message if logging is enabled for the specified component
     * @param prefix The component prefix
     * @param message The error message to log
     * @param args Additional arguments to log
     */
    ComponentLogger.error = function (prefix, message) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        if (ComponentLogger.isEnabled(prefix)) {
            console.error.apply(console, __spreadArray(["".concat(prefix, " ").concat(message)], args, false));
        }
    };
    /**
     * Log a warning message if logging is enabled for the specified component
     * @param prefix The component prefix
     * @param message The warning message to log
     * @param args Additional arguments to log
     */
    ComponentLogger.warn = function (prefix, message) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        if (ComponentLogger.isEnabled(prefix)) {
            console.warn.apply(console, __spreadArray(["".concat(prefix, " ").concat(message)], args, false));
        }
    };
    /**
     * Log a debug message if logging is enabled for the specified component
     * @param prefix The component prefix
     * @param message The debug message to log
     * @param args Additional arguments to log
     */
    ComponentLogger.debug = function (prefix, message) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        if (ComponentLogger.isEnabled(prefix)) {
            console.debug.apply(console, __spreadArray(["".concat(prefix, " ").concat(message)], args, false));
        }
    };
    /**
     * Start a new logging group if logging is enabled for the specified component
     * @param prefix The component prefix
     * @param label The label for the group
     * @param args Additional arguments to log
     */
    ComponentLogger.group = function (prefix, label) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        if (ComponentLogger.isEnabled(prefix)) {
            console.group.apply(console, __spreadArray(["".concat(prefix, " ").concat(label)], args, false));
        }
    };
    /**
     * End a logging group if logging is enabled for the specified component
     * @param prefix The component prefix
     */
    ComponentLogger.groupEnd = function (prefix) {
        if (ComponentLogger.isEnabled(prefix)) {
            console.groupEnd();
        }
    };
    ComponentLogger.enabledPrefixes = new Map();
    return ComponentLogger;
}());
exports.ComponentLogger = ComponentLogger;

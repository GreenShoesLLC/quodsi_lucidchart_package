"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationRule = void 0;
/**
 * Base class for validation rules
 */
var ValidationRule = /** @class */ (function () {
    function ValidationRule() {
        /**
         * Flag to enable or disable logging across all validation rules.
         */
        this.loggingEnabled = false;
    }
    /**
     * Method to toggle logging.
     * @param enabled - True to enable logging, false to disable.
     */
    ValidationRule.prototype.setLogging = function (enabled) {
        this.loggingEnabled = enabled;
    };
    /**
     * Checks if logging is enabled.
     * @returns True if logging is enabled, false otherwise.
     */
    ValidationRule.prototype.isLoggingEnabled = function () {
        return this.loggingEnabled;
    };
    /**
     * Logs a message if logging is enabled.
     * @param message - The message to log.
     */
    ValidationRule.prototype.log = function (message) {
        if (this.isLoggingEnabled()) {
            console.log("[".concat(this.constructor.name, "] ").concat(message));
        }
    };
    return ValidationRule;
}());
exports.ValidationRule = ValidationRule;

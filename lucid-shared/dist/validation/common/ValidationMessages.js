"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationMessages = void 0;
var types_1 = require("../../quodsi-messaging/validation/types");
var ValidationMessages = /** @class */ (function () {
    function ValidationMessages() {
    }
    /**
     * Generates a unique ID for a validation issue.
     */
    ValidationMessages.generateId = function (code, elementId) {
        this.idCounter++;
        var base = elementId ? "".concat(code, "_").concat(elementId) : code;
        return "".concat(base, "_").concat(this.idCounter);
    };
    /**
     * Formats an element display name for validation messages.
     * Shows name in quotes with ID as fallback if name is empty.
     */
    ValidationMessages.getDisplayName = function (name, id) {
        if (name && name.trim() !== '') {
            return "'".concat(name, "'");
        }
        return id;
    };
    /**
     * Helper method to create a ValidationIssue from basic parameters.
     * Use this for inline validations that don't have dedicated factory methods.
     */
    ValidationMessages.createIssue = function (severity, code, message, elementId) {
        return {
            id: this.generateId(code, elementId),
            severity: severity,
            code: code,
            message: message,
            elementId: elementId
        };
    };
    // Existing messages...
    ValidationMessages.missingName = function (elementType, elementId, elementName) {
        var code = 'missing_name';
        var displayName = this.getDisplayName(elementName, elementId);
        return {
            id: this.generateId(code, elementId),
            severity: types_1.ValidationSeverity.WARNING,
            message: "".concat(elementType, " ").concat(displayName, " has no name"),
            elementId: elementId,
            code: code
        };
    };
    ValidationMessages.isolatedElement = function (elementType, elementId, elementName) {
        var code = 'isolated_element';
        var displayName = this.getDisplayName(elementName, elementId);
        return {
            id: this.generateId(code, elementId),
            severity: types_1.ValidationSeverity.ERROR,
            message: "".concat(elementType, " ").concat(displayName, " is isolated (no connections)"),
            elementId: elementId,
            code: code
        };
    };
    ValidationMessages.invalidConnection = function (connectorId, type, elementId) {
        var code = 'invalid_connection';
        return {
            id: this.generateId(code, connectorId),
            severity: types_1.ValidationSeverity.ERROR,
            message: "Connector ".concat(connectorId, " has invalid ").concat(type, " (").concat(elementId, ")"),
            elementId: connectorId,
            code: code
        };
    };
    ValidationMessages.invalidCapacity = function (elementType, elementId, minimum, elementName) {
        if (minimum === void 0) { minimum = 1; }
        var code = 'invalid_capacity';
        var displayName = this.getDisplayName(elementName, elementId);
        return {
            id: this.generateId(code, elementId),
            severity: types_1.ValidationSeverity.ERROR,
            message: "".concat(elementType, " ").concat(displayName, " has invalid capacity (must be >= ").concat(minimum, ")"),
            elementId: elementId,
            code: code
        };
    };
    // New messages for Activity validation
    ValidationMessages.noConnections = function (elementType, elementId, direction, elementName) {
        var code = 'no_connections';
        var displayName = this.getDisplayName(elementName, elementId);
        return {
            id: this.generateId(code, elementId),
            severity: types_1.ValidationSeverity.WARNING,
            message: "".concat(elementType, " ").concat(displayName, " has no ").concat(direction, " connections (potential ").concat(direction === 'incoming' ? 'start' : 'end', " activity)"),
            elementId: elementId,
            code: code
        };
    };
    ValidationMessages.largeQueueCapacity = function (elementType, elementId, type, elementName) {
        var code = 'large_queue_capacity';
        var displayName = this.getDisplayName(elementName, elementId);
        return {
            id: this.generateId(code, elementId),
            severity: types_1.ValidationSeverity.WARNING,
            message: "".concat(elementType, " ").concat(displayName, " has unusually large ").concat(type, " queue capacity"),
            elementId: elementId,
            code: code
        };
    };
    ValidationMessages.invalidQueueCapacity = function (elementType, elementId, type, elementName) {
        var code = 'invalid_queue_capacity';
        var displayName = this.getDisplayName(elementName, elementId);
        return {
            id: this.generateId(code, elementId),
            severity: types_1.ValidationSeverity.ERROR,
            message: "".concat(elementType, " ").concat(displayName, " has invalid ").concat(type, " queue capacity"),
            elementId: elementId,
            code: code
        };
    };
    ValidationMessages.missingActions = function (elementId, activityName) {
        var code = 'missing_actions';
        var displayName = this.getDisplayName(activityName, elementId);
        return {
            id: this.generateId(code, elementId),
            severity: types_1.ValidationSeverity.ERROR,
            message: "Activity ".concat(displayName, " is missing actions property"),
            elementId: elementId,
            code: code
        };
    };
    ValidationMessages.noActions = function (elementId, activityName) {
        var code = 'no_actions';
        var displayName = this.getDisplayName(activityName, elementId);
        return {
            id: this.generateId(code, elementId),
            severity: types_1.ValidationSeverity.WARNING,
            message: "Activity ".concat(displayName, " has no actions defined"),
            elementId: elementId,
            code: code
        };
    };
    ValidationMessages.invalidStepDuration = function (elementId, stepNumber) {
        var code = 'invalid_step_duration';
        return {
            id: this.generateId(code, elementId),
            severity: types_1.ValidationSeverity.ERROR,
            message: "Activity ".concat(elementId, " operation step ").concat(stepNumber, " has invalid duration"),
            elementId: elementId,
            code: code
        };
    };
    ValidationMessages.unusualStepDuration = function (elementId, stepNumber, duration) {
        var code = 'unusual_step_duration';
        return {
            id: this.generateId(code, elementId),
            severity: types_1.ValidationSeverity.WARNING,
            message: "Activity ".concat(elementId, " operation step ").concat(stepNumber, " has unusual duration (").concat(duration, " seconds)"),
            elementId: elementId,
            code: code
        };
    };
    ValidationMessages.duplicateResourceRequest = function (elementId, stepNumber) {
        var code = 'duplicate_resource_request';
        return {
            id: this.generateId(code, elementId),
            severity: types_1.ValidationSeverity.WARNING,
            message: "Activity ".concat(elementId, " operation step ").concat(stepNumber, " requests the same resource multiple times"),
            elementId: elementId,
            code: code
        };
    };
    ValidationMessages.invalidResourceQuantity = function (elementId, stepNumber) {
        var code = 'invalid_resource_quantity';
        return {
            id: this.generateId(code, elementId),
            severity: types_1.ValidationSeverity.ERROR,
            message: "Activity ".concat(elementId, " operation step ").concat(stepNumber, " has invalid resource quantity"),
            elementId: elementId,
            code: code
        };
    };
    ValidationMessages.unusualCycleTime = function (elementId, type, time) {
        var code = 'unusual_cycle_time';
        return {
            id: this.generateId(code, elementId),
            severity: types_1.ValidationSeverity.WARNING,
            message: "Activity ".concat(elementId, " has unusually ").concat(type, " ").concat(type === 'short' ? 'minimum' : 'maximum', " cycle time (").concat(time, " seconds)"),
            elementId: elementId,
            code: code
        };
    };
    ValidationMessages.circularDependency = function (elementId, activityName) {
        var code = 'circular_dependency';
        var displayName = this.getDisplayName(activityName, elementId);
        return {
            id: this.generateId(code, elementId),
            severity: types_1.ValidationSeverity.WARNING,
            message: "Potential circular dependency detected involving activity ".concat(displayName),
            elementId: elementId,
            code: code
        };
    };
    ValidationMessages.resourceLeak = function (elementId, activityName) {
        var code = 'resource_leak';
        var displayName = this.getDisplayName(activityName, elementId);
        return {
            id: this.generateId(code, elementId),
            severity: types_1.ValidationSeverity.WARNING,
            message: "Activity ".concat(displayName, " requests resources but never releases them"),
            elementId: elementId,
            code: code
        };
    };
    // Existing utility messages...
    ValidationMessages.validationSuccess = function () {
        var code = 'validation_success';
        return {
            id: this.generateId(code),
            severity: types_1.ValidationSeverity.INFO,
            message: 'Model validation passed successfully',
            code: code
        };
    };
    ValidationMessages.validationError = function (error) {
        var code = 'validation_error';
        return {
            id: this.generateId(code),
            severity: types_1.ValidationSeverity.ERROR,
            message: "Validation failed: ".concat(error instanceof Error ? error.message : 'Unknown error'),
            code: code
        };
    };
    // Generator Validation
    ValidationMessages.generatorValidation = function (category, generatorId, detail, generatorName) {
        var code = 'generator_validation';
        var displayName = this.getDisplayName(generatorName, generatorId);
        return {
            id: this.generateId(code, generatorId),
            severity: types_1.ValidationSeverity.ERROR,
            message: "Generator ".concat(displayName, " has invalid ").concat(category, ": ").concat(detail),
            elementId: generatorId,
            code: code
        };
    };
    // Element Counts
    ValidationMessages.missingRequiredElement = function (elementType) {
        var code = 'missing_required_element';
        return {
            id: this.generateId(code),
            severity: types_1.ValidationSeverity.ERROR,
            message: "Model must have at least one ".concat(elementType),
            code: code
        };
    };
    ValidationMessages.idCounter = 0;
    return ValidationMessages;
}());
exports.ValidationMessages = ValidationMessages;

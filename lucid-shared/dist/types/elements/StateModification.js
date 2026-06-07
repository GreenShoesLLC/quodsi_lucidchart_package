"use strict";
/**
 * StateModification class for defining state value changes during simulation.
 *
 * This module provides the StateModification class that defines how to modify
 * state values during simulation execution with type safety and cross-component
 * access capabilities.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSampleModification = exports.createModelCounterIncrement = exports.createIncrementModification = exports.createAssignModification = exports.StateModification = void 0;
var StateOperation_1 = require("./StateOperation");
var ComponentType_1 = require("./ComponentType");
var StateType_1 = require("./StateType");
/**
 * Defines how to modify a state value during simulation execution.
 *
 * StateModification provides type-safe operations, proper state references,
 * and cross-component access capabilities for the state management system.
 */
var StateModification = /** @class */ (function () {
    function StateModification(stateUniqueId, stateName, operation, value, options) {
        this.stateUniqueId = stateUniqueId;
        this.stateName = stateName;
        this.operation = operation;
        this.value = value;
        this.componentUniqueId = options === null || options === void 0 ? void 0 : options.componentUniqueId;
        this.targetComponentType = options === null || options === void 0 ? void 0 : options.targetComponentType;
        this.distributionType = options === null || options === void 0 ? void 0 : options.distributionType;
        this.distributionParameters = options === null || options === void 0 ? void 0 : options.distributionParameters;
    }
    /**
     * Resolve target component type from explicit field or state_unique_id pattern.
     *
     * @returns ComponentType indicating which type of component owns the target state
     */
    StateModification.prototype.getTargetComponentType = function () {
        if (this.targetComponentType) {
            return this.targetComponentType;
        }
        // Fallback: infer from state_unique_id naming convention
        return this.inferComponentTypeFromUniqueId();
    };
    /**
     * Infer component type from state_unique_id naming pattern.
     *
     * Expected pattern: "state_name_COMPONENTTYPE_###"
     *
     * @returns ComponentType inferred from the unique_id pattern
     */
    StateModification.prototype.inferComponentTypeFromUniqueId = function () {
        var parts = this.stateUniqueId.split("_");
        if (parts.length >= 2) {
            var componentTypeStr = parts[parts.length - 2].toUpperCase();
            // Try to match to ComponentType
            if (componentTypeStr === "MODEL")
                return ComponentType_1.ComponentType.MODEL;
            if (componentTypeStr === "ENTITY")
                return ComponentType_1.ComponentType.ENTITY;
            if (componentTypeStr === "RESOURCE")
                return ComponentType_1.ComponentType.RESOURCE;
            if (componentTypeStr === "ACTIVITY")
                return ComponentType_1.ComponentType.ACTIVITY;
        }
        // Default fallback - assume entity state if pattern unclear
        return ComponentType_1.ComponentType.ENTITY;
    };
    /**
     * Validate modification against available state definitions.
     *
     * @param availableStates Dictionary of state definitions keyed by unique_id
     * @throws Error if validation fails with descriptive error message
     */
    StateModification.prototype.validate = function (availableStates) {
        // Find state definition by unique_id
        var state = this.findStateByUniqueId(availableStates);
        // Validate operation is supported for state type
        this.validateOperationForType(state);
        // Validate SAMPLE operation has distribution configuration
        if (this.operation === StateOperation_1.StateOperation.SAMPLE) {
            this.validateSampleOperation(state);
        }
        else {
            // Validate value type matches state type (only for non-SAMPLE operations)
            this.validateValueType(state);
        }
        // Validate cross-component access if specified
        if (this.componentUniqueId || this.targetComponentType) {
            this.validateCrossComponentAccess(state);
        }
    };
    /**
     * Validate SAMPLE operation has required distribution configuration.
     *
     * @param state The State to validate against
     * @throws Error if SAMPLE operation is missing required fields
     */
    StateModification.prototype.validateSampleOperation = function (state) {
        if (!this.distributionType) {
            throw new Error("SAMPLE operation requires distribution_type");
        }
        if (!this.distributionParameters) {
            throw new Error("SAMPLE operation requires distribution_parameters");
        }
        // Type-specific distribution validation
        if (state.dataType === StateType_1.StateType.CATEGORY) {
            if (this.distributionType !== "sample_multinomial_one") {
                throw new Error("CATEGORY state SAMPLE requires 'sample_multinomial_one' distribution");
            }
            // Validate probabilities object exists
            var probabilities = this.distributionParameters.probabilities;
            if (!probabilities || typeof probabilities !== 'object') {
                throw new Error("SAMPLE for CATEGORY state requires 'probabilities' object");
            }
            // Validate all category values have probabilities
            if (state.categoryValues) {
                for (var _i = 0, _a = state.categoryValues; _i < _a.length; _i++) {
                    var catValue = _a[_i];
                    if (probabilities[catValue] === undefined) {
                        throw new Error("SAMPLE for state '".concat(state.name, "' missing probability for category '").concat(catValue, "'"));
                    }
                }
                // Check for unknown categories
                for (var _b = 0, _c = Object.keys(probabilities); _b < _c.length; _b++) {
                    var key = _c[_b];
                    if (!state.categoryValues.includes(key)) {
                        throw new Error("SAMPLE for state '".concat(state.name, "' has unknown category '").concat(key, "'"));
                    }
                }
            }
            // Validate probabilities sum to 1.0
            var sum = Object.values(probabilities).reduce(function (acc, val) { return acc + val; }, 0);
            if (Math.abs(sum - 1.0) > 1e-6) {
                throw new Error("Probabilities must sum to 1.0, got ".concat(sum));
            }
        }
        else if (state.dataType === StateType_1.StateType.BOOLEAN) {
            if (this.distributionType !== "bernoulli") {
                throw new Error("BOOLEAN state SAMPLE requires 'bernoulli' distribution");
            }
            if (this.distributionParameters.p === undefined) {
                throw new Error("BOOLEAN state SAMPLE requires 'p' parameter");
            }
            var p = this.distributionParameters.p;
            if (typeof p !== 'number' || p < 0 || p > 1) {
                throw new Error("'p' must be between 0 and 1");
            }
        }
        else if (state.dataType === StateType_1.StateType.NUMBER) {
            // Validate that a numeric distribution type is specified
            var validNumericDistributions = [
                "constant", "uniform", "triangular", "exponential",
                "normal", "lognormal", "beta", "gamma", "weibull",
                "poisson", "discrete"
            ];
            if (!validNumericDistributions.includes(this.distributionType)) {
                throw new Error("NUMBER state SAMPLE requires a numeric distribution, got '".concat(this.distributionType, "'"));
            }
        }
    };
    /**
     * Find state definition by unique_id.
     *
     * @param availableStates Map of state definitions
     * @returns State matching the state_unique_id
     * @throws Error if state not found
     */
    StateModification.prototype.findStateByUniqueId = function (availableStates) {
        var state = availableStates.get(this.stateUniqueId);
        if (!state) {
            // Also try searching by id match
            for (var _i = 0, _a = Array.from(availableStates.values()); _i < _a.length; _i++) {
                var s = _a[_i];
                if (s.id === this.stateUniqueId) {
                    return s;
                }
            }
            throw new Error("State with unique_id '".concat(this.stateUniqueId, "' not found in model"));
        }
        return state;
    };
    /**
     * Validate operation is supported for the state's data type.
     *
     * @param state The State to validate against
     * @throws Error if operation is not supported for the state type
     */
    StateModification.prototype.validateOperationForType = function (state) {
        if (!(0, StateOperation_1.validateOperationForType)(this.operation, state.dataType)) {
            if (state.dataType === StateType_1.StateType.NUMBER) {
                throw new Error("Invalid operation '".concat(this.operation, "' for NUMBER state"));
            }
            else {
                throw new Error("Operation '".concat(this.operation, "' not supported for ").concat(state.dataType, " state. ") +
                    "Only assignment (=) is supported for non-numeric state types.");
            }
        }
    };
    /**
     * Validate modification value matches state data type.
     *
     * @param state The State to validate against
     * @throws Error if value type doesn't match state type
     */
    StateModification.prototype.validateValueType = function (state) {
        if (state.dataType === StateType_1.StateType.NUMBER) {
            if (typeof this.value !== 'number') {
                throw new Error("NUMBER state '".concat(state.name, "' modification value must be numeric, ") +
                    "got ".concat(typeof this.value));
            }
        }
        else if (state.dataType === StateType_1.StateType.STRING) {
            if (typeof this.value !== 'string') {
                throw new Error("STRING state '".concat(state.name, "' modification value must be string, ") +
                    "got ".concat(typeof this.value));
            }
        }
        else if (state.dataType === StateType_1.StateType.BOOLEAN) {
            if (typeof this.value !== 'boolean') {
                throw new Error("BOOLEAN state '".concat(state.name, "' modification value must be boolean, ") +
                    "got ".concat(typeof this.value));
            }
        }
        else if (state.dataType === StateType_1.StateType.CATEGORY) {
            if (typeof this.value !== 'string') {
                throw new Error("CATEGORY state '".concat(state.name, "' modification value must be string, ") +
                    "got ".concat(typeof this.value));
            }
            if (state.categoryValues && !state.categoryValues.includes(this.value)) {
                throw new Error("CATEGORY state '".concat(state.name, "' modification value '").concat(this.value, "' ") +
                    "not in valid values [".concat(state.categoryValues.join(', '), "]"));
            }
        }
    };
    /**
     * Validate cross-component state access permissions.
     *
     * @param state The State to validate against
     * @throws Error if cross-component access is invalid
     */
    StateModification.prototype.validateCrossComponentAccess = function (state) {
        var targetType = this.getTargetComponentType();
        // Validate that target component type matches state definition
        if (state.componentType !== targetType) {
            throw new Error("State modification targets ".concat(targetType, " component but ") +
                "state '".concat(this.stateUniqueId, "' belongs to ").concat(state.componentType, " component"));
        }
        // Validate specific component instance exists (if specified)
        if (this.componentUniqueId &&
            (targetType === ComponentType_1.ComponentType.RESOURCE || targetType === ComponentType_1.ComponentType.ACTIVITY)) {
            // Note: Full validation requires access to model instance
            // This will be completed during model-level validation
        }
    };
    /**
     * Serialize StateModification to plain object for JSON export.
     *
     * @returns Plain object representation of the StateModification
     */
    StateModification.prototype.toJSON = function () {
        var result = {
            stateUniqueId: this.stateUniqueId,
            stateName: this.stateName,
            operation: this.operation,
            value: this.value
        };
        // Add optional fields only if they have values
        if (this.componentUniqueId !== undefined) {
            result.componentUniqueId = this.componentUniqueId;
        }
        if (this.targetComponentType !== undefined) {
            result.targetComponentType = this.targetComponentType;
        }
        if (this.distributionType !== undefined) {
            result.distributionType = this.distributionType;
        }
        if (this.distributionParameters !== undefined) {
            result.distributionParameters = this.distributionParameters;
        }
        return result;
    };
    /**
     * Deserialize StateModification from plain object (from JSON import).
     *
     * @param data Plain object containing StateModification data
     * @returns New StateModification instance
     * @throws Error if required fields are missing or invalid
     */
    StateModification.fromJSON = function (data) {
        var _a;
        // Extract required fields
        if (!data.stateUniqueId) {
            throw new Error("Missing required field 'stateUniqueId' in StateModification data");
        }
        if (!data.stateName) {
            throw new Error("Missing required field 'stateName' in StateModification data");
        }
        if (!data.operation) {
            throw new Error("Missing required field 'operation' in StateModification data");
        }
        // Convert operation string to enum
        var operation = data.operation;
        if (!Object.values(StateOperation_1.StateOperation).includes(operation)) {
            throw new Error("Invalid operation '".concat(data.operation, "' in StateModification data"));
        }
        // For SAMPLE operations, value can be null/undefined (it's ignored at runtime)
        // For other operations, value is required
        if (operation !== StateOperation_1.StateOperation.SAMPLE && (data.value === undefined || data.value === null)) {
            throw new Error("Missing required field 'value' in StateModification data");
        }
        // Extract optional fields
        var targetComponentType;
        if (data.targetComponentType) {
            targetComponentType = data.targetComponentType;
            if (!Object.values(ComponentType_1.ComponentType).includes(targetComponentType)) {
                throw new Error("Invalid targetComponentType '".concat(data.targetComponentType, "' in StateModification data"));
            }
        }
        // Default value for SAMPLE operations if not provided
        var value = (_a = data.value) !== null && _a !== void 0 ? _a : (operation === StateOperation_1.StateOperation.SAMPLE ? "" : data.value);
        return new StateModification(data.stateUniqueId, data.stateName, operation, value, {
            componentUniqueId: data.componentUniqueId,
            targetComponentType: targetComponentType,
            distributionType: data.distributionType,
            distributionParameters: data.distributionParameters
        });
    };
    StateModification.prototype.toString = function () {
        var targetInfo = "";
        if (this.targetComponentType) {
            targetInfo = ", target=".concat(this.targetComponentType);
        }
        if (this.componentUniqueId) {
            targetInfo += ":".concat(this.componentUniqueId);
        }
        return "StateModification(state='".concat(this.stateUniqueId, "', operation=").concat(this.operation, ", value=").concat(this.value).concat(targetInfo, ")");
    };
    return StateModification;
}());
exports.StateModification = StateModification;
/**
 * Convenience function to create an assignment state modification.
 */
function createAssignModification(stateUniqueId, stateName, value, options) {
    return new StateModification(stateUniqueId, stateName, StateOperation_1.StateOperation.ASSIGN, value, options);
}
exports.createAssignModification = createAssignModification;
/**
 * Convenience function to create an increment state modification.
 */
function createIncrementModification(stateUniqueId, stateName, value, options) {
    if (value === void 0) { value = 1; }
    return new StateModification(stateUniqueId, stateName, StateOperation_1.StateOperation.ADD, value, options);
}
exports.createIncrementModification = createIncrementModification;
/**
 * Convenience function to create a model-level counter increment.
 */
function createModelCounterIncrement(stateUniqueId, stateName, value) {
    if (value === void 0) { value = 1; }
    return new StateModification(stateUniqueId, stateName, StateOperation_1.StateOperation.ADD, value, { targetComponentType: ComponentType_1.ComponentType.MODEL });
}
exports.createModelCounterIncrement = createModelCounterIncrement;
/**
 * Convenience function to create a SAMPLE state modification.
 */
function createSampleModification(stateUniqueId, stateName, distributionType, distributionParameters, options) {
    return new StateModification(stateUniqueId, stateName, StateOperation_1.StateOperation.SAMPLE, "", // Value is ignored for SAMPLE operations
    {
        distributionType: distributionType,
        distributionParameters: distributionParameters,
        targetComponentType: options === null || options === void 0 ? void 0 : options.targetComponentType,
        componentUniqueId: options === null || options === void 0 ? void 0 : options.componentUniqueId
    });
}
exports.createSampleModification = createSampleModification;

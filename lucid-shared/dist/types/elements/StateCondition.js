"use strict";
/**
 * StateCondition class for defining state-based routing conditions.
 *
 * This module provides the StateCondition class that encapsulates
 * the logic for evaluating state conditions in STATE_CONDITION routing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLessEqualCondition = exports.createGreaterEqualCondition = exports.createLessThanCondition = exports.createGreaterThanCondition = exports.createEqualCondition = exports.StateCondition = void 0;
var StateComparison_1 = require("./StateComparison");
/**
 * Definition of a state condition for STATE_CONDITION routing.
 *
 * StateCondition encapsulates the logic for evaluating whether an entity's
 * state meets a specific condition (e.g., "priority >= 5" or "color == red").
 */
var StateCondition = /** @class */ (function () {
    function StateCondition(stateName, comparison, value) {
        this.stateName = stateName;
        this.comparison = comparison;
        this.value = value;
        this.validate();
    }
    /**
     * Validate the state condition for consistency and correctness.
     *
     * @throws Error if validation fails with descriptive error message
     */
    StateCondition.prototype.validate = function () {
        // State name validation
        if (!this.stateName) {
            throw new Error("State name cannot be empty");
        }
        if (typeof this.stateName !== 'string') {
            throw new Error("State name must be a string, got ".concat(typeof this.stateName));
        }
        // Comparison validation
        if (!Object.values(StateComparison_1.StateComparison).includes(this.comparison)) {
            throw new Error("Invalid comparison operator: ".concat(this.comparison));
        }
        // Value validation - check that it's a supported type
        var valueType = typeof this.value;
        if (valueType !== 'number' && valueType !== 'string' && valueType !== 'boolean') {
            throw new Error("Value must be number, string, or boolean, got ".concat(valueType));
        }
    };
    /**
     * Evaluate the state condition against an entity's state value.
     *
     * @param entityStateValue The current value of the entity's state
     * @returns True if the condition is satisfied, false otherwise
     * @throws Error if the comparison is invalid for the value types
     */
    StateCondition.prototype.evaluate = function (entityStateValue) {
        try {
            return (0, StateComparison_1.evaluateComparison)(this.comparison, entityStateValue, this.value);
        }
        catch (e) {
            var message = e instanceof Error ? e.message : String(e);
            throw new Error("Failed to evaluate condition '".concat(this.stateName, " ").concat(this.comparison, " ").concat(this.value, "' ") +
                "with entity state value '".concat(entityStateValue, "': ").concat(message));
        }
    };
    /**
     * Check if this condition is compatible with a given state type.
     *
     * @param stateType The StateType to check compatibility against
     * @returns True if the condition is compatible, false otherwise
     */
    StateCondition.prototype.isCompatibleWithStateType = function (stateType) {
        return (0, StateComparison_1.validateComparisonForType)(this.comparison, stateType);
    };
    /**
     * Get a human-readable description of this state condition.
     *
     * @returns String description of the condition
     */
    StateCondition.prototype.getDescription = function () {
        return "".concat(this.stateName, " ").concat(this.comparison, " ").concat(this.value);
    };
    /**
     * Serialize StateCondition to plain object for JSON export.
     *
     * @returns Plain object representation of the StateCondition
     */
    StateCondition.prototype.toJSON = function () {
        return {
            stateName: this.stateName,
            comparison: this.comparison,
            value: this.value
        };
    };
    /**
     * Deserialize StateCondition from plain object (from JSON import).
     *
     * @param data Plain object containing StateCondition data
     * @returns New StateCondition instance
     * @throws Error if required fields are missing or invalid
     */
    StateCondition.fromJSON = function (data) {
        if (!data.stateName) {
            throw new Error("Missing required field 'stateName' in StateCondition data");
        }
        if (!data.comparison) {
            throw new Error("Missing required field 'comparison' in StateCondition data");
        }
        if (data.value === undefined || data.value === null) {
            throw new Error("Missing required field 'value' in StateCondition data");
        }
        // Convert comparison string to enum
        var comparison;
        try {
            comparison = data.comparison;
            if (!Object.values(StateComparison_1.StateComparison).includes(comparison)) {
                throw new Error("Invalid comparison operator: '".concat(data.comparison, "'"));
            }
        }
        catch (e) {
            throw new Error("Invalid comparison operator: '".concat(data.comparison, "'"));
        }
        return new StateCondition(data.stateName, comparison, data.value);
    };
    StateCondition.prototype.toString = function () {
        return "StateCondition(".concat(this.getDescription(), ")");
    };
    return StateCondition;
}());
exports.StateCondition = StateCondition;
/**
 * Convenience function to create an equality state condition.
 *
 * @param stateName Name of the state to check
 * @param value Value to check equality against
 * @returns New StateCondition with EQUAL comparison
 */
function createEqualCondition(stateName, value) {
    return new StateCondition(stateName, StateComparison_1.StateComparison.EQUAL, value);
}
exports.createEqualCondition = createEqualCondition;
/**
 * Convenience function to create a greater-than state condition.
 *
 * @param stateName Name of the state to check
 * @param value Numeric value to compare against
 * @returns New StateCondition with GREATER_THAN comparison
 * @throws Error if value is not numeric
 */
function createGreaterThanCondition(stateName, value) {
    if (typeof value !== 'number') {
        throw new Error("Greater than comparison requires numeric value, got ".concat(typeof value));
    }
    return new StateCondition(stateName, StateComparison_1.StateComparison.GREATER_THAN, value);
}
exports.createGreaterThanCondition = createGreaterThanCondition;
/**
 * Convenience function to create a less-than state condition.
 *
 * @param stateName Name of the state to check
 * @param value Numeric value to compare against
 * @returns New StateCondition with LESS_THAN comparison
 * @throws Error if value is not numeric
 */
function createLessThanCondition(stateName, value) {
    if (typeof value !== 'number') {
        throw new Error("Less than comparison requires numeric value, got ".concat(typeof value));
    }
    return new StateCondition(stateName, StateComparison_1.StateComparison.LESS_THAN, value);
}
exports.createLessThanCondition = createLessThanCondition;
/**
 * Convenience function to create a greater-than-or-equal state condition.
 *
 * @param stateName Name of the state to check
 * @param value Numeric value to compare against
 * @returns New StateCondition with GREATER_EQUAL comparison
 * @throws Error if value is not numeric
 */
function createGreaterEqualCondition(stateName, value) {
    if (typeof value !== 'number') {
        throw new Error("Greater equal comparison requires numeric value, got ".concat(typeof value));
    }
    return new StateCondition(stateName, StateComparison_1.StateComparison.GREATER_EQUAL, value);
}
exports.createGreaterEqualCondition = createGreaterEqualCondition;
/**
 * Convenience function to create a less-than-or-equal state condition.
 *
 * @param stateName Name of the state to check
 * @param value Numeric value to compare against
 * @returns New StateCondition with LESS_EQUAL comparison
 * @throws Error if value is not numeric
 */
function createLessEqualCondition(stateName, value) {
    if (typeof value !== 'number') {
        throw new Error("Less equal comparison requires numeric value, got ".concat(typeof value));
    }
    return new StateCondition(stateName, StateComparison_1.StateComparison.LESS_EQUAL, value);
}
exports.createLessEqualCondition = createLessEqualCondition;

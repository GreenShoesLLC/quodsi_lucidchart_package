"use strict";
/**
 * State comparison enumeration for STATE_CONDITION routing.
 *
 * This module defines the StateComparison enum that specifies the types
 * of comparison operations that can be used in state condition routing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getComparisonDescription = exports.validateComparisonForType = exports.getSupportedComparisonsForType = exports.evaluateComparison = exports.getComparisonSymbol = exports.isNumericComparison = exports.StateComparison = void 0;
var StateType_1 = require("./StateType");
/**
 * Enumeration of comparison operations for state condition routing.
 *
 * These comparisons are used to evaluate state values against target values
 * to determine routing decisions in ConnectType.STATE_CONDITION routing.
 */
var StateComparison;
(function (StateComparison) {
    /**
     * Equality comparison.
     *
     * Returns true if state value equals the target value.
     * Supported by: All state types (NUMBER, STRING, BOOLEAN, CATEGORY)
     * Example: priority == 5, status == "processing", urgent == true
     */
    StateComparison["EQUAL"] = "==";
    /**
     * Inequality comparison.
     *
     * Returns true if state value does not equal the target value.
     * Supported by: All state types (NUMBER, STRING, BOOLEAN, CATEGORY)
     * Example: priority != 0, status != "idle", urgent != false
     */
    StateComparison["NOT_EQUAL"] = "!=";
    /**
     * Greater than comparison.
     *
     * Returns true if state value is greater than the target value.
     * Supported by: NUMBER states only
     * Example: score > 85, weight > 10.5
     */
    StateComparison["GREATER_THAN"] = ">";
    /**
     * Greater than or equal comparison.
     *
     * Returns true if state value is greater than or equal to the target value.
     * Supported by: NUMBER states only
     * Example: score >= 90, priority >= 1
     */
    StateComparison["GREATER_EQUAL"] = ">=";
    /**
     * Less than comparison.
     *
     * Returns true if state value is less than the target value.
     * Supported by: NUMBER states only
     * Example: score < 60, workload < 5.0
     */
    StateComparison["LESS_THAN"] = "<";
    /**
     * Less than or equal comparison.
     *
     * Returns true if state value is less than or equal to the target value.
     * Supported by: NUMBER states only
     * Example: score <= 50, priority <= 3
     */
    StateComparison["LESS_EQUAL"] = "<=";
})(StateComparison = exports.StateComparison || (exports.StateComparison = {}));
/**
 * Check if a comparison operation requires numeric values.
 */
function isNumericComparison(comparison) {
    return comparison === StateComparison.GREATER_THAN ||
        comparison === StateComparison.GREATER_EQUAL ||
        comparison === StateComparison.LESS_THAN ||
        comparison === StateComparison.LESS_EQUAL;
}
exports.isNumericComparison = isNumericComparison;
/**
 * Get the symbol representation of a comparison operation.
 */
function getComparisonSymbol(comparison) {
    return comparison;
}
exports.getComparisonSymbol = getComparisonSymbol;
/**
 * Evaluate a comparison operation between two values.
 *
 * @throws Error if the comparison is invalid for the value types
 */
function evaluateComparison(comparison, stateValue, targetValue) {
    // Validate numeric comparisons
    if (isNumericComparison(comparison)) {
        if (typeof stateValue !== 'number' || typeof targetValue !== 'number') {
            throw new Error("Comparison ".concat(comparison, " requires numeric values, ") +
                "got ".concat(typeof stateValue, " and ").concat(typeof targetValue));
        }
    }
    // Perform comparison
    switch (comparison) {
        case StateComparison.EQUAL:
            return stateValue === targetValue;
        case StateComparison.NOT_EQUAL:
            return stateValue !== targetValue;
        case StateComparison.GREATER_THAN:
            return stateValue > targetValue;
        case StateComparison.GREATER_EQUAL:
            return stateValue >= targetValue;
        case StateComparison.LESS_THAN:
            return stateValue < targetValue;
        case StateComparison.LESS_EQUAL:
            return stateValue <= targetValue;
        default:
            throw new Error("Unknown comparison operation: ".concat(comparison));
    }
}
exports.evaluateComparison = evaluateComparison;
/**
 * Get list of supported comparisons for a given state type.
 */
function getSupportedComparisonsForType(stateType) {
    // All types support equality comparisons
    var comparisons = [
        StateComparison.EQUAL,
        StateComparison.NOT_EQUAL
    ];
    // NUMBER types also support ordering comparisons
    if (stateType === StateType_1.StateType.NUMBER) {
        comparisons.push(StateComparison.GREATER_THAN, StateComparison.GREATER_EQUAL, StateComparison.LESS_THAN, StateComparison.LESS_EQUAL);
    }
    return comparisons;
}
exports.getSupportedComparisonsForType = getSupportedComparisonsForType;
/**
 * Validate that a comparison is supported for a given state type.
 */
function validateComparisonForType(comparison, stateType) {
    var supportedComparisons = getSupportedComparisonsForType(stateType);
    return supportedComparisons.includes(comparison);
}
exports.validateComparisonForType = validateComparisonForType;
/**
 * Get a human-readable description of what the comparison does.
 */
function getComparisonDescription(comparison) {
    var _a;
    var descriptions = (_a = {},
        _a[StateComparison.EQUAL] = "Check if the state value equals the target value",
        _a[StateComparison.NOT_EQUAL] = "Check if the state value does not equal the target value",
        _a[StateComparison.GREATER_THAN] = "Check if the state value is greater than the target value",
        _a[StateComparison.GREATER_EQUAL] = "Check if the state value is greater than or equal to the target value",
        _a[StateComparison.LESS_THAN] = "Check if the state value is less than the target value",
        _a[StateComparison.LESS_EQUAL] = "Check if the state value is less than or equal to the target value",
        _a);
    return descriptions[comparison] || "Unknown comparison";
}
exports.getComparisonDescription = getComparisonDescription;

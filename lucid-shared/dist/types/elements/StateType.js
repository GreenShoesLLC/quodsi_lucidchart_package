"use strict";
/**
 * State type enumeration for the state management system.
 *
 * This module defines the StateType enum that specifies the data types
 * supported by the state management system.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateValueType = exports.getSupportedOperations = exports.isArithmeticSupported = exports.StateType = void 0;
/**
 * Enumeration of supported state data types.
 *
 * Each state must have a specific data type that determines:
 * - What operations can be performed on the state
 * - How the state value is validated
 * - What statistics can be collected (Phase 2+)
 */
var StateType;
(function (StateType) {
    /**
     * Integer or float values with arithmetic operations.
     *
     * Supported operations: =, +=, -=, *=, /=
     * Use cases: Counters, scores, measurements, calculations
     * Examples: PatientScore, ThroughputCount, WorkloadLevel
     */
    StateType["NUMBER"] = "NUMBER";
    /**
     * Text values of any length.
     *
     * Supported operations: = (assignment only)
     * Use cases: Labels, descriptions, identifiers, free-form text
     * Examples: ProcessingStatus, PatientName, Notes
     */
    StateType["STRING"] = "STRING";
    /**
     * True/false values for binary conditions.
     *
     * Supported operations: = (assignment only)
     * Use cases: Flags, conditions, binary status indicators
     * Examples: IsUrgent, HasInsurance, MaintenanceRequired
     */
    StateType["BOOLEAN"] = "BOOLEAN";
    /**
     * Enumerated values from a predefined list.
     *
     * Supported operations: = (assignment only)
     * Requires: categoryValues list in State
     * Use cases: Classifications, statuses, types, levels
     * Examples: EdVisitType (low/main/trauma), QualityLevel (good/fair/poor)
     */
    StateType["CATEGORY"] = "CATEGORY";
})(StateType = exports.StateType || (exports.StateType = {}));
/**
 * Check if a state type supports arithmetic operations (+=, -=, *=, /=).
 */
function isArithmeticSupported(stateType) {
    return stateType === StateType.NUMBER;
}
exports.isArithmeticSupported = isArithmeticSupported;
/**
 * Get list of supported operations for a state type.
 *
 * @returns Array of operation symbols supported by this type
 */
function getSupportedOperations(stateType) {
    if (stateType === StateType.NUMBER) {
        return ["=", "+=", "-=", "*=", "/="];
    }
    else {
        return ["="];
    }
}
exports.getSupportedOperations = getSupportedOperations;
/**
 * Validate that a value matches the expected type for a StateType.
 */
function validateValueType(stateType, value) {
    switch (stateType) {
        case StateType.NUMBER:
            return typeof value === 'number';
        case StateType.STRING:
            return typeof value === 'string';
        case StateType.BOOLEAN:
            return typeof value === 'boolean';
        case StateType.CATEGORY:
            return typeof value === 'string';
        default:
            return false;
    }
}
exports.validateValueType = validateValueType;

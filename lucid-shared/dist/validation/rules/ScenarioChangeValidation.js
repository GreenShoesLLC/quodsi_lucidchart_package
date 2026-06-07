"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.isIntegerInput = exports.validateChangeRequestValue = void 0;
var ScenarioPropertyName_1 = require("../../types/elements/ScenarioPropertyName");
var ScenarioSetterType_1 = require("../../types/elements/ScenarioSetterType");
/**
 * Minimum allowed result value for each property.
 * null means no minimum (any value is valid).
 */
var PROPERTY_MIN_VALUE = (_a = {},
    _a[ScenarioPropertyName_1.ScenarioPropertyName.CAPACITY] = { min: 1, exclusive: false },
    _a[ScenarioPropertyName_1.ScenarioPropertyName.ACTIVITY_CAPACITY] = { min: 1, exclusive: false },
    _a[ScenarioPropertyName_1.ScenarioPropertyName.INBOUND_QUEUE_CAPACITY] = { min: 0, exclusive: false },
    _a[ScenarioPropertyName_1.ScenarioPropertyName.OUTBOUND_QUEUE_CAPACITY] = { min: 0, exclusive: false },
    _a[ScenarioPropertyName_1.ScenarioPropertyName.WEIGHT] = { min: 0, exclusive: false },
    _a[ScenarioPropertyName_1.ScenarioPropertyName.MAX_ENTITIES] = { min: 1, exclusive: false },
    _a[ScenarioPropertyName_1.ScenarioPropertyName.ENTITIES_PER_CREATION] = { min: 1, exclusive: false },
    _a[ScenarioPropertyName_1.ScenarioPropertyName.REPS] = { min: 1, exclusive: false },
    _a[ScenarioPropertyName_1.ScenarioPropertyName.SEED] = null,
    _a[ScenarioPropertyName_1.ScenarioPropertyName.RUN_PERIOD] = { min: 0, exclusive: true },
    _a);
/**
 * Properties that must be integers (no decimals allowed for EQUAL/MINIMUM/MAXIMUM).
 */
var INTEGER_PROPERTIES = new Set([
    ScenarioPropertyName_1.ScenarioPropertyName.CAPACITY,
    ScenarioPropertyName_1.ScenarioPropertyName.ACTIVITY_CAPACITY,
    ScenarioPropertyName_1.ScenarioPropertyName.INBOUND_QUEUE_CAPACITY,
    ScenarioPropertyName_1.ScenarioPropertyName.OUTBOUND_QUEUE_CAPACITY,
    ScenarioPropertyName_1.ScenarioPropertyName.MAX_ENTITIES,
    ScenarioPropertyName_1.ScenarioPropertyName.ENTITIES_PER_CREATION,
    ScenarioPropertyName_1.ScenarioPropertyName.REPS,
    ScenarioPropertyName_1.ScenarioPropertyName.SEED,
]);
function formatMin(min, exclusive) {
    return exclusive ? "greater than ".concat(min) : "at least ".concat(min);
}
/**
 * Validates a scenario change request value based on the property and setter type.
 * Returns validation errors (blocking) and warnings (non-blocking hints).
 */
function validateChangeRequestValue(propertyName, setterType, value) {
    var propConstraint = PROPERTY_MIN_VALUE[propertyName];
    // Check integer enforcement for direct-value setter types
    if (INTEGER_PROPERTIES.has(propertyName) &&
        (setterType === ScenarioSetterType_1.ScenarioSetterType.EQUAL ||
            setterType === ScenarioSetterType_1.ScenarioSetterType.MINIMUM ||
            setterType === ScenarioSetterType_1.ScenarioSetterType.MAXIMUM ||
            setterType === ScenarioSetterType_1.ScenarioSetterType.ADD ||
            setterType === ScenarioSetterType_1.ScenarioSetterType.SUBTRACT)) {
        if (!Number.isInteger(value)) {
            return { valid: false, error: "Value must be a whole number for this property" };
        }
    }
    switch (setterType) {
        case ScenarioSetterType_1.ScenarioSetterType.EQUAL: {
            if (propConstraint !== null) {
                var min = propConstraint.min, exclusive = propConstraint.exclusive;
                if (exclusive ? value <= min : value < min) {
                    return { valid: false, error: "Value must be ".concat(formatMin(min, exclusive)) };
                }
            }
            return { valid: true };
        }
        case ScenarioSetterType_1.ScenarioSetterType.ADD:
        case ScenarioSetterType_1.ScenarioSetterType.SUBTRACT: {
            if (value === 0) {
                return { valid: true, warning: "Adding or subtracting 0 has no effect" };
            }
            return { valid: true };
        }
        case ScenarioSetterType_1.ScenarioSetterType.MULTIPLY: {
            // SEED has no constraints on multiply except nonzero
            if (propConstraint === null) {
                if (value === 0) {
                    return { valid: false, error: "Cannot multiply by 0" };
                }
                return { valid: true };
            }
            // WEIGHT allows multiply by 0 (disables connector)
            if (propertyName === ScenarioPropertyName_1.ScenarioPropertyName.WEIGHT) {
                if (value < 0) {
                    return { valid: false, error: "Multiplier must be >= 0" };
                }
                if (value === 1) {
                    return { valid: true, warning: "Multiplying by 1 has no effect" };
                }
                return { valid: true };
            }
            // All other properties: must be > 0
            if (value <= 0) {
                return { valid: false, error: "Multiplier must be greater than 0" };
            }
            if (value === 1) {
                return { valid: true, warning: "Multiplying by 1 has no effect" };
            }
            return { valid: true };
        }
        case ScenarioSetterType_1.ScenarioSetterType.DIVIDE: {
            if (value === 0) {
                return { valid: false, error: "Cannot divide by 0" };
            }
            // SEED: any nonzero
            if (propConstraint === null) {
                return { valid: true };
            }
            if (value < 0) {
                return { valid: false, error: "Divisor must be greater than 0" };
            }
            if (value === 1) {
                return { valid: true, warning: "Dividing by 1 has no effect" };
            }
            return { valid: true };
        }
        case ScenarioSetterType_1.ScenarioSetterType.MINIMUM:
        case ScenarioSetterType_1.ScenarioSetterType.MAXIMUM: {
            if (propConstraint !== null) {
                var min = propConstraint.min, exclusive = propConstraint.exclusive;
                if (exclusive ? value <= min : value < min) {
                    return { valid: false, error: "Value must be ".concat(formatMin(min, exclusive)) };
                }
            }
            return { valid: true };
        }
        default:
            return { valid: true };
    }
}
exports.validateChangeRequestValue = validateChangeRequestValue;
/**
 * Returns whether the given property requires integer input for the given setter type.
 * MULTIPLY and DIVIDE always allow floats (the engine rounds the result).
 */
function isIntegerInput(propertyName, setterType) {
    if (!INTEGER_PROPERTIES.has(propertyName))
        return false;
    return (setterType !== ScenarioSetterType_1.ScenarioSetterType.MULTIPLY &&
        setterType !== ScenarioSetterType_1.ScenarioSetterType.DIVIDE);
}
exports.isIntegerInput = isIntegerInput;

"use strict";
/**
 * State operation enumeration for the state management system.
 *
 * This module defines the StateOperation enum that specifies the types
 * of operations that can be performed on state values.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOperationDescription = exports.applyOperation = exports.getSupportedOperationsForType = exports.validateOperationForType = exports.getOperationSymbol = exports.isArithmeticOperation = exports.StateOperation = void 0;
var StateType_1 = require("./StateType");
/**
 * Enumeration of operations that can be performed on state values.
 *
 * These operations provide type-safe ways to modify state values
 * during simulation execution. Some operations are restricted to
 * specific state types (e.g., arithmetic operations only for NUMBER states).
 */
var StateOperation;
(function (StateOperation) {
    /**
     * Direct assignment operation.
     *
     * Sets the state value to the specified value.
     * Supported by: All state types (NUMBER, STRING, BOOLEAN, CATEGORY)
     * Example: priority = 5, status = "processing", urgent = true
     */
    StateOperation["ASSIGN"] = "=";
    /**
     * Addition assignment operation.
     *
     * Adds the specified value to the current state value.
     * Supported by: NUMBER states only
     * Example: counter += 1, score += 10.5
     */
    StateOperation["ADD"] = "+=";
    /**
     * Subtraction assignment operation.
     *
     * Subtracts the specified value from the current state value.
     * Supported by: NUMBER states only
     * Example: inventory -= 5, workload -= 2.0
     */
    StateOperation["SUBTRACT"] = "-=";
    /**
     * Multiplication assignment operation.
     *
     * Multiplies the current state value by the specified value.
     * Supported by: NUMBER states only
     * Example: efficiency *= 0.9, score *= 1.1
     */
    StateOperation["MULTIPLY"] = "*=";
    /**
     * Division assignment operation.
     *
     * Divides the current state value by the specified value.
     * Supported by: NUMBER states only
     * Validation: Prevents division by zero
     * Example: workload /= 2.0, average /= count
     */
    StateOperation["DIVIDE"] = "/=";
    /**
     * Sample from distribution operation.
     *
     * Samples a value from a probability distribution and assigns it to the state.
     * Supported by: All state types (NUMBER, STRING, BOOLEAN, CATEGORY)
     * Requires: distributionType and distributionParameters in StateModification
     * Example: ESI = sample(multinomial), RequiresInspection = sample(bernoulli)
     */
    StateOperation["SAMPLE"] = "sample";
})(StateOperation = exports.StateOperation || (exports.StateOperation = {}));
/**
 * Check if an operation is arithmetic (requires NUMBER state type).
 */
function isArithmeticOperation(operation) {
    return operation === StateOperation.ADD ||
        operation === StateOperation.SUBTRACT ||
        operation === StateOperation.MULTIPLY ||
        operation === StateOperation.DIVIDE;
}
exports.isArithmeticOperation = isArithmeticOperation;
/**
 * Get the symbol representation of an operation.
 */
function getOperationSymbol(operation) {
    return operation;
}
exports.getOperationSymbol = getOperationSymbol;
/**
 * Validate that an operation is supported for a given state type.
 */
function validateOperationForType(operation, stateType) {
    if (operation === StateOperation.ASSIGN) {
        return true; // Assignment supported by all types
    }
    if (operation === StateOperation.SAMPLE) {
        return true; // Sample supported by all types
    }
    // Arithmetic operations only supported by NUMBER states
    if (isArithmeticOperation(operation)) {
        return stateType === StateType_1.StateType.NUMBER;
    }
    return false;
}
exports.validateOperationForType = validateOperationForType;
/**
 * Get list of supported operations for a given state type.
 */
function getSupportedOperationsForType(stateType) {
    // All types support assignment and sample
    var operations = [StateOperation.ASSIGN, StateOperation.SAMPLE];
    // NUMBER types also support arithmetic operations
    if (stateType === StateType_1.StateType.NUMBER) {
        operations.push(StateOperation.ADD, StateOperation.SUBTRACT, StateOperation.MULTIPLY, StateOperation.DIVIDE);
    }
    return operations;
}
exports.getSupportedOperationsForType = getSupportedOperationsForType;
/**
 * Apply a numeric operation to calculate the new value.
 *
 * @throws Error for unsupported operations or division by zero
 */
function applyOperation(operation, currentValue, operandValue) {
    switch (operation) {
        case StateOperation.ASSIGN:
            return operandValue;
        case StateOperation.ADD:
            return currentValue + operandValue;
        case StateOperation.SUBTRACT:
            return currentValue - operandValue;
        case StateOperation.MULTIPLY:
            return currentValue * operandValue;
        case StateOperation.DIVIDE:
            if (operandValue === 0) {
                throw new Error("Division by zero in state operation");
            }
            return currentValue / operandValue;
        default:
            throw new Error("Unsupported operation: ".concat(operation));
    }
}
exports.applyOperation = applyOperation;
/**
 * Get a human-readable description of what the operation does.
 */
function getOperationDescription(operation) {
    var _a;
    var descriptions = (_a = {},
        _a[StateOperation.ASSIGN] = "Set the state value to the specified value",
        _a[StateOperation.ADD] = "Add the specified value to the current state value",
        _a[StateOperation.SUBTRACT] = "Subtract the specified value from the current state value",
        _a[StateOperation.MULTIPLY] = "Multiply the current state value by the specified value",
        _a[StateOperation.DIVIDE] = "Divide the current state value by the specified value",
        _a[StateOperation.SAMPLE] = "Sample a value from a probability distribution",
        _a);
    return descriptions[operation] || "Unknown operation";
}
exports.getOperationDescription = getOperationDescription;

/**
 * State operation enumeration for the state management system.
 *
 * This module defines the StateOperation enum that specifies the types
 * of operations that can be performed on state values.
 */

import { StateType } from './StateType';

/**
 * Enumeration of operations that can be performed on state values.
 *
 * These operations provide type-safe ways to modify state values
 * during simulation execution. Some operations are restricted to
 * specific state types (e.g., arithmetic operations only for NUMBER states).
 */
export enum StateOperation {
    /**
     * Direct assignment operation.
     *
     * Sets the state value to the specified value.
     * Supported by: All state types (NUMBER, STRING, BOOLEAN, CATEGORY)
     * Example: priority = 5, status = "processing", urgent = true
     */
    ASSIGN = "=",

    /**
     * Addition assignment operation.
     *
     * Adds the specified value to the current state value.
     * Supported by: NUMBER states only
     * Example: counter += 1, score += 10.5
     */
    ADD = "+=",

    /**
     * Subtraction assignment operation.
     *
     * Subtracts the specified value from the current state value.
     * Supported by: NUMBER states only
     * Example: inventory -= 5, workload -= 2.0
     */
    SUBTRACT = "-=",

    /**
     * Multiplication assignment operation.
     *
     * Multiplies the current state value by the specified value.
     * Supported by: NUMBER states only
     * Example: efficiency *= 0.9, score *= 1.1
     */
    MULTIPLY = "*=",

    /**
     * Division assignment operation.
     *
     * Divides the current state value by the specified value.
     * Supported by: NUMBER states only
     * Validation: Prevents division by zero
     * Example: workload /= 2.0, average /= count
     */
    DIVIDE = "/=",

    /**
     * Sample from distribution operation.
     *
     * Samples a value from a probability distribution and assigns it to the state.
     * Supported by: All state types (NUMBER, STRING, BOOLEAN, CATEGORY)
     * Requires: distributionType and distributionParameters in StateModification
     * Example: ESI = sample(multinomial), RequiresInspection = sample(bernoulli)
     */
    SAMPLE = "sample"
}

/**
 * Check if an operation is arithmetic (requires NUMBER state type).
 */
export function isArithmeticOperation(operation: StateOperation): boolean {
    return operation === StateOperation.ADD ||
           operation === StateOperation.SUBTRACT ||
           operation === StateOperation.MULTIPLY ||
           operation === StateOperation.DIVIDE;
}

/**
 * Get the symbol representation of an operation.
 */
export function getOperationSymbol(operation: StateOperation): string {
    return operation;
}

/**
 * Validate that an operation is supported for a given state type.
 */
export function validateOperationForType(operation: StateOperation, stateType: StateType): boolean {
    if (operation === StateOperation.ASSIGN) {
        return true; // Assignment supported by all types
    }

    if (operation === StateOperation.SAMPLE) {
        return true; // Sample supported by all types
    }

    // Arithmetic operations only supported by NUMBER states
    if (isArithmeticOperation(operation)) {
        return stateType === StateType.NUMBER;
    }

    return false;
}

/**
 * Get list of supported operations for a given state type.
 */
export function getSupportedOperationsForType(stateType: StateType): StateOperation[] {
    // All types support assignment and sample
    const operations: StateOperation[] = [StateOperation.ASSIGN, StateOperation.SAMPLE];

    // NUMBER types also support arithmetic operations
    if (stateType === StateType.NUMBER) {
        operations.push(
            StateOperation.ADD,
            StateOperation.SUBTRACT,
            StateOperation.MULTIPLY,
            StateOperation.DIVIDE
        );
    }

    return operations;
}

/**
 * Apply a numeric operation to calculate the new value.
 *
 * @throws Error for unsupported operations or division by zero
 */
export function applyOperation(
    operation: StateOperation,
    currentValue: number,
    operandValue: number
): number {
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
            throw new Error(`Unsupported operation: ${operation}`);
    }
}

/**
 * Get a human-readable description of what the operation does.
 */
export function getOperationDescription(operation: StateOperation): string {
    const descriptions: Record<StateOperation, string> = {
        [StateOperation.ASSIGN]: "Set the state value to the specified value",
        [StateOperation.ADD]: "Add the specified value to the current state value",
        [StateOperation.SUBTRACT]: "Subtract the specified value from the current state value",
        [StateOperation.MULTIPLY]: "Multiply the current state value by the specified value",
        [StateOperation.DIVIDE]: "Divide the current state value by the specified value",
        [StateOperation.SAMPLE]: "Sample a value from a probability distribution"
    };
    return descriptions[operation] || "Unknown operation";
}

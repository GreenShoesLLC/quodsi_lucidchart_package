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
export declare enum StateOperation {
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
export declare function isArithmeticOperation(operation: StateOperation): boolean;
/**
 * Get the symbol representation of an operation.
 */
export declare function getOperationSymbol(operation: StateOperation): string;
/**
 * Validate that an operation is supported for a given state type.
 */
export declare function validateOperationForType(operation: StateOperation, stateType: StateType): boolean;
/**
 * Get list of supported operations for a given state type.
 */
export declare function getSupportedOperationsForType(stateType: StateType): StateOperation[];
/**
 * Apply a numeric operation to calculate the new value.
 *
 * @throws Error for unsupported operations or division by zero
 */
export declare function applyOperation(operation: StateOperation, currentValue: number, operandValue: number): number;
/**
 * Get a human-readable description of what the operation does.
 */
export declare function getOperationDescription(operation: StateOperation): string;
//# sourceMappingURL=StateOperation.d.ts.map
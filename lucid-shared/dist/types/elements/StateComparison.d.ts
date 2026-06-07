/**
 * State comparison enumeration for STATE_CONDITION routing.
 *
 * This module defines the StateComparison enum that specifies the types
 * of comparison operations that can be used in state condition routing.
 */
import { StateType } from './StateType';
/**
 * Enumeration of comparison operations for state condition routing.
 *
 * These comparisons are used to evaluate state values against target values
 * to determine routing decisions in ConnectType.STATE_CONDITION routing.
 */
export declare enum StateComparison {
    /**
     * Equality comparison.
     *
     * Returns true if state value equals the target value.
     * Supported by: All state types (NUMBER, STRING, BOOLEAN, CATEGORY)
     * Example: priority == 5, status == "processing", urgent == true
     */
    EQUAL = "==",
    /**
     * Inequality comparison.
     *
     * Returns true if state value does not equal the target value.
     * Supported by: All state types (NUMBER, STRING, BOOLEAN, CATEGORY)
     * Example: priority != 0, status != "idle", urgent != false
     */
    NOT_EQUAL = "!=",
    /**
     * Greater than comparison.
     *
     * Returns true if state value is greater than the target value.
     * Supported by: NUMBER states only
     * Example: score > 85, weight > 10.5
     */
    GREATER_THAN = ">",
    /**
     * Greater than or equal comparison.
     *
     * Returns true if state value is greater than or equal to the target value.
     * Supported by: NUMBER states only
     * Example: score >= 90, priority >= 1
     */
    GREATER_EQUAL = ">=",
    /**
     * Less than comparison.
     *
     * Returns true if state value is less than the target value.
     * Supported by: NUMBER states only
     * Example: score < 60, workload < 5.0
     */
    LESS_THAN = "<",
    /**
     * Less than or equal comparison.
     *
     * Returns true if state value is less than or equal to the target value.
     * Supported by: NUMBER states only
     * Example: score <= 50, priority <= 3
     */
    LESS_EQUAL = "<="
}
/**
 * Check if a comparison operation requires numeric values.
 */
export declare function isNumericComparison(comparison: StateComparison): boolean;
/**
 * Get the symbol representation of a comparison operation.
 */
export declare function getComparisonSymbol(comparison: StateComparison): string;
/**
 * Evaluate a comparison operation between two values.
 *
 * @throws Error if the comparison is invalid for the value types
 */
export declare function evaluateComparison(comparison: StateComparison, stateValue: number | string | boolean, targetValue: number | string | boolean): boolean;
/**
 * Get list of supported comparisons for a given state type.
 */
export declare function getSupportedComparisonsForType(stateType: StateType): StateComparison[];
/**
 * Validate that a comparison is supported for a given state type.
 */
export declare function validateComparisonForType(comparison: StateComparison, stateType: StateType): boolean;
/**
 * Get a human-readable description of what the comparison does.
 */
export declare function getComparisonDescription(comparison: StateComparison): string;
//# sourceMappingURL=StateComparison.d.ts.map
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
export enum StateComparison {
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
export function isNumericComparison(comparison: StateComparison): boolean {
    return comparison === StateComparison.GREATER_THAN ||
           comparison === StateComparison.GREATER_EQUAL ||
           comparison === StateComparison.LESS_THAN ||
           comparison === StateComparison.LESS_EQUAL;
}

/**
 * Get the symbol representation of a comparison operation.
 */
export function getComparisonSymbol(comparison: StateComparison): string {
    return comparison;
}

/**
 * Evaluate a comparison operation between two values.
 *
 * @throws Error if the comparison is invalid for the value types
 */
export function evaluateComparison(
    comparison: StateComparison,
    stateValue: number | string | boolean,
    targetValue: number | string | boolean
): boolean {
    // Validate numeric comparisons
    if (isNumericComparison(comparison)) {
        if (typeof stateValue !== 'number' || typeof targetValue !== 'number') {
            throw new Error(
                `Comparison ${comparison} requires numeric values, ` +
                `got ${typeof stateValue} and ${typeof targetValue}`
            );
        }
    }

    // Perform comparison
    switch (comparison) {
        case StateComparison.EQUAL:
            return stateValue === targetValue;
        case StateComparison.NOT_EQUAL:
            return stateValue !== targetValue;
        case StateComparison.GREATER_THAN:
            return (stateValue as number) > (targetValue as number);
        case StateComparison.GREATER_EQUAL:
            return (stateValue as number) >= (targetValue as number);
        case StateComparison.LESS_THAN:
            return (stateValue as number) < (targetValue as number);
        case StateComparison.LESS_EQUAL:
            return (stateValue as number) <= (targetValue as number);
        default:
            throw new Error(`Unknown comparison operation: ${comparison}`);
    }
}

/**
 * Get list of supported comparisons for a given state type.
 */
export function getSupportedComparisonsForType(stateType: StateType): StateComparison[] {
    // All types support equality comparisons
    const comparisons: StateComparison[] = [
        StateComparison.EQUAL,
        StateComparison.NOT_EQUAL
    ];

    // NUMBER types also support ordering comparisons
    if (stateType === StateType.NUMBER) {
        comparisons.push(
            StateComparison.GREATER_THAN,
            StateComparison.GREATER_EQUAL,
            StateComparison.LESS_THAN,
            StateComparison.LESS_EQUAL
        );
    }

    return comparisons;
}

/**
 * Validate that a comparison is supported for a given state type.
 */
export function validateComparisonForType(comparison: StateComparison, stateType: StateType): boolean {
    const supportedComparisons = getSupportedComparisonsForType(stateType);
    return supportedComparisons.includes(comparison);
}

/**
 * Get a human-readable description of what the comparison does.
 */
export function getComparisonDescription(comparison: StateComparison): string {
    const descriptions: Record<StateComparison, string> = {
        [StateComparison.EQUAL]: "Check if the state value equals the target value",
        [StateComparison.NOT_EQUAL]: "Check if the state value does not equal the target value",
        [StateComparison.GREATER_THAN]: "Check if the state value is greater than the target value",
        [StateComparison.GREATER_EQUAL]: "Check if the state value is greater than or equal to the target value",
        [StateComparison.LESS_THAN]: "Check if the state value is less than the target value",
        [StateComparison.LESS_EQUAL]: "Check if the state value is less than or equal to the target value"
    };
    return descriptions[comparison] || "Unknown comparison";
}

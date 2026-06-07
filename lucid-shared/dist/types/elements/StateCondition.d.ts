/**
 * StateCondition class for defining state-based routing conditions.
 *
 * This module provides the StateCondition class that encapsulates
 * the logic for evaluating state conditions in STATE_CONDITION routing.
 */
import { StateComparison } from './StateComparison';
import { StateType } from './StateType';
/**
 * Definition of a state condition for STATE_CONDITION routing.
 *
 * StateCondition encapsulates the logic for evaluating whether an entity's
 * state meets a specific condition (e.g., "priority >= 5" or "color == red").
 */
export declare class StateCondition {
    /**
     * Name of the state to evaluate (must match a state defined for the entity)
     */
    stateName: string;
    /**
     * Comparison operation to perform (==, !=, >, >=, <, <=)
     */
    comparison: StateComparison;
    /**
     * Target value to compare the state against
     */
    value: number | string | boolean;
    constructor(stateName: string, comparison: StateComparison, value: number | string | boolean);
    /**
     * Validate the state condition for consistency and correctness.
     *
     * @throws Error if validation fails with descriptive error message
     */
    validate(): void;
    /**
     * Evaluate the state condition against an entity's state value.
     *
     * @param entityStateValue The current value of the entity's state
     * @returns True if the condition is satisfied, false otherwise
     * @throws Error if the comparison is invalid for the value types
     */
    evaluate(entityStateValue: number | string | boolean): boolean;
    /**
     * Check if this condition is compatible with a given state type.
     *
     * @param stateType The StateType to check compatibility against
     * @returns True if the condition is compatible, false otherwise
     */
    isCompatibleWithStateType(stateType: StateType): boolean;
    /**
     * Get a human-readable description of this state condition.
     *
     * @returns String description of the condition
     */
    getDescription(): string;
    /**
     * Serialize StateCondition to plain object for JSON export.
     *
     * @returns Plain object representation of the StateCondition
     */
    toJSON(): any;
    /**
     * Deserialize StateCondition from plain object (from JSON import).
     *
     * @param data Plain object containing StateCondition data
     * @returns New StateCondition instance
     * @throws Error if required fields are missing or invalid
     */
    static fromJSON(data: any): StateCondition;
    toString(): string;
}
/**
 * Convenience function to create an equality state condition.
 *
 * @param stateName Name of the state to check
 * @param value Value to check equality against
 * @returns New StateCondition with EQUAL comparison
 */
export declare function createEqualCondition(stateName: string, value: number | string | boolean): StateCondition;
/**
 * Convenience function to create a greater-than state condition.
 *
 * @param stateName Name of the state to check
 * @param value Numeric value to compare against
 * @returns New StateCondition with GREATER_THAN comparison
 * @throws Error if value is not numeric
 */
export declare function createGreaterThanCondition(stateName: string, value: number): StateCondition;
/**
 * Convenience function to create a less-than state condition.
 *
 * @param stateName Name of the state to check
 * @param value Numeric value to compare against
 * @returns New StateCondition with LESS_THAN comparison
 * @throws Error if value is not numeric
 */
export declare function createLessThanCondition(stateName: string, value: number): StateCondition;
/**
 * Convenience function to create a greater-than-or-equal state condition.
 *
 * @param stateName Name of the state to check
 * @param value Numeric value to compare against
 * @returns New StateCondition with GREATER_EQUAL comparison
 * @throws Error if value is not numeric
 */
export declare function createGreaterEqualCondition(stateName: string, value: number): StateCondition;
/**
 * Convenience function to create a less-than-or-equal state condition.
 *
 * @param stateName Name of the state to check
 * @param value Numeric value to compare against
 * @returns New StateCondition with LESS_EQUAL comparison
 * @throws Error if value is not numeric
 */
export declare function createLessEqualCondition(stateName: string, value: number): StateCondition;
//# sourceMappingURL=StateCondition.d.ts.map
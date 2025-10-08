/**
 * StateCondition class for defining state-based routing conditions.
 *
 * This module provides the StateCondition class that encapsulates
 * the logic for evaluating state conditions in STATE_CONDITION routing.
 */

import { StateComparison, evaluateComparison, validateComparisonForType } from './StateComparison';
import { StateType } from './StateType';

/**
 * Definition of a state condition for STATE_CONDITION routing.
 *
 * StateCondition encapsulates the logic for evaluating whether an entity's
 * state meets a specific condition (e.g., "priority >= 5" or "color == red").
 */
export class StateCondition {
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

    constructor(
        stateName: string,
        comparison: StateComparison,
        value: number | string | boolean
    ) {
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
    validate(): void {
        // State name validation
        if (!this.stateName) {
            throw new Error("State name cannot be empty");
        }

        if (typeof this.stateName !== 'string') {
            throw new Error(`State name must be a string, got ${typeof this.stateName}`);
        }

        // Comparison validation
        if (!Object.values(StateComparison).includes(this.comparison)) {
            throw new Error(`Invalid comparison operator: ${this.comparison}`);
        }

        // Value validation - check that it's a supported type
        const valueType = typeof this.value;
        if (valueType !== 'number' && valueType !== 'string' && valueType !== 'boolean') {
            throw new Error(
                `Value must be number, string, or boolean, got ${valueType}`
            );
        }
    }

    /**
     * Evaluate the state condition against an entity's state value.
     *
     * @param entityStateValue The current value of the entity's state
     * @returns True if the condition is satisfied, false otherwise
     * @throws Error if the comparison is invalid for the value types
     */
    evaluate(entityStateValue: number | string | boolean): boolean {
        try {
            return evaluateComparison(this.comparison, entityStateValue, this.value);
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            throw new Error(
                `Failed to evaluate condition '${this.stateName} ${this.comparison} ${this.value}' ` +
                `with entity state value '${entityStateValue}': ${message}`
            );
        }
    }

    /**
     * Check if this condition is compatible with a given state type.
     *
     * @param stateType The StateType to check compatibility against
     * @returns True if the condition is compatible, false otherwise
     */
    isCompatibleWithStateType(stateType: StateType): boolean {
        return validateComparisonForType(this.comparison, stateType);
    }

    /**
     * Get a human-readable description of this state condition.
     *
     * @returns String description of the condition
     */
    getDescription(): string {
        return `${this.stateName} ${this.comparison} ${this.value}`;
    }

    /**
     * Serialize StateCondition to plain object for JSON export.
     *
     * @returns Plain object representation of the StateCondition
     */
    toJSON(): any {
        return {
            stateName: this.stateName,
            comparison: this.comparison,
            value: this.value
        };
    }

    /**
     * Deserialize StateCondition from plain object (from JSON import).
     *
     * @param data Plain object containing StateCondition data
     * @returns New StateCondition instance
     * @throws Error if required fields are missing or invalid
     */
    static fromJSON(data: any): StateCondition {
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
        let comparison: StateComparison;
        try {
            comparison = data.comparison as StateComparison;
            if (!Object.values(StateComparison).includes(comparison)) {
                throw new Error(`Invalid comparison operator: '${data.comparison}'`);
            }
        } catch (e) {
            throw new Error(`Invalid comparison operator: '${data.comparison}'`);
        }

        return new StateCondition(
            data.stateName,
            comparison,
            data.value
        );
    }

    toString(): string {
        return `StateCondition(${this.getDescription()})`;
    }
}

/**
 * Convenience function to create an equality state condition.
 *
 * @param stateName Name of the state to check
 * @param value Value to check equality against
 * @returns New StateCondition with EQUAL comparison
 */
export function createEqualCondition(
    stateName: string,
    value: number | string | boolean
): StateCondition {
    return new StateCondition(stateName, StateComparison.EQUAL, value);
}

/**
 * Convenience function to create a greater-than state condition.
 *
 * @param stateName Name of the state to check
 * @param value Numeric value to compare against
 * @returns New StateCondition with GREATER_THAN comparison
 * @throws Error if value is not numeric
 */
export function createGreaterThanCondition(
    stateName: string,
    value: number
): StateCondition {
    if (typeof value !== 'number') {
        throw new Error(`Greater than comparison requires numeric value, got ${typeof value}`);
    }
    return new StateCondition(stateName, StateComparison.GREATER_THAN, value);
}

/**
 * Convenience function to create a less-than state condition.
 *
 * @param stateName Name of the state to check
 * @param value Numeric value to compare against
 * @returns New StateCondition with LESS_THAN comparison
 * @throws Error if value is not numeric
 */
export function createLessThanCondition(
    stateName: string,
    value: number
): StateCondition {
    if (typeof value !== 'number') {
        throw new Error(`Less than comparison requires numeric value, got ${typeof value}`);
    }
    return new StateCondition(stateName, StateComparison.LESS_THAN, value);
}

/**
 * Convenience function to create a greater-than-or-equal state condition.
 *
 * @param stateName Name of the state to check
 * @param value Numeric value to compare against
 * @returns New StateCondition with GREATER_EQUAL comparison
 * @throws Error if value is not numeric
 */
export function createGreaterEqualCondition(
    stateName: string,
    value: number
): StateCondition {
    if (typeof value !== 'number') {
        throw new Error(`Greater equal comparison requires numeric value, got ${typeof value}`);
    }
    return new StateCondition(stateName, StateComparison.GREATER_EQUAL, value);
}

/**
 * Convenience function to create a less-than-or-equal state condition.
 *
 * @param stateName Name of the state to check
 * @param value Numeric value to compare against
 * @returns New StateCondition with LESS_EQUAL comparison
 * @throws Error if value is not numeric
 */
export function createLessEqualCondition(
    stateName: string,
    value: number
): StateCondition {
    if (typeof value !== 'number') {
        throw new Error(`Less equal comparison requires numeric value, got ${typeof value}`);
    }
    return new StateCondition(stateName, StateComparison.LESS_EQUAL, value);
}

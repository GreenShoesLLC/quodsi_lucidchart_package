/**
 * State class for defining state structure and constraints.
 *
 * This module provides the State class that serves as the template
 * from which StateInstances are created during simulation runtime.
 */
import { SimulationObject } from './SimulationObject';
import { SimulationObjectType } from './SimulationObjectType';
import { ComponentType } from './ComponentType';
import { StateType } from './StateType';
import { StateOperation } from './StateOperation';
/**
 * Definition of a state that can be attached to simulation components.
 *
 * State serves as the template from which StateInstances are created
 * during simulation runtime. It defines the structure, constraints, and
 * initial values for state data.
 */
export declare class State implements SimulationObject {
    type: SimulationObjectType;
    /**
     * Unique identifier for this state definition
     */
    id: string;
    /**
     * Human-readable state name that must be a valid identifier
     */
    name: string;
    /**
     * Which component type owns this state (MODEL, ENTITY, RESOURCE, ACTIVITY)
     */
    componentType: ComponentType;
    /**
     * Type of data stored (NUMBER, STRING, BOOLEAN, CATEGORY)
     */
    dataType: StateType;
    /**
     * Initial value that must match the data_type
     */
    initialValue: number | string | boolean;
    /**
     * Valid values for CATEGORY type states (required for CATEGORY type)
     */
    categoryValues?: string[];
    /**
     * Human-readable description of the state's purpose
     */
    description?: string;
    /**
     * Whether to track changes for statistics (Phase 2+ feature)
     */
    collectStatistics: boolean;
    constructor(id: string, name: string, componentType: ComponentType, dataType: StateType, initialValue: number | string | boolean, options?: {
        categoryValues?: string[];
        description?: string;
        collectStatistics?: boolean;
    });
    /**
     * Validate state definition for consistency and correctness.
     *
     * @throws Error if validation fails with descriptive error message
     */
    validate(): void;
    /**
     * Check if a name is a valid identifier.
     */
    private isValidIdentifier;
    /**
     * Validate that initial_value matches the declared data_type.
     *
     * @throws Error if initial value type doesn't match data_type
     */
    private validateInitialValue;
    /**
     * Validate category-specific constraints for CATEGORY states.
     *
     * @throws Error if category constraints are invalid
     */
    private validateCategoryConstraints;
    /**
     * Check if this state supports arithmetic operations.
     *
     * @returns True if arithmetic operations (+=, -=, *=, /=) are supported
     */
    isArithmeticSupported(): boolean;
    /**
     * Get list of operation symbols supported by this state.
     *
     * @returns Array of operation symbols this state type supports
     */
    getSupportedOperations(): StateOperation[];
    /**
     * Validate that a value is compatible with this state definition.
     *
     * @param value The value to validate
     * @returns True if the value is valid for this state
     * @throws Error if the value is invalid with descriptive message
     */
    validateValue(value: number | string | boolean): boolean;
    /**
     * Serialize State to plain object for JSON export.
     *
     * @returns Plain object representation of the State
     */
    toJSON(): any;
    /**
     * Deserialize State from plain object (from JSON import).
     *
     * @param data Plain object containing State data
     * @returns New State instance
     * @throws Error if required fields are missing or invalid
     */
    static fromJSON(data: any): State;
    toString(): string;
}
/**
 * Convenience function to create a NUMBER state.
 */
export declare function createNumberState(id: string, name: string, componentType: ComponentType, initialValue?: number, description?: string): State;
/**
 * Convenience function to create a STRING state.
 */
export declare function createStringState(id: string, name: string, componentType: ComponentType, initialValue?: string, description?: string): State;
/**
 * Convenience function to create a BOOLEAN state.
 */
export declare function createBooleanState(id: string, name: string, componentType: ComponentType, initialValue?: boolean, description?: string): State;
/**
 * Convenience function to create a CATEGORY state.
 */
export declare function createCategoryState(id: string, name: string, componentType: ComponentType, categoryValues: string[], initialValue?: string, description?: string): State;
//# sourceMappingURL=State.d.ts.map
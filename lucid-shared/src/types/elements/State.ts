/**
 * State class for defining state structure and constraints.
 *
 * This module provides the State class that serves as the template
 * from which StateInstances are created during simulation runtime.
 */

import { SimulationObject } from './SimulationObject';
import { SimulationObjectType } from './SimulationObjectType';
import { ComponentType } from './ComponentType';
import { StateType, validateValueType } from './StateType';
import { StateOperation } from './StateOperation';

/**
 * Definition of a state that can be attached to simulation components.
 *
 * State serves as the template from which StateInstances are created
 * during simulation runtime. It defines the structure, constraints, and
 * initial values for state data.
 */
export class State implements SimulationObject {
    type: SimulationObjectType = SimulationObjectType.None;

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
    collectStatistics: boolean = true;

    constructor(
        id: string,
        name: string,
        componentType: ComponentType,
        dataType: StateType,
        initialValue: number | string | boolean,
        options?: {
            categoryValues?: string[];
            description?: string;
            collectStatistics?: boolean;
        }
    ) {
        this.id = id;
        this.name = name;
        this.componentType = componentType;
        this.dataType = dataType;
        this.initialValue = initialValue;
        this.categoryValues = options?.categoryValues;
        this.description = options?.description;
        this.collectStatistics = options?.collectStatistics ?? true;

        this.validate();
    }

    /**
     * Validate state definition for consistency and correctness.
     *
     * @throws Error if validation fails with descriptive error message
     */
    validate(): void {
        // Name validation
        if (!this.name) {
            throw new Error("State name cannot be empty");
        }

        if (!this.isValidIdentifier(this.name)) {
            throw new Error(
                `State name '${this.name}' must be a valid identifier ` +
                `(start with letter/underscore, contain only letters/digits/underscores)`
            );
        }

        // Initial value must match data type
        this.validateInitialValue();

        // Category-specific validation
        if (this.dataType === StateType.CATEGORY) {
            this.validateCategoryConstraints();
        }
    }

    /**
     * Check if a name is a valid identifier.
     */
    private isValidIdentifier(name: string): boolean {
        // Must start with letter or underscore
        // Can contain letters, digits, underscores
        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
    }

    /**
     * Validate that initial_value matches the declared data_type.
     *
     * @throws Error if initial value type doesn't match data_type
     */
    private validateInitialValue(): void {
        const isValid = (() => {
            switch (this.dataType) {
                case StateType.NUMBER:
                    return typeof this.initialValue === 'number';
                case StateType.STRING:
                    return typeof this.initialValue === 'string';
                case StateType.BOOLEAN:
                    return typeof this.initialValue === 'boolean';
                case StateType.CATEGORY:
                    return typeof this.initialValue === 'string';
                default:
                    return false;
            }
        })();

        if (!isValid) {
            const expectedType = (() => {
                switch (this.dataType) {
                    case StateType.NUMBER: return "number";
                    case StateType.STRING: return "string";
                    case StateType.BOOLEAN: return "boolean";
                    case StateType.CATEGORY: return "string";
                    default: return "unknown";
                }
            })();

            throw new Error(
                `${this.dataType} state '${this.name}' initial_value ` +
                `must be ${expectedType}, got ${typeof this.initialValue}`
            );
        }
    }

    /**
     * Validate category-specific constraints for CATEGORY states.
     *
     * @throws Error if category constraints are invalid
     */
    private validateCategoryConstraints(): void {
        if (!this.categoryValues) {
            throw new Error(
                `CATEGORY state '${this.name}' must specify categoryValues array`
            );
        }

        if (!Array.isArray(this.categoryValues)) {
            throw new Error(
                `CATEGORY state '${this.name}' categoryValues must be an array`
            );
        }

        if (this.categoryValues.length < 2) {
            throw new Error(
                `CATEGORY state '${this.name}' must have at least 2 categoryValues, ` +
                `got ${this.categoryValues.length}`
            );
        }

        // Check for duplicates
        const uniqueValues = new Set(this.categoryValues);
        if (uniqueValues.size !== this.categoryValues.length) {
            const duplicates = this.categoryValues.filter(
                (val, idx) => this.categoryValues!.indexOf(val) !== idx
            );
            throw new Error(
                `CATEGORY state '${this.name}' has duplicate categoryValues: ${duplicates.join(', ')}`
            );
        }

        // All category values must be strings
        const nonStrings = this.categoryValues.filter(val => typeof val !== 'string');
        if (nonStrings.length > 0) {
            throw new Error(
                `CATEGORY state '${this.name}' categoryValues must all be strings, ` +
                `found non-strings: ${nonStrings.join(', ')}`
            );
        }

        // Initial value must be in category list
        if (!this.categoryValues.includes(this.initialValue as string)) {
            throw new Error(
                `CATEGORY state '${this.name}' initialValue '${this.initialValue}' ` +
                `not in categoryValues [${this.categoryValues.join(', ')}]`
            );
        }
    }

    /**
     * Check if this state supports arithmetic operations.
     *
     * @returns True if arithmetic operations (+=, -=, *=, /=) are supported
     */
    isArithmeticSupported(): boolean {
        return this.dataType === StateType.NUMBER;
    }

    /**
     * Get list of operation symbols supported by this state.
     *
     * @returns Array of operation symbols this state type supports
     */
    getSupportedOperations(): StateOperation[] {
        if (this.dataType === StateType.NUMBER) {
            return [
                StateOperation.ASSIGN,
                StateOperation.ADD,
                StateOperation.SUBTRACT,
                StateOperation.MULTIPLY,
                StateOperation.DIVIDE
            ];
        } else {
            return [StateOperation.ASSIGN];
        }
    }

    /**
     * Validate that a value is compatible with this state definition.
     *
     * @param value The value to validate
     * @returns True if the value is valid for this state
     * @throws Error if the value is invalid with descriptive message
     */
    validateValue(value: number | string | boolean): boolean {
        // Type validation
        if (this.dataType === StateType.NUMBER) {
            if (typeof value !== 'number') {
                throw new Error(
                    `NUMBER state '${this.name}' requires number value, ` +
                    `got ${typeof value}`
                );
            }
        } else if (this.dataType === StateType.STRING) {
            if (typeof value !== 'string') {
                throw new Error(
                    `STRING state '${this.name}' requires string value, ` +
                    `got ${typeof value}`
                );
            }
        } else if (this.dataType === StateType.BOOLEAN) {
            if (typeof value !== 'boolean') {
                throw new Error(
                    `BOOLEAN state '${this.name}' requires boolean value, ` +
                    `got ${typeof value}`
                );
            }
        } else if (this.dataType === StateType.CATEGORY) {
            if (typeof value !== 'string') {
                throw new Error(
                    `CATEGORY state '${this.name}' requires string value, ` +
                    `got ${typeof value}`
                );
            }
            if (this.categoryValues && !this.categoryValues.includes(value)) {
                throw new Error(
                    `CATEGORY state '${this.name}' value '${value}' not in ` +
                    `categoryValues [${this.categoryValues.join(', ')}]`
                );
            }
        }

        return true;
    }

    /**
     * Serialize State to plain object for JSON export.
     *
     * @returns Plain object representation of the State
     */
    toJSON(): any {
        const result: any = {
            id: this.id,
            name: this.name,
            componentType: this.componentType,
            dataType: this.dataType,
            initialValue: this.initialValue
        };

        // Add optional fields only if they have non-default values
        if (this.categoryValues !== undefined) {
            result.categoryValues = this.categoryValues;
        }
        if (this.description !== undefined) {
            result.description = this.description;
        }
        if (!this.collectStatistics) { // Only if not default (true)
            result.collectStatistics = this.collectStatistics;
        }

        return result;
    }

    /**
     * Deserialize State from plain object (from JSON import).
     *
     * @param data Plain object containing State data
     * @returns New State instance
     * @throws Error if required fields are missing or invalid
     */
    static fromJSON(data: any): State {
        // Extract required fields
        if (!data.id) {
            throw new Error("Missing required field 'id' in State data");
        }
        if (!data.name) {
            throw new Error("Missing required field 'name' in State data");
        }
        if (!data.componentType) {
            throw new Error("Missing required field 'componentType' in State data");
        }
        if (!data.dataType) {
            throw new Error("Missing required field 'dataType' in State data");
        }
        if (data.initialValue === undefined || data.initialValue === null) {
            throw new Error("Missing required field 'initialValue' in State data");
        }

        // Convert enum strings
        const componentType = data.componentType as ComponentType;
        const dataType = data.dataType as StateType;

        // Validate enums
        if (!Object.values(ComponentType).includes(componentType)) {
            throw new Error(`Invalid componentType '${data.componentType}' in State data`);
        }
        if (!Object.values(StateType).includes(dataType)) {
            throw new Error(`Invalid dataType '${data.dataType}' in State data`);
        }

        // Create instance (validation happens in constructor)
        return new State(
            data.id,
            data.name,
            componentType,
            dataType,
            data.initialValue,
            {
                categoryValues: data.categoryValues,
                description: data.description,
                collectStatistics: data.collectStatistics ?? true
            }
        );
    }

    toString(): string {
        return `State(name='${this.name}', componentType=${this.componentType}, dataType=${this.dataType}, initialValue=${this.initialValue})`;
    }
}

/**
 * Convenience function to create a NUMBER state.
 */
export function createNumberState(
    id: string,
    name: string,
    componentType: ComponentType,
    initialValue: number = 0,
    description?: string
): State {
    return new State(id, name, componentType, StateType.NUMBER, initialValue, { description });
}

/**
 * Convenience function to create a STRING state.
 */
export function createStringState(
    id: string,
    name: string,
    componentType: ComponentType,
    initialValue: string = "",
    description?: string
): State {
    return new State(id, name, componentType, StateType.STRING, initialValue, { description });
}

/**
 * Convenience function to create a BOOLEAN state.
 */
export function createBooleanState(
    id: string,
    name: string,
    componentType: ComponentType,
    initialValue: boolean = false,
    description?: string
): State {
    return new State(id, name, componentType, StateType.BOOLEAN, initialValue, { description });
}

/**
 * Convenience function to create a CATEGORY state.
 */
export function createCategoryState(
    id: string,
    name: string,
    componentType: ComponentType,
    categoryValues: string[],
    initialValue?: string,
    description?: string
): State {
    if (!categoryValues || categoryValues.length === 0) {
        throw new Error("categoryValues cannot be empty");
    }

    const initValue = initialValue ?? categoryValues[0];

    return new State(
        id,
        name,
        componentType,
        StateType.CATEGORY,
        initValue,
        { categoryValues, description }
    );
}

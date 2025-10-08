/**
 * StateModification class for defining state value changes during simulation.
 *
 * This module provides the StateModification class that defines how to modify
 * state values during simulation execution with type safety and cross-component
 * access capabilities.
 */

import { StateOperation, validateOperationForType } from './StateOperation';
import { ComponentType } from './ComponentType';
import { StateType } from './StateType';
import { State } from './State';

/**
 * Defines how to modify a state value during simulation execution.
 *
 * StateModification provides type-safe operations, proper state references,
 * and cross-component access capabilities for the state management system.
 */
export class StateModification {
    /**
     * Unique identifier of the state to modify
     */
    stateUniqueId: string;

    /**
     * Name of the state for runtime component-local lookups
     */
    stateName: string;

    /**
     * Operation to perform on the state value
     */
    operation: StateOperation;

    /**
     * Value to use in the operation
     */
    value: number | string | boolean;

    /**
     * Specific component instance ID for cross-component access
     */
    componentUniqueId?: string;

    /**
     * Explicit component type targeting for cross-component access
     */
    targetComponentType?: ComponentType;

    constructor(
        stateUniqueId: string,
        stateName: string,
        operation: StateOperation,
        value: number | string | boolean,
        options?: {
            componentUniqueId?: string;
            targetComponentType?: ComponentType;
        }
    ) {
        this.stateUniqueId = stateUniqueId;
        this.stateName = stateName;
        this.operation = operation;
        this.value = value;
        this.componentUniqueId = options?.componentUniqueId;
        this.targetComponentType = options?.targetComponentType;
    }

    /**
     * Resolve target component type from explicit field or state_unique_id pattern.
     *
     * @returns ComponentType indicating which type of component owns the target state
     */
    getTargetComponentType(): ComponentType {
        if (this.targetComponentType) {
            return this.targetComponentType;
        }

        // Fallback: infer from state_unique_id naming convention
        return this.inferComponentTypeFromUniqueId();
    }

    /**
     * Infer component type from state_unique_id naming pattern.
     *
     * Expected pattern: "state_name_COMPONENTTYPE_###"
     *
     * @returns ComponentType inferred from the unique_id pattern
     */
    private inferComponentTypeFromUniqueId(): ComponentType {
        const parts = this.stateUniqueId.split("_");
        if (parts.length >= 2) {
            const componentTypeStr = parts[parts.length - 2].toUpperCase();

            // Try to match to ComponentType
            if (componentTypeStr === "MODEL") return ComponentType.MODEL;
            if (componentTypeStr === "ENTITY") return ComponentType.ENTITY;
            if (componentTypeStr === "RESOURCE") return ComponentType.RESOURCE;
            if (componentTypeStr === "ACTIVITY") return ComponentType.ACTIVITY;
        }

        // Default fallback - assume entity state if pattern unclear
        return ComponentType.ENTITY;
    }

    /**
     * Validate modification against available state definitions.
     *
     * @param availableStates Dictionary of state definitions keyed by unique_id
     * @throws Error if validation fails with descriptive error message
     */
    validate(availableStates: Map<string, State>): void {
        // Find state definition by unique_id
        const state = this.findStateByUniqueId(availableStates);

        // Validate operation is supported for state type
        this.validateOperationForType(state);

        // Validate value type matches state type
        this.validateValueType(state);

        // Validate cross-component access if specified
        if (this.componentUniqueId || this.targetComponentType) {
            this.validateCrossComponentAccess(state);
        }
    }

    /**
     * Find state definition by unique_id.
     *
     * @param availableStates Map of state definitions
     * @returns State matching the state_unique_id
     * @throws Error if state not found
     */
    private findStateByUniqueId(availableStates: Map<string, State>): State {
        const state = availableStates.get(this.stateUniqueId);
        if (!state) {
            // Also try searching by id match
            for (const s of Array.from(availableStates.values())) {
                if (s.id === this.stateUniqueId) {
                    return s;
                }
            }
            throw new Error(
                `State with unique_id '${this.stateUniqueId}' not found in model`
            );
        }
        return state;
    }

    /**
     * Validate operation is supported for the state's data type.
     *
     * @param state The State to validate against
     * @throws Error if operation is not supported for the state type
     */
    private validateOperationForType(state: State): void {
        if (!validateOperationForType(this.operation, state.dataType)) {
            if (state.dataType === StateType.NUMBER) {
                throw new Error(
                    `Invalid operation '${this.operation}' for NUMBER state`
                );
            } else {
                throw new Error(
                    `Operation '${this.operation}' not supported for ${state.dataType} state. ` +
                    `Only assignment (=) is supported for non-numeric state types.`
                );
            }
        }
    }

    /**
     * Validate modification value matches state data type.
     *
     * @param state The State to validate against
     * @throws Error if value type doesn't match state type
     */
    private validateValueType(state: State): void {
        if (state.dataType === StateType.NUMBER) {
            if (typeof this.value !== 'number') {
                throw new Error(
                    `NUMBER state '${state.name}' modification value must be numeric, ` +
                    `got ${typeof this.value}`
                );
            }
        } else if (state.dataType === StateType.STRING) {
            if (typeof this.value !== 'string') {
                throw new Error(
                    `STRING state '${state.name}' modification value must be string, ` +
                    `got ${typeof this.value}`
                );
            }
        } else if (state.dataType === StateType.BOOLEAN) {
            if (typeof this.value !== 'boolean') {
                throw new Error(
                    `BOOLEAN state '${state.name}' modification value must be boolean, ` +
                    `got ${typeof this.value}`
                );
            }
        } else if (state.dataType === StateType.CATEGORY) {
            if (typeof this.value !== 'string') {
                throw new Error(
                    `CATEGORY state '${state.name}' modification value must be string, ` +
                    `got ${typeof this.value}`
                );
            }
            if (state.categoryValues && !state.categoryValues.includes(this.value)) {
                throw new Error(
                    `CATEGORY state '${state.name}' modification value '${this.value}' ` +
                    `not in valid values [${state.categoryValues.join(', ')}]`
                );
            }
        }
    }

    /**
     * Validate cross-component state access permissions.
     *
     * @param state The State to validate against
     * @throws Error if cross-component access is invalid
     */
    private validateCrossComponentAccess(state: State): void {
        const targetType = this.getTargetComponentType();

        // Validate that target component type matches state definition
        if (state.componentType !== targetType) {
            throw new Error(
                `State modification targets ${targetType} component but ` +
                `state '${this.stateUniqueId}' belongs to ${state.componentType} component`
            );
        }

        // Validate specific component instance exists (if specified)
        if (this.componentUniqueId &&
            (targetType === ComponentType.RESOURCE || targetType === ComponentType.ACTIVITY)) {
            // Note: Full validation requires access to model instance
            // This will be completed during model-level validation
        }
    }

    /**
     * Serialize StateModification to plain object for JSON export.
     *
     * @returns Plain object representation of the StateModification
     */
    toJSON(): any {
        const result: any = {
            stateUniqueId: this.stateUniqueId,
            stateName: this.stateName,
            operation: this.operation,
            value: this.value
        };

        // Add optional fields only if they have values
        if (this.componentUniqueId !== undefined) {
            result.componentUniqueId = this.componentUniqueId;
        }
        if (this.targetComponentType !== undefined) {
            result.targetComponentType = this.targetComponentType;
        }

        return result;
    }

    /**
     * Deserialize StateModification from plain object (from JSON import).
     *
     * @param data Plain object containing StateModification data
     * @returns New StateModification instance
     * @throws Error if required fields are missing or invalid
     */
    static fromJSON(data: any): StateModification {
        // Extract required fields
        if (!data.stateUniqueId) {
            throw new Error("Missing required field 'stateUniqueId' in StateModification data");
        }
        if (!data.stateName) {
            throw new Error("Missing required field 'stateName' in StateModification data");
        }
        if (!data.operation) {
            throw new Error("Missing required field 'operation' in StateModification data");
        }
        if (data.value === undefined || data.value === null) {
            throw new Error("Missing required field 'value' in StateModification data");
        }

        // Convert operation string to enum
        const operation = data.operation as StateOperation;
        if (!Object.values(StateOperation).includes(operation)) {
            throw new Error(`Invalid operation '${data.operation}' in StateModification data`);
        }

        // Extract optional fields
        let targetComponentType: ComponentType | undefined;
        if (data.targetComponentType) {
            targetComponentType = data.targetComponentType as ComponentType;
            if (!Object.values(ComponentType).includes(targetComponentType)) {
                throw new Error(
                    `Invalid targetComponentType '${data.targetComponentType}' in StateModification data`
                );
            }
        }

        return new StateModification(
            data.stateUniqueId,
            data.stateName,
            operation,
            data.value,
            {
                componentUniqueId: data.componentUniqueId,
                targetComponentType
            }
        );
    }

    toString(): string {
        let targetInfo = "";
        if (this.targetComponentType) {
            targetInfo = `, target=${this.targetComponentType}`;
        }
        if (this.componentUniqueId) {
            targetInfo += `:${this.componentUniqueId}`;
        }

        return `StateModification(state='${this.stateUniqueId}', operation=${this.operation}, value=${this.value}${targetInfo})`;
    }
}

/**
 * Convenience function to create an assignment state modification.
 */
export function createAssignModification(
    stateUniqueId: string,
    stateName: string,
    value: number | string | boolean,
    options?: {
        targetComponentType?: ComponentType;
        componentUniqueId?: string;
    }
): StateModification {
    return new StateModification(
        stateUniqueId,
        stateName,
        StateOperation.ASSIGN,
        value,
        options
    );
}

/**
 * Convenience function to create an increment state modification.
 */
export function createIncrementModification(
    stateUniqueId: string,
    stateName: string,
    value: number = 1,
    options?: {
        targetComponentType?: ComponentType;
        componentUniqueId?: string;
    }
): StateModification {
    return new StateModification(
        stateUniqueId,
        stateName,
        StateOperation.ADD,
        value,
        options
    );
}

/**
 * Convenience function to create a model-level counter increment.
 */
export function createModelCounterIncrement(
    stateUniqueId: string,
    stateName: string,
    value: number = 1
): StateModification {
    return new StateModification(
        stateUniqueId,
        stateName,
        StateOperation.ADD,
        value,
        { targetComponentType: ComponentType.MODEL }
    );
}

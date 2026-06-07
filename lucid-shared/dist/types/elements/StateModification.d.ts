/**
 * StateModification class for defining state value changes during simulation.
 *
 * This module provides the StateModification class that defines how to modify
 * state values during simulation execution with type safety and cross-component
 * access capabilities.
 */
import { StateOperation } from './StateOperation';
import { ComponentType } from './ComponentType';
import { State } from './State';
/**
 * Defines how to modify a state value during simulation execution.
 *
 * StateModification provides type-safe operations, proper state references,
 * and cross-component access capabilities for the state management system.
 */
export declare class StateModification {
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
    /**
     * Distribution type identifier for SAMPLE operations.
     * Examples: "sample_multinomial_one" (CATEGORY), "bernoulli" (BOOLEAN), "normal" (NUMBER)
     */
    distributionType?: string;
    /**
     * Distribution parameters for SAMPLE operations.
     * Structure varies by distribution type:
     * - sample_multinomial_one: { probabilities: { "L1": 0.1, "L2": 0.2, ... } }
     * - bernoulli: { p: 0.3 }
     * - normal: { loc: 5.0, scale: 2.0 }
     */
    distributionParameters?: Record<string, any>;
    constructor(stateUniqueId: string, stateName: string, operation: StateOperation, value: number | string | boolean, options?: {
        componentUniqueId?: string;
        targetComponentType?: ComponentType;
        distributionType?: string;
        distributionParameters?: Record<string, any>;
    });
    /**
     * Resolve target component type from explicit field or state_unique_id pattern.
     *
     * @returns ComponentType indicating which type of component owns the target state
     */
    getTargetComponentType(): ComponentType;
    /**
     * Infer component type from state_unique_id naming pattern.
     *
     * Expected pattern: "state_name_COMPONENTTYPE_###"
     *
     * @returns ComponentType inferred from the unique_id pattern
     */
    private inferComponentTypeFromUniqueId;
    /**
     * Validate modification against available state definitions.
     *
     * @param availableStates Dictionary of state definitions keyed by unique_id
     * @throws Error if validation fails with descriptive error message
     */
    validate(availableStates: Map<string, State>): void;
    /**
     * Validate SAMPLE operation has required distribution configuration.
     *
     * @param state The State to validate against
     * @throws Error if SAMPLE operation is missing required fields
     */
    private validateSampleOperation;
    /**
     * Find state definition by unique_id.
     *
     * @param availableStates Map of state definitions
     * @returns State matching the state_unique_id
     * @throws Error if state not found
     */
    private findStateByUniqueId;
    /**
     * Validate operation is supported for the state's data type.
     *
     * @param state The State to validate against
     * @throws Error if operation is not supported for the state type
     */
    private validateOperationForType;
    /**
     * Validate modification value matches state data type.
     *
     * @param state The State to validate against
     * @throws Error if value type doesn't match state type
     */
    private validateValueType;
    /**
     * Validate cross-component state access permissions.
     *
     * @param state The State to validate against
     * @throws Error if cross-component access is invalid
     */
    private validateCrossComponentAccess;
    /**
     * Serialize StateModification to plain object for JSON export.
     *
     * @returns Plain object representation of the StateModification
     */
    toJSON(): any;
    /**
     * Deserialize StateModification from plain object (from JSON import).
     *
     * @param data Plain object containing StateModification data
     * @returns New StateModification instance
     * @throws Error if required fields are missing or invalid
     */
    static fromJSON(data: any): StateModification;
    toString(): string;
}
/**
 * Convenience function to create an assignment state modification.
 */
export declare function createAssignModification(stateUniqueId: string, stateName: string, value: number | string | boolean, options?: {
    targetComponentType?: ComponentType;
    componentUniqueId?: string;
}): StateModification;
/**
 * Convenience function to create an increment state modification.
 */
export declare function createIncrementModification(stateUniqueId: string, stateName: string, value?: number, options?: {
    targetComponentType?: ComponentType;
    componentUniqueId?: string;
}): StateModification;
/**
 * Convenience function to create a model-level counter increment.
 */
export declare function createModelCounterIncrement(stateUniqueId: string, stateName: string, value?: number): StateModification;
/**
 * Convenience function to create a SAMPLE state modification.
 */
export declare function createSampleModification(stateUniqueId: string, stateName: string, distributionType: string, distributionParameters: Record<string, any>, options?: {
    targetComponentType?: ComponentType;
    componentUniqueId?: string;
}): StateModification;
//# sourceMappingURL=StateModification.d.ts.map
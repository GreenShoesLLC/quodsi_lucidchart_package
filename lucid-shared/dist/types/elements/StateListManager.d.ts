import { ComponentListManager } from "./ComponentListManager";
import { State } from "./State";
import { ComponentType } from "./ComponentType";
/**
 * List manager for State collections.
 *
 * Extends ComponentListManager to provide state-specific functionality
 * including filtering by component type and validation.
 */
export declare class StateListManager extends ComponentListManager<State> {
    constructor();
    /**
     * Get all states for a specific component type.
     *
     * @param componentType ComponentType enum value
     * @returns Array of State objects for that component type
     */
    getByComponentType(componentType: ComponentType): State[];
    /**
     * Get state by unique ID.
     *
     * @param uniqueId The unique_id of the state to find
     * @returns State if found, undefined otherwise
     */
    getByUniqueId(uniqueId: string): State | undefined;
    /**
     * Get all entity state definitions.
     */
    getEntityStates(): State[];
    /**
     * Get all activity state definitions.
     */
    getActivityStates(): State[];
    /**
     * Get all resource state definitions.
     */
    getResourceStates(): State[];
    /**
     * Get all model state definitions.
     */
    getModelStates(): State[];
    /**
     * Add a state definition with validation for duplicate names.
     *
     * @param state State to add
     * @throws Error if state name conflicts with existing state of same component type
     */
    addWithValidation(state: State): void;
    /**
     * Check if a state with the given name exists for a component type.
     *
     * @param name State name to check
     * @param componentType Component type to check within
     * @returns True if a state with that name exists
     */
    hasStateWithName(name: string, componentType: ComponentType): boolean;
    /**
     * Get all states as a map keyed by unique ID.
     *
     * @returns Map of State objects keyed by their id
     */
    getAsMap(): Map<string, State>;
}
//# sourceMappingURL=StateListManager.d.ts.map
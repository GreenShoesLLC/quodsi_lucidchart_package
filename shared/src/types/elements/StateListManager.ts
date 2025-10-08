import { ComponentListManager } from "./ComponentListManager";
import { SimulationObjectType } from "./SimulationObjectType";
import { State } from "./State";
import { ComponentType } from "./ComponentType";

/**
 * List manager for State collections.
 *
 * Extends ComponentListManager to provide state-specific functionality
 * including filtering by component type and validation.
 */
export class StateListManager extends ComponentListManager<State> {
    constructor() {
        super(SimulationObjectType.None);
    }

    /**
     * Get all states for a specific component type.
     *
     * @param componentType ComponentType enum value
     * @returns Array of State objects for that component type
     */
    getByComponentType(componentType: ComponentType): State[] {
        return this.getAll().filter(state => state.componentType === componentType);
    }

    /**
     * Get state by unique ID.
     *
     * @param uniqueId The unique_id of the state to find
     * @returns State if found, undefined otherwise
     */
    getByUniqueId(uniqueId: string): State | undefined {
        // First try direct lookup by id
        const state = this.get(uniqueId);
        if (state) {
            return state;
        }

        // Fall back to searching all states
        return this.getAll().find(s => s.id === uniqueId);
    }

    /**
     * Get all entity state definitions.
     */
    getEntityStates(): State[] {
        return this.getByComponentType(ComponentType.ENTITY);
    }

    /**
     * Get all activity state definitions.
     */
    getActivityStates(): State[] {
        return this.getByComponentType(ComponentType.ACTIVITY);
    }

    /**
     * Get all resource state definitions.
     */
    getResourceStates(): State[] {
        return this.getByComponentType(ComponentType.RESOURCE);
    }

    /**
     * Get all model state definitions.
     */
    getModelStates(): State[] {
        return this.getByComponentType(ComponentType.MODEL);
    }

    /**
     * Add a state definition with validation for duplicate names.
     *
     * @param state State to add
     * @throws Error if state name conflicts with existing state of same component type
     */
    addWithValidation(state: State): void {
        // Check for name conflicts within component type
        const existingStates = this.getByComponentType(state.componentType);
        const nameConflict = existingStates.find(s => s.name === state.name);

        if (nameConflict) {
            throw new Error(
                `State name '${state.name}' already exists for ${state.componentType} components`
            );
        }

        this.add(state);
    }

    /**
     * Check if a state with the given name exists for a component type.
     *
     * @param name State name to check
     * @param componentType Component type to check within
     * @returns True if a state with that name exists
     */
    hasStateWithName(name: string, componentType: ComponentType): boolean {
        const states = this.getByComponentType(componentType);
        return states.some(s => s.name === name);
    }

    /**
     * Get all states as a map keyed by unique ID.
     *
     * @returns Map of State objects keyed by their id
     */
    getAsMap(): Map<string, State> {
        const map = new Map<string, State>();
        for (const state of this.getAll()) {
            map.set(state.id, state);
        }
        return map;
    }
}

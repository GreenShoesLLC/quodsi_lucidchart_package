import { ActivityListManager } from "./ActivityListManager";
import { ConnectorListManager } from "./ConnectorListManager";
import { Entity } from "./Entity";
import { EntityListManager } from "./EntityListManager";
import { GeneratorListManager } from "./GeneratorListManager";
import { Model } from "./Model";
import { ModelDefaults } from "./ModelDefaults";
import { ResourceListManager } from "./ResourceListManager";
import { ResourceRequirementListManager } from "./ResourceRequirementListManager";
import { StateListManager } from "./StateListManager";
import { State } from "./State";
import { ComponentType } from "./ComponentType";
import { StateModification } from "./StateModification";
import { TimePatternListManager } from "./TimePatternListManager";
import { TimeDistributedConfigListManager } from "./TimeDistributedConfigListManager";
import { TimePattern } from "./TimePattern";
import { TimeDistributedConfig } from "./TimeDistributedConfig";
import { SimulationObjectType } from "./SimulationObjectType";
import { ScenarioListManager } from "./ScenarioListManager";

export class ModelDefinition {
    public readonly activities: ActivityListManager;
    public readonly connectors: ConnectorListManager;
    public readonly resources: ResourceListManager;
    public readonly generators: GeneratorListManager;
    public readonly entities: EntityListManager;
    public readonly resourceRequirements: ResourceRequirementListManager;
    public readonly states: StateListManager;
    public readonly timePatterns: TimePatternListManager;
    public readonly timeDistributedConfigs: TimeDistributedConfigListManager;
    public readonly scenarios: ScenarioListManager;

    constructor(
        public readonly model: Model
    ) {
        this.activities = new ActivityListManager();
        this.connectors = new ConnectorListManager();
        this.resources = new ResourceListManager();
        this.resourceRequirements = new ResourceRequirementListManager()
        this.generators = new GeneratorListManager();
        this.entities = new EntityListManager();
        this.states = new StateListManager();
        this.timePatterns = new TimePatternListManager();
        this.timeDistributedConfigs = new TimeDistributedConfigListManager();
        this.scenarios = new ScenarioListManager();

        // Add default entity
        const defaultEntity = new Entity(
            ModelDefaults.DEFAULT_ENTITY_ID,
            ModelDefaults.DEFAULT_ENTITY_NAME
        );
        this.entities.add(defaultEntity);
    }

    get id(): string { return this.model.id; }
    get name(): string { return this.model.name; }

    /**
     * Get all states for a specific component type.
     */
    getStatesByComponentType(componentType: ComponentType): State[] {
        return this.states.getByComponentType(componentType);
    }

    /**
     * Get all entity state definitions.
     */
    getEntityStateDefinitions(): State[] {
        return this.states.getEntityStates();
    }

    /**
     * Get all activity state definitions.
     */
    getActivityStateDefinitions(): State[] {
        return this.states.getActivityStates();
    }

    /**
     * Get all resource state definitions.
     */
    getResourceStateDefinitions(): State[] {
        return this.states.getResourceStates();
    }

    /**
     * Get all model state definitions.
     */
    getModelStateDefinitions(): State[] {
        return this.states.getModelStates();
    }

    /**
     * Get a state definition by its unique_id.
     */
    getStateByUniqueId(uniqueId: string): State | undefined {
        return this.states.getByUniqueId(uniqueId);
    }

    /**
     * Add a state definition to the model.
     *
     * @throws Error if state name conflicts with existing state of same component type
     */
    addStateDefinition(state: State): void {
        this.states.addWithValidation(state);
    }

    /**
     * Validate a list of StateModification objects against this model's state definitions.
     *
     * @throws Error if any modification is invalid
     */
    validateStateModifications(stateModifications: StateModification[]): void {
        // Create lookup map of all states by unique_id
        const availableStates = this.states.getAsMap();

        for (const modification of stateModifications) {
            modification.validate(availableStates);
        }
    }

    /**
     * Validate all state definitions for consistency and correctness.
     *
     * @throws Error if validation fails
     */
    validateStateDefinitions(): void {
        if (this.states.size() === 0) {
            return; // No states to validate
        }

        // Validate each state definition
        for (const state of this.states.getAll()) {
            state.validate();
        }

        // Check for duplicate state names within component types
        const componentStateNames = new Map<ComponentType, Set<string>>();
        componentStateNames.set(ComponentType.MODEL, new Set());
        componentStateNames.set(ComponentType.ENTITY, new Set());
        componentStateNames.set(ComponentType.ACTIVITY, new Set());
        componentStateNames.set(ComponentType.RESOURCE, new Set());

        for (const state of this.states.getAll()) {
            const nameSet = componentStateNames.get(state.componentType)!;
            if (nameSet.has(state.name)) {
                throw new Error(
                    `Duplicate state name '${state.name}' found for ${state.componentType} components`
                );
            }
            nameSet.add(state.name);
        }
    }

    /**
     * Validate all state references throughout model.
     *
     * @throws Error if validation fails
     */
    validateStateReferences(): void {
        // Build state lookup by unique_id
        const stateLookup = this.states.getAsMap();

        // Validate generator initial state modifications
        for (const generator of this.generators.getAll()) {
            const mods = generator.generationConfig?.initialStateModifications;
            if (mods && mods.length > 0) {
                this.validateComponentStateModifications(
                    mods,
                    stateLookup,
                    `Generator '${generator.name}'`
                );
            }
        }

        // Validate activity action state modifications
        for (const activity of this.activities.getAll()) {
            // Validate action state modifications (for actions that support them)
            for (const action of activity.actions) {
                if ('stateModifications' in action && action.stateModifications && action.stateModifications.length > 0) {
                    this.validateComponentStateModifications(
                        action.stateModifications,
                        stateLookup,
                        `Action in Activity '${activity.name}'`
                    );
                }
            }
        }

        // Validate connector state modifications
        for (const connector of this.connectors.getAll()) {
            if (connector.stateModifications && connector.stateModifications.length > 0) {
                this.validateComponentStateModifications(
                    connector.stateModifications,
                    stateLookup,
                    `Connector '${connector.name}'`
                );
            }
        }
    }

    /**
     * Validate state modifications for a specific component.
     *
     * @private
     */
    private validateComponentStateModifications(
        modifications: StateModification[],
        stateLookup: Map<string, State>,
        componentName: string
    ): void {
        for (const modification of modifications) {
            const state = stateLookup.get(modification.stateUniqueId);
            if (!state) {
                throw new Error(
                    `${componentName} references unknown state unique_id: ${modification.stateUniqueId}`
                );
            }

            // Validate the modification against the state definition
            modification.validate(stateLookup);
        }
    }

    /**
     * Validate cross-component state access permissions.
     *
     * @throws Error if validation fails
     */
    validateCrossComponentAccess(): void {
        // This validates that referenced components exist when using cross-component state modifications
        // Currently validates action state modifications and connector state modifications
        for (const activity of this.activities.getAll()) {
            for (const action of activity.actions) {
                if ('stateModifications' in action && action.stateModifications) {
                    for (const modification of action.stateModifications) {
                        if (modification.componentUniqueId) {
                            this.validateComponentReference(modification);
                        }
                    }
                }
            }
        }

        for (const connector of this.connectors.getAll()) {
            if (connector.stateModifications) {
                for (const modification of connector.stateModifications) {
                    if (modification.componentUniqueId) {
                        this.validateComponentReference(modification);
                    }
                }
            }
        }
    }

    /**
     * Validate that referenced component exists.
     *
     * @private
     */
    private validateComponentReference(modification: StateModification): void {
        const state = this.states.getByUniqueId(modification.stateUniqueId);
        if (!state) {
            return; // Already caught by validateStateReferences
        }

        const componentUniqueId = modification.componentUniqueId;
        const componentType = state.componentType;

        if (componentType === ComponentType.RESOURCE) {
            const resource = this.resources.get(componentUniqueId!);
            if (!resource) {
                throw new Error(
                    `State modification references non-existent resource '${componentUniqueId}'`
                );
            }
        } else if (componentType === ComponentType.ACTIVITY) {
            const activity = this.activities.get(componentUniqueId!);
            if (!activity) {
                throw new Error(
                    `State modification references non-existent activity '${componentUniqueId}'`
                );
            }
        }
    }

    /**
     * Checks if a name is unique among objects of the given type.
     * @param type - The simulation object type to check within
     * @param name - The name to check
     * @param excludeId - Optional ID to exclude (for editing existing objects)
     * @returns true if the name is unique, false if it conflicts
     */
    public isNameUniqueForType(
        type: SimulationObjectType,
        name: string,
        excludeId?: string
    ): boolean {
        const objects = this.getObjectsByType(type);
        return !objects.some(obj => obj.name === name && obj.id !== excludeId);
    }

    /**
     * Gets all names currently in use for a given type.
     * @param type - The simulation object type
     * @returns Array of names in use
     */
    public getUsedNamesForType(type: SimulationObjectType): string[] {
        return this.getObjectsByType(type).map(obj => obj.name);
    }

    /**
     * Gets all objects of a given type.
     * @param type - The simulation object type
     * @returns Array of simulation objects
     */
    private getObjectsByType(type: SimulationObjectType): Array<{ id: string; name: string }> {
        switch (type) {
            case SimulationObjectType.Activity:
                return this.activities.getAll();
            case SimulationObjectType.Resource:
                return this.resources.getAll();
            case SimulationObjectType.Generator:
                return this.generators.getAll();
            case SimulationObjectType.Entity:
                return this.entities.getAll();
            case SimulationObjectType.Connector:
                return this.connectors.getAll();
            default:
                return [];
        }
    }
}
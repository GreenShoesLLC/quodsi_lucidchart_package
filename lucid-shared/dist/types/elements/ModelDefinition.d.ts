import { ActivityListManager } from "./ActivityListManager";
import { ConnectorListManager } from "./ConnectorListManager";
import { EntityListManager } from "./EntityListManager";
import { GeneratorListManager } from "./GeneratorListManager";
import { Model } from "./Model";
import { ResourceListManager } from "./ResourceListManager";
import { ResourceRequirementListManager } from "./ResourceRequirementListManager";
import { StateListManager } from "./StateListManager";
import { State } from "./State";
import { ComponentType } from "./ComponentType";
import { StateModification } from "./StateModification";
import { TimePatternListManager } from "./TimePatternListManager";
import { TimeDistributedConfigListManager } from "./TimeDistributedConfigListManager";
import { SimulationObjectType } from "./SimulationObjectType";
import { ScenarioListManager } from "./ScenarioListManager";
export declare class ModelDefinition {
    readonly model: Model;
    readonly activities: ActivityListManager;
    readonly connectors: ConnectorListManager;
    readonly resources: ResourceListManager;
    readonly generators: GeneratorListManager;
    readonly entities: EntityListManager;
    readonly resourceRequirements: ResourceRequirementListManager;
    readonly states: StateListManager;
    readonly timePatterns: TimePatternListManager;
    readonly timeDistributedConfigs: TimeDistributedConfigListManager;
    readonly scenarios: ScenarioListManager;
    constructor(model: Model);
    get id(): string;
    get name(): string;
    /**
     * Get all states for a specific component type.
     */
    getStatesByComponentType(componentType: ComponentType): State[];
    /**
     * Get all entity state definitions.
     */
    getEntityStateDefinitions(): State[];
    /**
     * Get all activity state definitions.
     */
    getActivityStateDefinitions(): State[];
    /**
     * Get all resource state definitions.
     */
    getResourceStateDefinitions(): State[];
    /**
     * Get all model state definitions.
     */
    getModelStateDefinitions(): State[];
    /**
     * Get a state definition by its unique_id.
     */
    getStateByUniqueId(uniqueId: string): State | undefined;
    /**
     * Add a state definition to the model.
     *
     * @throws Error if state name conflicts with existing state of same component type
     */
    addStateDefinition(state: State): void;
    /**
     * Validate a list of StateModification objects against this model's state definitions.
     *
     * @throws Error if any modification is invalid
     */
    validateStateModifications(stateModifications: StateModification[]): void;
    /**
     * Validate all state definitions for consistency and correctness.
     *
     * @throws Error if validation fails
     */
    validateStateDefinitions(): void;
    /**
     * Validate all state references throughout model.
     *
     * @throws Error if validation fails
     */
    validateStateReferences(): void;
    /**
     * Validate state modifications for a specific component.
     *
     * @private
     */
    private validateComponentStateModifications;
    /**
     * Validate cross-component state access permissions.
     *
     * @throws Error if validation fails
     */
    validateCrossComponentAccess(): void;
    /**
     * Validate that referenced component exists.
     *
     * @private
     */
    private validateComponentReference;
    /**
     * Checks if a name is unique among objects of the given type.
     * @param type - The simulation object type to check within
     * @param name - The name to check
     * @param excludeId - Optional ID to exclude (for editing existing objects)
     * @returns true if the name is unique, false if it conflicts
     */
    isNameUniqueForType(type: SimulationObjectType, name: string, excludeId?: string): boolean;
    /**
     * Gets all names currently in use for a given type.
     * @param type - The simulation object type
     * @returns Array of names in use
     */
    getUsedNamesForType(type: SimulationObjectType): string[];
    /**
     * Gets all objects of a given type.
     * @param type - The simulation object type
     * @returns Array of simulation objects
     */
    private getObjectsByType;
}
//# sourceMappingURL=ModelDefinition.d.ts.map
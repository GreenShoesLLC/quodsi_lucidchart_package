import { ActivityRelationships } from '../shared/types/ActivityRelationships';
import { Connection } from '../shared/types/Connection';
import { SimulationElement } from '../shared/types/SimulationElement';
import { SimulationObjectType } from '../shared/types/elements/enums/simulationObjectType';
import { ValidationResult } from '../shared/types/ValidationTypes';
/**
 * Manages the state and relationships of simulation model elements
 */
export declare class ModelManager {
    private elements;
    private relationships;
    private activityRelationships;
    private connections;
    private validationService;
    constructor();
    /**
     * Registers a new element in the model
     */
    registerElement(element: SimulationElement): void;
    /**
     * Retrieves an element by ID
     */
    getElementById(id: string): SimulationElement | undefined;
    /**
     * Gets all elements of a specific type
     */
    getElementsByType(type: SimulationObjectType): SimulationElement[];
    /**
     * Gets all connections in the model
     */
    getConnections(): Connection[];
    /**
     * Gets relationships for an activity
     */
    getActivityRelationships(activityId: string): ActivityRelationships | undefined;
    /**
     * Updates an existing element
     */
    updateElement(element: SimulationElement): void;
    /**
     * Removes an element from the model
     */
    removeElement(elementId: string): void;
    /**
     * Validates the model using the validation service
     */
    validateModel(): ValidationResult;
    /**
     * Gets current model state for debugging
     */
    getModelState(): string;
    private initializeActivityRelationships;
    private trackConnection;
}

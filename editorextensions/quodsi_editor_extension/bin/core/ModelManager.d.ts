import { Model } from "../shared/types/elements/Model";
import { ModelDefinition } from "../shared/types/elements/ModelDefinition";
import { SimulationObject } from "../shared/types/elements/SimulationObject";
import { SimulationObjectType } from "../shared/types/elements/SimulationObjectType";
import { ValidationResult } from "../shared/types/ValidationTypes";
import { StorageAdapter } from "./StorageAdapter";
import { ElementProxy, PageProxy } from "lucid-extension-sdk";
export declare class ModelManager {
    private modelDefinition;
    private storageAdapter;
    private elementProxies;
    constructor(storageAdapter: StorageAdapter);
    /**
     * Initializes a new model definition with data from storage
     */
    initializeModel(modelData: Model, pageProxy: PageProxy): void;
    /**
      * Registers a simulation element with the appropriate list manager and storage
      */
    registerElement(element: SimulationObject, elementProxy: ElementProxy): void;
    /**
     * Gets an element by ID from any list manager
     */
    getElementById(id: string): SimulationObject | undefined;
    /**
     * Gets all elements of a specific type
     */
    getElementsByType(type: SimulationObjectType): SimulationObject[];
    /**
     * Updates an existing element in both memory and storage
     */
    updateElement(element: SimulationObject): void;
    /**
     * Gets the current Model data
     */
    getModel(): Model | null;
    /**
     * Gets the ModelDefinition
     */
    getModelDefinition(): ModelDefinition | null;
    /**
     * Removes an element from both memory and storage
     */
    removeElement(elementId: string): void;
    /**
     * Validates the model using the validation service
     */
    validateModel(): ValidationResult;
    /**
     * Clears the current model definition and associated storage
     */
    clear(): void;
}

import { Model, ModelDefinition, SimulationObject, SimulationObjectType, ValidationResult } from "@quodsi/shared";
import { StorageAdapter } from "./StorageAdapter";
import { ElementProxy, PageProxy } from "lucid-extension-sdk";
export declare class ModelManager {
    private modelDefinition;
    private storageAdapter;
    private elementProxies;
    private currentValidationResult;
    private validationService;
    constructor(storageAdapter: StorageAdapter);
    /**
     * Initializes a new model definition with data from storage
     */
    initializeModel(modelData: Model, pageProxy: PageProxy): Promise<void>;
    /**
      * Registers a simulation element with the appropriate list manager and storage
      */
    registerElement(element: SimulationObject, elementProxy: ElementProxy): Promise<void>;
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
    updateElement(element: SimulationObject): Promise<void>;
    /**
     * Gets the current Model data
     */
    getModel(): Model | null;
    /**
     * Gets the ModelDefinition
     */
    getModelDefinition(): ModelDefinition | null;
    /**
     * Gets the current validation result
     */
    getCurrentValidation(): ValidationResult | null;
    /**
     * Removes an element from both memory and storage
     */
    removeElement(elementId: string): Promise<void>;
    /**
     * Validates the model using the validation service
     */
    validateModel(): Promise<ValidationResult>;
    /**
     * Clears the current model definition and associated storage
     */
    clear(): void;
}
//# sourceMappingURL=ModelManager.d.ts.map
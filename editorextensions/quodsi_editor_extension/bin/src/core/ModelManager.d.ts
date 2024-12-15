import { Model, ModelDefinition, SimulationObject, SimulationObjectType, ValidationResult, MetaData, ModelStructure } from "@quodsi/shared";
import { StorageAdapter } from "./StorageAdapter";
import { ElementProxy, PageProxy } from "lucid-extension-sdk";
export declare class ModelManager {
    private modelDefinition;
    private storageAdapter;
    private currentPage;
    private validationService;
    private currentValidationResult;
    private changeTracker;
    private static readonly VALIDATION_CACHE_TIMEOUT;
    private static readonly MODEL_DEF_CACHE_TIMEOUT;
    constructor(storageAdapter: StorageAdapter);
    /**
     * Marks the model as needing rebuild and validation
     */
    private markModelDirty;
    /**
     * Checks if caches are still valid based on timeouts
     */
    private checkCacheTimeouts;
    /**
     * Gets the current ModelDefinition, rebuilding if necessary
     */
    private ensureModelDefinition;
    /**
     * Initializes a new model definition with data from storage
     */
    initializeModel(modelData: Model, pageProxy: PageProxy): Promise<void>;
    /**
     * Registers a simulation element
     */
    registerElement(element: SimulationObject, elementProxy: ElementProxy): Promise<void>;
    /**
     * Updates an existing element
     */
    updateElement(element: SimulationObject): Promise<void>;
    /**
     * Removes an element
     */
    removeElement(elementId: string): Promise<void>;
    /**
     * Validates the model only if needed
     */
    private validateModelIfNeeded;
    /**
     * Forces a model validation
     */
    validateModel(): Promise<ValidationResult>;
    private findElementProxy;
    getModel(): Model | null;
    getModelDefinition(): Promise<ModelDefinition | null>;
    getCurrentValidation(): ValidationResult | null;
    /**
     * Gets an element by ID from any list manager
     */
    getElementById(id: string): SimulationObject | undefined;
    /**
     * Gets elements by type
     */
    getElementsByType(type: SimulationObjectType): SimulationObject[];
    clear(): void;
    isQuodsiModel(page: PageProxy): boolean;
    getElementData<T>(element: ElementProxy): T | null;
    getMetadata(element: ElementProxy): MetaData | null;
    setElementData(element: ElementProxy, data: any, type: SimulationObjectType, metadata?: {
        id: string;
        version: string;
    }): void;
    clearElementData(element: ElementProxy): void;
    get CURRENT_VERSION(): string;
    setExpandedNodes(page: PageProxy, nodes: string[]): void;
    getExpandedNodes(page: PageProxy): string[];
    /**
     * Removes the model from the specified page and clears manager state
     */
    removeModelFromPage(page: PageProxy): void;
    getStorageAdapter(): StorageAdapter;
    findPathToNode(modelStructure: ModelStructure, nodeId: string): Set<string>;
    private findPathToNodeRecursive;
    isUnconvertedElement(element: ElementProxy): boolean;
    /**
     * Handles saving simulation element data and metadata
     */
    saveElementData(element: ElementProxy, data: any, type: SimulationObjectType, page: PageProxy): Promise<void>;
    /**
     * Handles converting an element to a new simulation type
     */
    private handleTypeConversion;
    /**
     * Handles updating element data
     */
    private handleDataUpdate;
    /**
     * Gets default name for an element based on its type
     */
    private getDefaultElementName;
}
//# sourceMappingURL=ModelManager.d.ts.map
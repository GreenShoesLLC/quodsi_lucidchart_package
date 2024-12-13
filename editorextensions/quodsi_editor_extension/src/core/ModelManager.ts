import { ModelValidationService } from "../services/validation/ModelValidationService";
import { 
    Activity,
    Connector,
    Generator,
    Entity,
    Model,
    ModelDefinition,
    Resource,
    SimulationObject,
    SimulationObjectType,
    ValidationResult 
} from "@quodsi/shared";
import { StorageAdapter } from "./StorageAdapter";
import { ElementProxy, PageProxy } from "lucid-extension-sdk";

export class ModelManager {
    private modelDefinition: ModelDefinition | null = null;
    private storageAdapter: StorageAdapter;
    private elementProxies: Map<string, ElementProxy> = new Map();
    private currentValidationResult: ValidationResult | null = null;
    private validationService: ModelValidationService;

    constructor(storageAdapter: StorageAdapter) {
        this.storageAdapter = storageAdapter;
        this.validationService = new ModelValidationService();
    }

    /**
     * Initializes a new model definition with data from storage
     */
    public async initializeModel(modelData: Model, pageProxy: PageProxy): Promise<void> {
        this.modelDefinition = new ModelDefinition(modelData);

        // Store the model data using the page proxy
        this.storageAdapter.setElementData(
            pageProxy,
            modelData,
            SimulationObjectType.Model
        );

        // Perform initial validation
        await this.validateModel();
    }

    /**
      * Registers a simulation element with the appropriate list manager and storage
      */
    public async registerElement(element: SimulationObject, elementProxy: ElementProxy): Promise<void> {
        // Store the element proxy for future use
        this.elementProxies.set(element.id, elementProxy);

        // Handle Model type specially
        if (element.type === SimulationObjectType.Model) {
            // Create new model definition without updating storage
            this.modelDefinition = new ModelDefinition(element as Model);

            // Skip storage update during initialization
            // We'll only update storage in response to user actions
            return;
        }

        // For non-Model types, ensure model definition exists
        if (!this.modelDefinition) {
            throw new Error('Model not initialized');
        }

        // Register with appropriate list manager
        switch (element.type) {
            case SimulationObjectType.Activity:
                this.modelDefinition.activities.add(element as Activity);
                break;
            case SimulationObjectType.Connector:
                this.modelDefinition.connectors.add(element as Connector);
                break;
            case SimulationObjectType.Generator:
                this.modelDefinition.generators.add(element as Generator);
                break;
            case SimulationObjectType.Resource:
                this.modelDefinition.resources.add(element as Resource);
                break;
            case SimulationObjectType.Entity:
                this.modelDefinition.entities.add(element as Entity);
                break;
            default:
                throw new Error(`Unknown element type: ${element.type}`);
        }

        // Validate after registration
        await this.validateModel();
    }

    /**
     * Gets an element by ID from any list manager
     */
    public getElementById(id: string): SimulationObject | undefined {
        if (!this.modelDefinition) return undefined;

        return this.modelDefinition.activities.get(id) ||
            this.modelDefinition.connectors.get(id) ||
            this.modelDefinition.generators.get(id) ||
            this.modelDefinition.resources.get(id) ||
            this.modelDefinition.entities.get(id);
    }

    /**
     * Gets all elements of a specific type
     */
    public getElementsByType(type: SimulationObjectType): SimulationObject[] {
        if (!this.modelDefinition) return [];

        switch (type) {
            case SimulationObjectType.Activity:
                return this.modelDefinition.activities.getAll();
            case SimulationObjectType.Connector:
                return this.modelDefinition.connectors.getAll();
            case SimulationObjectType.Generator:
                return this.modelDefinition.generators.getAll();
            case SimulationObjectType.Resource:
                return this.modelDefinition.resources.getAll();
            case SimulationObjectType.Entity:
                return this.modelDefinition.entities.getAll();
            default:
                return [];
        }
    }

    /**
     * Updates an existing element in both memory and storage
     */
    public async updateElement(element: SimulationObject): Promise<void> {
        if (!this.modelDefinition) {
            throw new Error('Model not initialized');
        }

        // Get the element proxy
        const elementProxy = this.elementProxies.get(element.id);
        if (!elementProxy) {
            throw new Error(`No element proxy found for ID: ${element.id}`);
        }

        // Update in appropriate list manager
        switch (element.type) {
            case SimulationObjectType.Activity:
                this.modelDefinition.activities.add(element as Activity);
                break;
            case SimulationObjectType.Connector:
                this.modelDefinition.connectors.add(element as Connector);
                break;
            case SimulationObjectType.Generator:
                this.modelDefinition.generators.add(element as Generator);
                break;
            case SimulationObjectType.Resource:
                this.modelDefinition.resources.add(element as Resource);
                break;
            case SimulationObjectType.Entity:
                this.modelDefinition.entities.add(element as Entity);
                break;
        }

        // Update storage
        this.storageAdapter.updateElementData(
            elementProxy,
            element
        );

        // Validate after update
        await this.validateModel();
    }

    /**
     * Gets the current Model data
     */
    public getModel(): Model | null {
        return this.modelDefinition?.model ?? null;
    }

    /**
     * Gets the ModelDefinition
     */
    public getModelDefinition(): ModelDefinition | null {
        return this.modelDefinition;
    }

    /**
     * Gets the current validation result
     */
    public getCurrentValidation(): ValidationResult | null {
        return this.currentValidationResult;
    }

    /**
     * Removes an element from both memory and storage
     */
    public async removeElement(elementId: string): Promise<void> {
        if (!this.modelDefinition) return;

        // Get the element proxy before removal
        const elementProxy = this.elementProxies.get(elementId);
        if (!elementProxy) {
            console.warn(`No element proxy found for ID: ${elementId}`);
            return;
        }

        // Remove from all list managers
        this.modelDefinition.activities.remove(elementId);
        this.modelDefinition.connectors.remove(elementId);
        this.modelDefinition.generators.remove(elementId);
        this.modelDefinition.resources.remove(elementId);
        this.modelDefinition.entities.remove(elementId);

        // Remove from storage
        this.storageAdapter.clearElementData(elementProxy);

        // Remove from proxy map
        this.elementProxies.delete(elementId);

        // Validate after removal
        await this.validateModel();
    }

    /**
     * Validates the model using the validation service
     */
    public async validateModel(): Promise<ValidationResult> {
        if (!this.modelDefinition) {
            this.currentValidationResult = {
                isValid: false,
                errorCount: 1,
                warningCount: 0,
                messages: [{
                    type: 'error',
                    message: 'No model initialized'
                }]
            };
            return this.currentValidationResult;
        }

        const result = await this.validationService.validate(this.modelDefinition);

        // Calculate error and warning counts
        const errorCount = result.messages.filter(m => m.type === 'error').length;
        const warningCount = result.messages.filter(m => m.type === 'warning').length;

        this.currentValidationResult = {
            ...result,
            errorCount,
            warningCount
        };

        return this.currentValidationResult;
    }

    /**
     * Clears the current model definition and associated storage
     */
    public clear(): void {
        if (this.modelDefinition) {
            // Clear storage for all components using their proxies
            for (const [id, proxy] of this.elementProxies) {
                this.storageAdapter.clearElementData(proxy);
            }
        }

        this.modelDefinition = null;
        this.elementProxies.clear();
        this.currentValidationResult = null;
    }
}
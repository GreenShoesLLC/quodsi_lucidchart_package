import { ActivityRelationships } from '../shared/types/ActivityRelationships';
import { Connection } from '../shared/types/Connection';
import { SimulationElement } from '../shared/types/SimulationElement';
import { SimulationObjectType } from '../shared/types/elements/enums/simulationObjectType';
import { ValidationResult } from '../shared/types/ValidationTypes';
import { ModelValidationService } from '../services/validation/ModelValidationService';
import { ModelState } from '../services/validation/interfaces/ModelState';


/**
 * Manages the state and relationships of simulation model elements
 */
export class ModelManager {
    // Core element storage
    private elements: Map<string, SimulationElement>;

    // Relationship tracking
    private relationships: {
        activities: Set<string>;
        entities: Set<string>;
        generators: Set<string>;
        connectors: Set<string>;
        resources: Set<string>;
    };

    // Activity-specific relationships
    private activityRelationships: Map<string, ActivityRelationships>;

    // Connection tracking
    private connections: Map<string, Connection>;

    // Validation service
    private validationService: ModelValidationService;

    constructor() {
        // Initialize storage
        this.elements = new Map();
        this.connections = new Map();
        this.activityRelationships = new Map();

        // Initialize relationships
        this.relationships = {
            activities: new Set<string>(),
            entities: new Set<string>(),
            generators: new Set<string>(),
            connectors: new Set<string>(),
            resources: new Set<string>()
        };

        // Initialize validation service
        this.validationService = new ModelValidationService();
    }

    /**
     * Registers a new element in the model
     */
    public registerElement(element: SimulationElement): void {
        console.log('[ModelManager] Registering element:', {
            id: element.id,
            type: element.type,
            data: element
        });

        try {
            // Store the element
            this.elements.set(element.id, element);

            // Track in type-specific collection
            switch (element.type) {
                case SimulationObjectType.Activity:
                    this.relationships.activities.add(element.id);
                    this.initializeActivityRelationships(element.id);
                    break;
                case SimulationObjectType.Generator:
                    this.relationships.generators.add(element.id);
                    break;
                case SimulationObjectType.Resource:
                    this.relationships.resources.add(element.id);
                    break;
                case SimulationObjectType.Connector:
                    this.relationships.connectors.add(element.id);
                    const connectorData = element as unknown as Connection;

                    // Enhanced validation and logging for connector data
                    if (!connectorData.sourceId || !connectorData.targetId) {
                        console.error('[ModelManager] Invalid connector data - missing source or target:', {
                            id: element.id,
                            sourceId: connectorData.sourceId,
                            targetId: connectorData.targetId,
                            fullData: connectorData
                        });
                        return;
                    }

                    // Store the connection with full validation
                    this.connections.set(element.id, {
                        id: element.id,
                        sourceId: connectorData.sourceId,
                        targetId: connectorData.targetId,
                        probability: connectorData.probability ?? 1.0
                    });

                    // Update activity relationships if applicable
                    if (this.activityRelationships.has(connectorData.sourceId)) {
                        this.activityRelationships.get(connectorData.sourceId)?.outgoingConnectors.add(element.id);
                    }
                    if (this.activityRelationships.has(connectorData.targetId)) {
                        this.activityRelationships.get(connectorData.targetId)?.incomingConnectors.add(element.id);
                    }
                    break;
                case SimulationObjectType.Entity:
                    this.relationships.entities.add(element.id);
                    break;
            }

            console.log('[ModelManager] Element registered successfully:', {
                id: element.id,
                type: element.type,
                collectionsState: {
                    activities: this.relationships.activities.size,
                    generators: this.relationships.generators.size,
                    resources: this.relationships.resources.size,
                    connectors: this.relationships.connectors.size,
                    entities: this.relationships.entities.size
                }
            });
        } catch (error) {
            console.error('[ModelManager] Failed to register element:', {
                error,
                element: { id: element.id, type: element.type }
            });
            throw error;
        }
    }

    /**
     * Retrieves an element by ID
     */
    public getElementById(id: string): SimulationElement | undefined {
        return this.elements.get(id);
    }

    /**
     * Gets all elements of a specific type
     */
    public getElementsByType(type: SimulationObjectType): SimulationElement[] {
        const collectionKey = `${type.toLowerCase()}s` as keyof typeof this.relationships;
        return Array.from(this.relationships[collectionKey])
            .map(id => this.elements.get(id))
            .filter((element): element is SimulationElement => element !== undefined);
    }

    /**
     * Gets all connections in the model
     */
    public getConnections(): Connection[] {
        return Array.from(this.connections.values());
    }

    /**
     * Gets relationships for an activity
     */
    public getActivityRelationships(activityId: string): ActivityRelationships | undefined {
        return this.activityRelationships.get(activityId);
    }

    /**
     * Updates an existing element
     */
    public updateElement(element: SimulationElement): void {
        if (!this.elements.has(element.id)) {
            throw new Error(`Element not found: ${element.id}`);
        }

        this.elements.set(element.id, element);
    }

    /**
     * Removes an element from the model
     */
    public removeElement(elementId: string): void {
        const element = this.elements.get(elementId);
        if (!element) return;

        // Remove from main storage
        this.elements.delete(elementId);

        // Remove from type-specific collection
        const collectionKey = `${element.type.toLowerCase()}s` as keyof typeof this.relationships;
        this.relationships[collectionKey].delete(elementId);

        // Clean up relationships
        if (element.type === SimulationObjectType.Activity) {
            this.activityRelationships.delete(elementId);
        }

        // Clean up connections
        if (element.type === SimulationObjectType.Connector) {
            this.connections.delete(elementId);
        }
    }

    /**
     * Validates the model using the validation service
     */
    public validateModel(): ValidationResult {
        const modelState: ModelState = {
            elements: this.elements,
            connections: this.connections,
            activityRelationships: this.activityRelationships,
            relationships: this.relationships
        };

        return this.validationService.validate(modelState);
    }

    /**
     * Gets current model state for debugging
     */
    public getModelState(): string {
        return JSON.stringify({
            elements: this.elements.size,
            relationships: {
                activities: Array.from(this.relationships.activities),
                generators: Array.from(this.relationships.generators),
                connectors: Array.from(this.relationships.connectors),
                resources: Array.from(this.relationships.resources),
                entities: Array.from(this.relationships.entities)
            },
            connections: Array.from(this.connections.values()),
            activityRelationships: Array.from(this.activityRelationships.entries())
        }, null, 2);
    }

    private initializeActivityRelationships(activityId: string): void {
        this.activityRelationships.set(activityId, {
            incomingConnectors: new Set(),
            outgoingConnectors: new Set(),
            assignedResources: new Set()
        });
    }

    private trackConnection(element: SimulationElement): void {
        if (element.type !== SimulationObjectType.Connector) return;

        const connectorData = element as unknown as Connection;

        // Validate required connector fields
        if (!connectorData.sourceId || !connectorData.targetId) {
            console.error('[ModelManager] Invalid connector data - missing source or target:', {
                id: element.id,
                sourceId: connectorData.sourceId,
                targetId: connectorData.targetId
            });
            return;
        }

        // Ensure probability is valid
        const probability = connectorData.probability ?? 1.0;
        if (isNaN(probability) || probability < 0 || probability > 1) {
            console.error('[ModelManager] Invalid connector probability:', probability);
            return;
        }

        // Store the connection with validated data
        this.connections.set(element.id, {
            id: element.id,
            sourceId: connectorData.sourceId,
            targetId: connectorData.targetId,
            probability: probability
        });

        // Update activity relationships
        if (this.activityRelationships.has(connectorData.sourceId)) {
            this.activityRelationships.get(connectorData.sourceId)?.outgoingConnectors.add(element.id);
        }
        if (this.activityRelationships.has(connectorData.targetId)) {
            this.activityRelationships.get(connectorData.targetId)?.incomingConnectors.add(element.id);
        }
    }
}
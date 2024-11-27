// services/ConversionService.ts
import {
    PageProxy,
    BlockProxy,
    LineProxy
} from 'lucid-extension-sdk';



import { ConversionResult } from '../../shared/types/ConversionResult';
import { StorageAdapter } from '../../core/StorageAdapter';
import { ModelManager } from '../../core/ModelManager';

import { Connection } from '../../shared/types/Connection';
import { ProcessAnalysisResult } from '../../shared/types/ProcessAnalysisResult';
import { ConnectionInfo } from '../../shared/types/ConnectionInfo';
import { BlockAnalysis } from '../../shared/types/BlockAnalysis';
import { ConnectorData } from '../../shared/types/ConnectorData';
import { SimulationObjectType } from '../../shared/types/elements/enums/simulationObjectType';
import { Connector } from '../../shared/types/elements/connector';
import { SimulationElementFactory } from '../../shared/types/SimulationElementFactory';
import { SimulationElement } from '../../shared/types/SimulationElement';
import { ConnectType } from '../../shared/types/elements/enums/connectType';


/**
 * Handles the conversion of LucidChart diagrams to Quodsi simulation models
 */
export class ConversionService {
    // Properties to track elements during conversion
    private elements: Map<string, {
        id: string;
        originalId: string;
        type: SimulationObjectType;
    }> = new Map();

    private activityRelationships: Map<string, {
        incomingConnectors: Set<string>;
        outgoingConnectors: Set<string>;
        assignedResources: Set<string>;
    }> = new Map();

    private connections: Map<string, Connection> = new Map();

    constructor(
        private modelManager: ModelManager,
        private storageAdapter: StorageAdapter
    ) { }

    /**
     * Checks if a page can be converted to a model
     */
    public canConvertPage(page: PageProxy): boolean {
        if (!page || !page.allBlocks || !page.allLines) {
            return false;
        }

        // Check if page already has model data
        if (this.storageAdapter.isQuodsiModel(page)) {
            return false;
        }

        // Must have at least one block to be convertible
        return page.allBlocks.size > 0;
    }

    /**
     * Converts a LucidChart page to a Quodsi simulation model
     */
    public async convertPage(page: PageProxy): Promise<ConversionResult> {
        console.log('[ConversionService] Starting page conversion');

        try {
            const analysis = this.analyzePage(page);
            await this.initializeModel(page);
            const convertedBlocks = await this.convertBlocks(page, analysis);
            const convertedConnectors = await this.convertConnections(page, analysis);

            // Assign resources to activities
            this.assignResourcesToActivities();

            const validationResult = this.modelManager.validateModel();
            if (!validationResult.isValid) {
                throw new Error('Model validation failed after conversion');
            }

            return {
                success: true,
                modelId: page.id,
                elementCount: {
                    activities: convertedBlocks.activities,
                    generators: convertedBlocks.generators,
                    resources: convertedBlocks.resources,
                    connectors: convertedConnectors
                }
            };
        } catch (error) {
            console.error('[ConversionService] Conversion failed:', error);
            throw error;
        }
    }

    /**
     * Analyzes the page structure to determine element types and relationships
     */
    private analyzePage(page: PageProxy): ProcessAnalysisResult {
        console.log('[ConversionService] Analyzing page structure');

        const connections = new Map<string, ConnectionInfo>();
        const blockAnalysis = new Map<string, BlockAnalysis>();

        // Analyze connections
        for (const [lineId, line] of page.allLines) {
            const endpoint1 = line.getEndpoint1();
            const endpoint2 = line.getEndpoint2();

            if (endpoint1.connection && endpoint2.connection) {
                const sourceId = endpoint1.connection.id;
                const targetId = endpoint2.connection.id;

                // Record connection
                this.recordConnection(connections, sourceId, targetId, lineId);

                // Update block analysis for both source and target
                this.updateBlockAnalysis(blockAnalysis, sourceId, 'outgoing');
                this.updateBlockAnalysis(blockAnalysis, targetId, 'incoming');
            }
        }

        // Determine element types based on connection patterns
        this.determineElementTypes(blockAnalysis, connections);

        return {
            connections,
            blockAnalysis
        };
    }

    /**
     * Initializes the model data on the page
     */
    private async initializeModel(page: PageProxy): Promise<void> {
        console.log('[ConversionService] Initializing model');

        // Create model element using SimulationElementFactory
        const modelElement = SimulationElementFactory.createElement(
            { type: SimulationObjectType.Model },
            {
                id: page.id,
                name: page.getTitle() || 'New Model',
                reps: 1,                    // Default from ModelDefaults
                forecastDays: 30,           // Default from ModelDefaults
                seed: 12345,                // Default from ModelDefaults
                oneClockUnit: 'MINUTES',    // Default PeriodUnit
                simulationTimeType: 'Clock', // Default SimulationTimeType
                warmupClockPeriod: 0,
                warmupClockPeriodUnit: 'MINUTES',
                runClockPeriod: 0,
                runClockPeriodUnit: 'MINUTES',
                warmupDateTime: null,
                startDateTime: null,
                finishDateTime: null
            }
        );

        // Store the model data
        this.storageAdapter.setElementData(
            page,
            modelElement.toStorage(),
            SimulationObjectType.Model
        );

        // Register with model manager
        this.modelManager.registerElement(modelElement);
    }

    /**
     * Converts blocks based on analysis
     */
    private async convertBlocks(
        page: PageProxy,
        analysis: ProcessAnalysisResult
    ): Promise<{ activities: number; generators: number; resources: number }> {
        console.log('[ConversionService] Converting blocks');

        let activities = 0;
        let generators = 0;
        let resources = 0;

        for (const [blockId, block] of page.allBlocks) {
            const blockAnalysis = analysis.blockAnalysis.get(blockId);

            if (!blockAnalysis?.elementType) {
                console.warn(`[ConversionService] No element type determined for block ${blockId}`);
                continue;
            }

            try {
                await this.convertBlock(block, blockAnalysis.elementType);

                // Update counts
                switch (blockAnalysis.elementType) {
                    case SimulationObjectType.Activity:
                        activities++;
                        break;
                    case SimulationObjectType.Generator:
                        generators++;
                        break;
                    case SimulationObjectType.Resource:
                        resources++;
                        break;
                }

                console.log(`Successfully converted block ${blockId} to ${blockAnalysis.elementType}`);
            } catch (error) {
                console.error(`[ConversionService] Failed to convert block ${blockId}:`, error);
                throw new Error(`Failed to convert block ${blockId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        return { activities, generators, resources };
    }

    /**
     * Converts individual block to simulation element
     */
    private async convertBlock(
        block: BlockProxy,
        elementType: SimulationObjectType
    ): Promise<void> {
        const elementData = this.createElementData(block, elementType);

        // Store the mapping
        const elementMapping = {
            id: elementData.id,
            originalId: block.id,
            type: elementType
        };
        this.elements.set(block.id, elementMapping);

        this.storageAdapter.setElementData(
            block,
            elementData,
            elementType
        );

        this.modelManager.registerElement({
            id: elementData.id,
            type: elementType,
            ...elementData
        });
    }

    /**
     * Converts connections to simulation connectors
     */
    private async convertConnections(
        page: PageProxy,
        analysis: ProcessAnalysisResult
    ): Promise<number> {
        console.log('[ConversionService] Converting connections');
        let connectorCount = 0;

        for (const [lineId, line] of page.allLines) {
            try {
                // Get endpoint connections
                const endpoint1 = line.getEndpoint1();
                const endpoint2 = line.getEndpoint2();

                if (!endpoint1?.connection || !endpoint2?.connection) {
                    console.warn(`[ConversionService] Line ${lineId} has invalid endpoints`);
                    continue;
                }

                // Get source and target mappings
                const sourceMapping = this.elements.get(endpoint1.connection.id);
                const targetMapping = this.elements.get(endpoint2.connection.id);

                if (!sourceMapping || !targetMapping) {
                    console.warn('[ConversionService] Missing element mapping:', {
                        lineId,
                        sourceId: endpoint1.connection.id,
                        targetId: endpoint2.connection.id,
                        hasSource: !!sourceMapping,
                        hasTarget: !!targetMapping
                    });
                    continue;
                }

                // Create connector using helper method
                const connector = this.createConnectorElement(
                    sourceMapping.id,
                    targetMapping.id,
                    lineId
                );

                // Store the connector data
                this.storageAdapter.setElementData(
                    line,
                    connector,
                    SimulationObjectType.Connector
                );

                // Register with model manager
                this.modelManager.registerElement(connector);
                connectorCount++;

                console.log(`[ConversionService] Successfully converted connector ${lineId}:`, {
                    id: connector.id,
                    sourceId: sourceMapping.id,
                    targetId: targetMapping.id
                });

            } catch (error) {
                console.error(`[ConversionService] Failed to convert connection ${lineId}:`, error);
            }
        }

        return connectorCount;
    }

    /**
     * Updates block analysis with connection information
     */
    private updateBlockAnalysis(
        analysis: Map<string, BlockAnalysis>,
        blockId: string,
        connectionType: 'incoming' | 'outgoing'
    ): void {
        let blockInfo = analysis.get(blockId);
        if (!blockInfo) {
            blockInfo = {
                incomingCount: 0,
                outgoingCount: 0,
                elementType: undefined
            };
            analysis.set(blockId, blockInfo);
        }

        if (connectionType === 'incoming') {
            blockInfo.incomingCount++;
        } else {
            blockInfo.outgoingCount++;
        }
    }

    /**
     * Records connection information
     */
    private recordConnection(
        connections: Map<string, ConnectionInfo>,
        sourceId: string,
        targetId: string,
        lineId: string
    ): void {
        connections.set(lineId, {
            sourceId,
            targetId,
            probability: this.calculateProbability(sourceId)
        });
    }

    /**
     * Determines element types based on connection patterns
     */
    private determineElementTypes(
        blockAnalysis: Map<string, BlockAnalysis>,
        connections: Map<string, ConnectionInfo>
    ): void {
        let hasResource = false;

        // First pass: identify obvious types
        for (const [blockId, analysis] of blockAnalysis) {
            if (!analysis.elementType) {
                analysis.elementType = this.determineElementTypeFromAnalysis(analysis, hasResource);
                if (analysis.elementType === SimulationObjectType.Resource) {
                    hasResource = true;
                }
            }
        }
    }
    private determineElementTypeFromAnalysis(analysis: BlockAnalysis, hasResourceBeenAssigned: boolean): SimulationObjectType {
        if (analysis.incomingCount === 0 && analysis.outgoingCount > 0) {
            return SimulationObjectType.Generator;
        }
        if (analysis.outgoingCount === 0 && analysis.incomingCount > 0) {
            return SimulationObjectType.Activity;
        }
        if (analysis.incomingCount > 0 || analysis.outgoingCount > 0) {
            return SimulationObjectType.Activity;
        }
        if (!hasResourceBeenAssigned) {
            return SimulationObjectType.Resource;
        }
        return SimulationObjectType.Activity;
    }
    /**
     * Calculates probability for a connection based on source block's outgoing connections
     */
    private calculateProbability(sourceId: string): number {
        // Count outgoing connections from source
        let outgoingCount = 0;
        for (const connection of this.modelManager.getConnections()) {
            if (connection.sourceId === sourceId) {
                outgoingCount++;
            }
        }
        return outgoingCount > 0 ? 1 / outgoingCount : 1;
    }

    /**
     * Creates base element data for a block
     */
    private createElementData(block: BlockProxy, elementType: SimulationObjectType): any {
        const id = block.id;
        const name = this.getBlockName(block);

        // Create base data based on element type
        const baseData = {
            id,
            name
        };

        // Create element using factory with appropriate data
        const element = SimulationElementFactory.createElement(
            { type: elementType },
            {
                ...baseData,
                // Add type-specific defaults based on elementType
                ...(elementType === SimulationObjectType.Activity && {
                    capacity: 1,
                    inputBufferCapacity: Infinity,
                    outputBufferCapacity: Infinity,
                    operationSteps: []
                }),
                ...(elementType === SimulationObjectType.Resource && {
                    capacity: 1
                }),
                ...(elementType === SimulationObjectType.Generator && {
                    entityType: "All",
                    periodicOccurrences: Infinity,
                    entitiesPerCreation: 1,
                    maxEntities: Infinity
                })
            }
        );

        // Store the mapping
        this.elements.set(block.id, {
            id,
            originalId: block.id,
            type: elementType
        });

        // Initialize activity relationships if needed
        if (elementType === SimulationObjectType.Activity) {
            this.activityRelationships.set(id, {
                incomingConnectors: new Set(),
                outgoingConnectors: new Set(),
                assignedResources: new Set()
            });
        }

        return element;
    }
    /**
     * Gets a suitable name for a block
     */
    private getBlockName(block: BlockProxy): string {
        // Try to get text from the block's text areas
        if (block.textAreas && block.textAreas.size > 0) {
            for (const text of block.textAreas.values()) {
                if (text && text.trim()) {
                    return text.trim();
                }
            }
        }

        // Fallback to a generic name based on block type
        const className = block.getClassName() || 'Block';
        return `New ${className}`;
    }

    /**
     * Generates a unique identifier
     */
    private generateId(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    private createConnectorElement(sourceId: string, targetId: string, lineId: string): SimulationElement {
        const connectorData = {
            id: this.generateId(),
            name: `Connector ${lineId}`,
            type: SimulationObjectType.Connector,
            sourceId: sourceId,
            targetId: targetId,
            probability: 1.0,
            connectType: ConnectType.Probability,
            operationSteps: []
        };

        console.log('[ConversionService] Creating connector:', {
            id: connectorData.id,
            sourceId: connectorData.sourceId,
            targetId: connectorData.targetId
        });

        return SimulationElementFactory.createElement(
            { type: SimulationObjectType.Connector },
            connectorData
        );
    }
    /**
     * Assigns resources to activities
     */
    private assignResourcesToActivities(): void {
        const resources = Array.from(this.elements.values())
            .filter(e => e.type === SimulationObjectType.Resource);

        const activities = Array.from(this.elements.values())
            .filter(e => e.type === SimulationObjectType.Activity);

        if (resources.length > 0 && activities.length > 0) {
            // Assign first resource to all activities
            const resource = resources[0];

            for (const activity of activities) {
                const activityElement = this.modelManager.getElementById(activity.id);
                if (activityElement) {
                    const activityData = activityElement as any;
                    if (activityData.operationSteps && activityData.operationSteps.length > 0) {
                        activityData.operationSteps[0].resourceSetRequest = {
                            name: 'Resource Set',
                            requestType: 'and',
                            requests: [{
                                keepResource: false,
                                resource: resource.id,
                                quantity: 1
                            }]
                        };

                        // Update model manager
                        this.modelManager.updateElement(activityElement);
                    }

                    // Update activity relationships
                    const relationships = this.activityRelationships.get(activity.id);
                    if (relationships) {
                        relationships.assignedResources.add(resource.id);
                    }
                }
            }
        }
    }
}

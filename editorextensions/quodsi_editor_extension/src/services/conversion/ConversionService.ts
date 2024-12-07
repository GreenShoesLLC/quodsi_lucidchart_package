import {
    PageProxy,
    BlockProxy
} from 'lucid-extension-sdk';

import { 
    ConversionResult,
    ProcessAnalysisResult,
    BlockAnalysis,
    SimulationObjectType,
    Connector,
    Model,
    Activity,
    Generator,
    Resource,
    ModelDefaults,
    ConnectType,
    SimulationObject
} from '@quodsi/shared';

import { StorageAdapter } from '../../core/StorageAdapter';
import { ModelManager } from '../../core/ModelManager';
import { SimulationObjectTypeFactory } from '@quodsi/shared';

export class ConversionService {
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
        console.log(`[ConversionService] Page ID: ${page.id}, Title: ${page.getTitle()}`);
        console.log(`[ConversionService] Block count: ${page.allBlocks.size}, Line count: ${page.allLines.size}`);

        try {
            const analysis = this.analyzePage(page);
            console.log('[ConversionService] Page analysis complete:', {
                blockAnalysisCount: analysis.blockAnalysis.size,
                analysisDetails: Array.from(analysis.blockAnalysis.entries()).map(([id, analysis]) => ({
                    id,
                    incomingCount: analysis.incomingCount,
                    outgoingCount: analysis.outgoingCount,
                    elementType: analysis.elementType
                }))
            });

            await this.initializeModel(page);
            console.log('[ConversionService] Model initialized');

            const convertedBlocks = await this.convertBlocks(page, analysis);
            console.log('[ConversionService] Blocks converted:', convertedBlocks);

            const convertedConnectors = await this.convertConnections(page, analysis);
            console.log('[ConversionService] Connectors converted:', convertedConnectors);

            const validationResult = this.modelManager.validateModel();
            console.log('[ConversionService] Validation result:', validationResult);

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
     * Analyzes the page structure
     */
    private analyzePage(page: PageProxy): ProcessAnalysisResult {
        console.log('[ConversionService] Analyzing page structure');
        const blockAnalysis = new Map<string, BlockAnalysis>();

        // Log all blocks first
        console.log('[ConversionService] All blocks:', Array.from(page.allBlocks.keys()));
        console.log('[ConversionService] All lines:', Array.from(page.allLines.keys()));

        // Analyze connections
        for (const [lineId, line] of page.allLines) {
            const endpoint1 = line.getEndpoint1();
            const endpoint2 = line.getEndpoint2();

            console.log(`[ConversionService] Analyzing line ${lineId}:`, {
                hasEndpoint1Connection: !!endpoint1?.connection,
                hasEndpoint2Connection: !!endpoint2?.connection,
                endpoint1Id: endpoint1?.connection?.id,
                endpoint2Id: endpoint2?.connection?.id
            });

            if (endpoint1.connection && endpoint2.connection) {
                const sourceId = endpoint1.connection.id;
                const targetId = endpoint2.connection.id;

                // Update block analysis for both source and target
                this.updateBlockAnalysis(blockAnalysis, sourceId, 'outgoing');
                this.updateBlockAnalysis(blockAnalysis, targetId, 'incoming');
            }
        }

        console.log('[ConversionService] Pre-type determination analysis:',
            Array.from(blockAnalysis.entries()).map(([id, analysis]) => ({
                id,
                incomingCount: analysis.incomingCount,
                outgoingCount: analysis.outgoingCount,
                currentType: analysis.elementType
            }))
        );

        // Determine element types based on connection patterns and block types
        this.determineElementTypes(blockAnalysis, page);

        return {
            blockAnalysis
        };
    }

    /**
     * Initializes the model data on the page
     */
    private async initializeModel(page: PageProxy): Promise<void> {
        console.log('[ConversionService] Initializing model');

        const model = new Model(
            page.id,
            page.getTitle() || 'New Model',
            ModelDefaults.DEFAULT_REPS,
            ModelDefaults.DEFAULT_FORECAST_DAYS,
            ModelDefaults.DEFAULT_SEED,
            ModelDefaults.DEFAULT_CLOCK_UNIT,
            ModelDefaults.DEFAULT_SIMULATION_TIME_TYPE,
            ModelDefaults.DEFAULT_WARMUP_PERIOD,
            ModelDefaults.DEFAULT_CLOCK_UNIT,
            ModelDefaults.DEFAULT_RUN_PERIOD,
            ModelDefaults.DEFAULT_CLOCK_UNIT,
            null,
            null,
            null
        );

        // Store model data and initialize in manager
        this.modelManager.initializeModel(model, page);
    }

    /**
     * Converts blocks to simulation elements
     */
    private async convertBlocks(
        page: PageProxy,
        analysis: ProcessAnalysisResult
    ): Promise<{ activities: number; generators: number; resources: number }> {
        console.log('[ConversionService] Starting block conversion');

        let activities = 0;
        let generators = 0;
        let resources = 0;

        for (const [blockId, block] of page.allBlocks) {
            const blockAnalysis = analysis.blockAnalysis.get(blockId);
            if (!blockAnalysis?.elementType) {
                console.error(`[ConversionService] Missing element type for block ${blockId}`);
                continue;
            }

            try {
                console.log(`[ConversionService] Creating element for block ${blockId}:`, {
                    type: blockAnalysis.elementType,
                    blockClass: block.getClassName()
                });

                // Create element using factory
                const element = SimulationObjectTypeFactory.createElement(blockAnalysis.elementType, blockId);
                element.name = this.getBlockName(block);

                // Store element data using StorageAdapter
                this.storageAdapter.setElementData(
                    block,                    // ElementProxy
                    element,                  // data object with id
                    blockAnalysis.elementType // SimulationObjectType
                );

                // Verify storage
                const storedData = this.storageAdapter.getElementData(block);
                console.log(`[ConversionService] Stored element data verification for ${blockId}:`, storedData);

                // Register with model manager
                await this.modelManager.registerElement(element, block);

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

                console.log(`[ConversionService] Successfully converted block ${blockId}:`, {
                    type: element.type,
                    name: element.name,
                    stored: !!storedData
                });

            } catch (error) {
                console.error(`[ConversionService] Failed to convert block ${blockId}:`, error);
                throw error;
            }
        }

        return { activities, generators, resources };
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

        // First, calculate outgoing connections per block
        const outgoingConnectionCounts = new Map<string, number>();
        for (const [lineId, line] of page.allLines) {
            const endpoint1 = line.getEndpoint1();
            if (endpoint1?.connection) {
                const sourceId = endpoint1.connection.id;
                outgoingConnectionCounts.set(
                    sourceId,
                    (outgoingConnectionCounts.get(sourceId) || 0) + 1
                );
            }
        }

        console.log('[ConversionService] Outgoing connection counts:',
            Array.from(outgoingConnectionCounts).reduce((obj, [key, value]) => {
                obj[key] = value;
                return obj;
            }, {} as Record<string, number>));

        // Now create connectors with calculated probabilities
        for (const [lineId, line] of page.allLines) {
            try {
                console.log(`[ConversionService] Processing line ${lineId}`);
                const endpoint1 = line.getEndpoint1();
                const endpoint2 = line.getEndpoint2();

                if (!endpoint1?.connection || !endpoint2?.connection) {
                    console.warn(`[ConversionService] Line ${lineId} has invalid endpoints`);
                    continue;
                }

                const sourceId = endpoint1.connection.id;
                const outgoingCount = outgoingConnectionCounts.get(sourceId) || 1;
                const probability = 1.0 / outgoingCount;

                // Create connector using factory
                const connector = SimulationObjectTypeFactory.createElement(
                    SimulationObjectType.Connector,
                    lineId
                ) as Connector;

                // Set connector properties
                connector.name = `Connector ${lineId}`;
                connector.sourceId = sourceId;
                connector.targetId = endpoint2.connection.id;
                connector.probability = probability;
                connector.connectType = ConnectType.Probability;

                // Store connector data
                this.storageAdapter.setElementData(
                    line,
                    connector,
                    SimulationObjectType.Connector
                );

                // Verify storage
                const storedData = this.storageAdapter.getElementData(line);
                console.log(`[ConversionService] Stored connector data verification for ${lineId}:`, {
                    sourceId: connector.sourceId,
                    targetId: connector.targetId,
                    probability: connector.probability,
                    stored: !!storedData
                });

                // Register with model manager
                await this.modelManager.registerElement(connector, line);
                connectorCount++;

            } catch (error) {
                console.error(`[ConversionService] Failed to convert connection ${lineId}:`, error);
                throw error;
            }
        }

        console.log(`[ConversionService] Converted ${connectorCount} connections`);
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
     * Determines element types based on connection patterns
     */
    private determineElementTypes(blockAnalysis: Map<string, BlockAnalysis>, page: PageProxy): void {
        console.log('[ConversionService] Starting element type determination');

        // First pass: Identify types based on block classes
        for (const [blockId, block] of page.allBlocks) {
            const analysis = blockAnalysis.get(blockId) || {
                incomingCount: 0,
                outgoingCount: 0,
                elementType: undefined
            };
            blockAnalysis.set(blockId, analysis);

            const blockClass = block.getClassName();

            // Map specific block classes to simulation types
            if (blockClass) {
                if (blockClass === 'TerminatorBlockV2') {
                    analysis.elementType = SimulationObjectType.Generator;
                } else if (blockClass === 'ProcessBlock' ||
                    blockClass === 'DecisionBlock' ||
                    blockClass === 'ActionBlock') {
                    analysis.elementType = SimulationObjectType.Activity;
                }
                // Don't set Resource type based on block class alone
            }
        }

        // Second pass: Use connection patterns for remaining untyped blocks
        for (const [blockId, analysis] of blockAnalysis) {
            if (!analysis.elementType) {
                // Default to Activity for connected blocks
                if (analysis.incomingCount > 0 || analysis.outgoingCount > 0) {
                    analysis.elementType = SimulationObjectType.Activity;
                } else {
                    // For disconnected blocks, make them Resources
                    analysis.elementType = SimulationObjectType.Resource;
                }
            }
        }

        // Log final type determination
        for (const [blockId, analysis] of blockAnalysis) {
            console.log(`[ConversionService] Final type for block ${blockId}:`, {
                elementType: analysis.elementType,
                incomingCount: analysis.incomingCount,
                outgoingCount: analysis.outgoingCount
            });
        }
    }

    private determineElementTypeFromAnalysis(
        analysis: BlockAnalysis,
        hasResourceBeenAssigned: boolean
    ): SimulationObjectType {
        // If no connections, default to Activity unless we need a Resource
        if (analysis.incomingCount === 0 && analysis.outgoingCount === 0) {
            return hasResourceBeenAssigned ? SimulationObjectType.Activity : SimulationObjectType.Resource;
        }

        // Generator pattern: only outgoing connections
        if (analysis.incomingCount === 0 && analysis.outgoingCount > 0) {
            return SimulationObjectType.Generator;
        }

        // Sink pattern: only incoming connections
        if (analysis.outgoingCount === 0 && analysis.incomingCount > 0) {
            return SimulationObjectType.Activity;
        }

        // Default to Activity for anything with both incoming and outgoing
        return SimulationObjectType.Activity;
    }

    /**
     * Creates a simulation element from a block
     */
    private createSimulationElement(block: BlockProxy, elementType: SimulationObjectType): SimulationObject {
        console.log(`[ConversionService] Creating simulation element for block ${block.id}`, {
            elementType,
            blockClass: block.getClassName(),
            hasTextAreas: block.textAreas?.size > 0
        });

        try {
            const element = SimulationObjectTypeFactory.createElement(elementType, block.id);

            // Log the created element details
            console.log(`[ConversionService] Element created from factory:`, {
                id: element.id,
                type: element.type,
                initialName: element.name
            });

            const name = this.getBlockName(block);
            element.name = name;

            // Special handling for Generator
            if (elementType === SimulationObjectType.Generator && element instanceof Generator) {
                element.entityId = ModelDefaults.DEFAULT_ENTITY_ID;
                console.log(`[ConversionService] Generator configured with default entity ID: ${element.entityId}`);
            }

            console.log(`[ConversionService] Final element configuration:`, {
                id: element.id,
                type: element.type,
                name: element.name,
                isGenerator: element instanceof Generator,
                isActivity: element instanceof Activity,
                isResource: element instanceof Resource
            });

            return element;
        } catch (error) {
            console.error(`[ConversionService] Failed to create element for block ${block.id}:`, error);
            throw error;
        }
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
}
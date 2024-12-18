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
    ModelDefaults,
    ConnectType,
    QuodsiLogger,
} from '@quodsi/shared';

import { StorageAdapter } from '../../core/StorageAdapter';
import { ModelManager } from '../../core/ModelManager';
import { SimulationObjectTypeFactory } from '@quodsi/shared';

export class ConversionService extends QuodsiLogger {
    protected readonly LOG_PREFIX = '[ConversionService]';
    private storageAdapter: StorageAdapter;
    constructor(private modelManager: ModelManager) {
        super();
        // Get storageAdapter from modelManager if needed
        this.storageAdapter = modelManager.getStorageAdapter();
        this.setLogging(false);
    }
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
        this.log('[ConversionService] Starting page conversion');

        try {
            // First, remove any existing model data
            if (this.storageAdapter.isQuodsiModel(page)) {
                this.log('[ConversionService] Removing existing model data');
                this.modelManager.removeModelFromPage(page);
            }

            // Initialize the model BEFORE doing anything else
            const model = Model.createDefault(page.id);

            // Store the model data first
            this.storageAdapter.setElementData(
                page,
                model,
                SimulationObjectType.Model
            );

            // Then initialize in the model manager
            await this.modelManager.initializeModel(model, page);

            // Verify model was initialized
            if (!this.storageAdapter.isQuodsiModel(page)) {
                throw new Error('Failed to initialize model on page');
            }

            // Now do the analysis and conversion
            const analysis = this.analyzePage(page);

            const convertedBlocks = await this.convertBlocks(page, analysis);
            this.log('[ConversionService] Blocks converted:', convertedBlocks);

            const convertedConnectors = await this.convertConnections(page, analysis);
            this.log('[ConversionService] Connectors converted:', convertedConnectors);

            const validationResult = await this.modelManager.validateModel();
            this.log('[ConversionService] Validation result:', validationResult);

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
            this.logError('[ConversionService] Conversion failed:', error);
            throw error;
        }
    }

    /**
     * Analyzes the page structure
     */
    private analyzePage(page: PageProxy): ProcessAnalysisResult {
        this.log('Analyzing page structure');
        const blockAnalysis = new Map<string, BlockAnalysis>();

        // Log all blocks first
        this.log('All blocks:', Array.from(page.allBlocks.keys()));
        this.log('All lines:', Array.from(page.allLines.keys()));

        // Analyze connections
        for (const [lineId, line] of page.allLines) {
            const endpoint1 = line.getEndpoint1();
            const endpoint2 = line.getEndpoint2();

            this.log(`Analyzing line ${lineId}:`, {
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

        this.log('Pre-type determination analysis:',
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
        this.log('Initializing model');

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
        this.log('Starting block conversion');

        let activities = 0;
        let generators = 0;
        let resources = 0;

        for (const [blockId, block] of page.allBlocks) {
            const blockAnalysis = analysis.blockAnalysis.get(blockId);
            if (!blockAnalysis?.elementType) {
                this.logError(`Missing element type for block ${blockId}`);
                continue;
            }

            try {
                this.log(`Creating element for block ${blockId}:`, {
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
                this.log(`Stored element data verification for ${blockId}:`, storedData);

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

                this.log(`Successfully converted block ${blockId}:`, {
                    type: element.type,
                    name: element.name,
                    stored: !!storedData
                });

            } catch (error) {
                this.logError(`Failed to convert block ${blockId}:`, error);
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
        this.log('Converting connections');
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

        this.log('Outgoing connection counts:',
            Array.from(outgoingConnectionCounts).reduce((obj, [key, value]) => {
                obj[key] = value;
                return obj;
            }, {} as Record<string, number>));

        // Now create connectors with calculated probabilities
        for (const [lineId, line] of page.allLines) {
            try {
                this.log(`Processing line ${lineId}`);
                const endpoint1 = line.getEndpoint1();
                const endpoint2 = line.getEndpoint2();

                if (!endpoint1?.connection || !endpoint2?.connection) {
                    console.warn(`Line ${lineId} has invalid endpoints`);
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
                this.log(`Stored connector data verification for ${lineId}:`, {
                    sourceId: connector.sourceId,
                    targetId: connector.targetId,
                    probability: connector.probability,
                    stored: !!storedData
                });

                // Register with model manager
                await this.modelManager.registerElement(connector, line);
                connectorCount++;

            } catch (error) {
                this.logError(`Failed to convert connection ${lineId}:`, error);
                throw error;
            }
        }

        this.log(`Converted ${connectorCount} connections`);
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
    private blockSpecificLogic(block: BlockProxy, analysis: BlockAnalysis): void {
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
    /**
     * Determines element types based on connection patterns
     */
    private determineElementTypes(blockAnalysis: Map<string, BlockAnalysis>, page: PageProxy): void {
        this.log('Starting element type determination');

        // First pass: Identify types based on block classes
        for (const [blockId, block] of page.allBlocks) {
            const analysis = blockAnalysis.get(blockId) || {
                incomingCount: 0,
                outgoingCount: 0,
                elementType: undefined
            };
            blockAnalysis.set(blockId, analysis);

            //this.blockSpecificLogic(block, analysis)
        }

        // Second pass: Use connection patterns for remaining untyped blocks
        for (const [blockId, analysis] of blockAnalysis) {
            if (!analysis.elementType) {
                // Default to Activity for connected blocks
                if (analysis.incomingCount === 0 && analysis.outgoingCount > 0) {
                    analysis.elementType = SimulationObjectType.Generator;
                } else if (analysis.incomingCount > 0) {
                    analysis.elementType = SimulationObjectType.Activity;
                } else {
                    // For disconnected blocks, make them Resources
                    // analysis.elementType = SimulationObjectType.Resource;
                }
            }
        }

        // Log final type determination
        for (const [blockId, analysis] of blockAnalysis) {
            this.log(`Final type for block ${blockId}:`, {
                elementType: analysis.elementType,
                incomingCount: analysis.incomingCount,
                outgoingCount: analysis.outgoingCount
            });
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
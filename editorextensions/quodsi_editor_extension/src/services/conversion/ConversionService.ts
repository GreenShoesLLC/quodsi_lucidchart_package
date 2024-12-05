import {
    PageProxy,
    BlockProxy
} from 'lucid-extension-sdk';

import { ConversionResult } from '../../shared/types/ConversionResult';
import { StorageAdapter } from '../../core/StorageAdapter';
import { ModelManager } from '../../core/ModelManager';
import { ProcessAnalysisResult } from '../../shared/types/ProcessAnalysisResult';
import { BlockAnalysis } from '../../shared/types/BlockAnalysis';
import { SimulationObjectType } from '../../shared/types/elements/SimulationObjectType';
import { Connector } from '../../shared/types/elements/Connector';
import { Model } from '../../shared/types/elements/Model';
import { Activity } from '../../shared/types/elements/Activity';
import { Generator } from '../../shared/types/elements/Generator';
import { Resource } from '../../shared/types/elements/Resource';
import { ModelDefaults } from '../../shared/types/elements/ModelDefaults';
import { ConnectType } from '../../shared/types/elements/ConnectType';
import { SimulationObject } from '../../shared/types/elements/SimulationObject';

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

        try {
            const analysis = this.analyzePage(page);
            await this.initializeModel(page);
            const convertedBlocks = await this.convertBlocks(page, analysis);
            const convertedConnectors = await this.convertConnections(page, analysis);

            const validationResult = this.modelManager.validateModel();
            if (!validationResult.isValid) {
                console.warn('Model validation warnings after conversion:', validationResult.messages);
                // throw new Error('Model validation failed after conversion');
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
     * Analyzes the page structure
     */
    private analyzePage(page: PageProxy): ProcessAnalysisResult {
        console.log('[ConversionService] Analyzing page structure');

        const blockAnalysis = new Map<string, BlockAnalysis>();

        // Analyze connections
        for (const [lineId, line] of page.allLines) {
            const endpoint1 = line.getEndpoint1();
            const endpoint2 = line.getEndpoint2();

            if (endpoint1.connection && endpoint2.connection) {
                const sourceId = endpoint1.connection.id;
                const targetId = endpoint2.connection.id;

                // Update block analysis for both source and target
                this.updateBlockAnalysis(blockAnalysis, sourceId, 'outgoing');
                this.updateBlockAnalysis(blockAnalysis, targetId, 'incoming');
            }
        }

        // Determine element types based on connection patterns
        this.determineElementTypes(blockAnalysis);

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
        console.log('[ConversionService] Converting blocks');

        let activities = 0;
        let generators = 0;
        let resources = 0;

        for (const [blockId, block] of page.allBlocks) {
            const blockAnalysis = analysis.blockAnalysis.get(blockId);
            if (!blockAnalysis?.elementType) continue;

            try {
                const element = this.createSimulationElement(block, blockAnalysis.elementType);
                this.modelManager.registerElement(element, block);

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

        for (const [lineId, line] of page.allLines) {
            try {
                const endpoint1 = line.getEndpoint1();
                const endpoint2 = line.getEndpoint2();

                if (!endpoint1?.connection || !endpoint2?.connection) {
                    console.warn(`[ConversionService] Line ${lineId} has invalid endpoints`);
                    continue;
                }

                const connector = new Connector(
                    lineId,
                    `Connector ${lineId}`,
                    endpoint1.connection.id,
                    endpoint2.connection.id,
                    1.0,
                    ConnectType.Probability,
                    []
                );

                this.modelManager.registerElement(connector, line);
                connectorCount++;

            } catch (error) {
                console.error(`[ConversionService] Failed to convert connection ${lineId}:`, error);
                throw error;
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
     * Determines element types based on connection patterns
     */
    private determineElementTypes(blockAnalysis: Map<string, BlockAnalysis>): void {
        let hasResource = false;

        // Identify obvious types
        for (const [blockId, analysis] of blockAnalysis) {
            if (!analysis.elementType) {
                analysis.elementType = this.determineElementTypeFromAnalysis(analysis, hasResource);
                if (analysis.elementType === SimulationObjectType.Resource) {
                    hasResource = true;
                }
            }
        }
    }

    private determineElementTypeFromAnalysis(
        analysis: BlockAnalysis,
        hasResourceBeenAssigned: boolean
    ): SimulationObjectType {
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
     * Creates a simulation element from a block
     */
    private createSimulationElement(block: BlockProxy, elementType: SimulationObjectType): SimulationObject {
        const name = this.getBlockName(block);

        switch (elementType) {
            case SimulationObjectType.Activity:
                return new Activity(block.id, name);
            case SimulationObjectType.Generator:
                return new Generator(
                    block.id,
                    name,
                    "", // activityKeyId
                    ModelDefaults.DEFAULT_ENTITY_ID // Set default entity ID
                );
            case SimulationObjectType.Resource:
                return new Resource(block.id, name);
            default:
                throw new Error(`Unsupported element type: ${elementType}`);
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
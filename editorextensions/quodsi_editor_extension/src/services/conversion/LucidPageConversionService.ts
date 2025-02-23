import { PageProxy } from 'lucid-extension-sdk';
import {
    ConversionResult,
    Model,
    SimulationObjectType,
    Connector,
    ConnectType,
    QuodsiLogger,
    ProcessAnalysisResult
} from '@quodsi/shared';

import { StorageAdapter } from '../../core/StorageAdapter';
import { ModelManager } from '../../core/ModelManager';
import { LucidElementFactory } from '../../services/LucidElementFactory';
import { LucidPageAnalyzer } from './LucidPageAnalyzer';

export class LucidPageConversionService extends QuodsiLogger {
    protected readonly LOG_PREFIX = '[LucidPageConversionService]';
    private pageAnalyzer: LucidPageAnalyzer;

    constructor(
        private modelManager: ModelManager,
        private elementFactory: LucidElementFactory,
        private storageAdapter: StorageAdapter
    ) {
        super();
        this.setLogging(false);
        this.pageAnalyzer = new LucidPageAnalyzer();
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
        this.log('Starting page conversion');

        try {
            // First, remove any existing model data
            if (this.storageAdapter.isQuodsiModel(page)) {
                this.log('Removing existing model data');
                this.modelManager.removeModelFromPage(page);
            }

            // Create model using LucidElementFactory
            const modelLucid = this.elementFactory.createPlatformObject(
                page,
                SimulationObjectType.Model,
                true // isConversion
            );

            // Get the model object from the platform object
            const model = modelLucid.getSimulationObject();

            // Initialize in the model manager
            await this.modelManager.initializeModel(model, page);

            // Verify model was initialized
            if (!this.storageAdapter.isQuodsiModel(page)) {
                throw new Error('Failed to initialize model on page');
            }

            // Analyze the page to determine element types
            const analysis = this.pageAnalyzer.analyzePage(page);

            // Convert blocks and connections
            const convertedBlocks = await this.convertBlocks(page, analysis);
            this.log('Blocks converted:', convertedBlocks);

            const convertedConnectors = await this.convertConnections(page, analysis);
            this.log('Connectors converted:', convertedConnectors);

            // Validate the converted model
            const validationResult = await this.modelManager.validateModel();
            this.log('Validation result:', validationResult);

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
            this.logError('Conversion failed:', error);
            throw error;
        }
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

                // Create platform object using factory with conversion flag
                const platformObject = this.elementFactory.createPlatformObject(
                    block,
                    blockAnalysis.elementType,
                    true // isConversion
                );

                // Get the simulation object
                const element = platformObject.getSimulationObject();

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
                    name: element.name
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

        // Calculate outgoing connections per block for probability calculation
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

        for (const [lineId, line] of page.allLines) {
            try {
                this.log(`Processing line ${lineId}`);
                const endpoint1 = line.getEndpoint1();
                const endpoint2 = line.getEndpoint2();

                if (!endpoint1?.connection || !endpoint2?.connection) {
                    this.log(`Line ${lineId} has invalid endpoints`);
                    continue;
                }

                const sourceId = endpoint1.connection.id;
                const outgoingCount = outgoingConnectionCounts.get(sourceId) || 1;
                const probability = 1.0 / outgoingCount;

                // Create platform object using factory with conversion flag
                const platformObject = this.elementFactory.createPlatformObject(
                    line,
                    SimulationObjectType.Connector,
                    true // isConversion
                );

                // Get the simulation object and set connection-specific properties
                const connector = platformObject.getSimulationObject() as Connector;
                connector.sourceId = sourceId;
                connector.targetId = endpoint2.connection.id;
                connector.probability = probability;
                connector.connectType = ConnectType.Probability;

                // Update the platform object to save changes
                platformObject.updateFromPlatform();

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
}
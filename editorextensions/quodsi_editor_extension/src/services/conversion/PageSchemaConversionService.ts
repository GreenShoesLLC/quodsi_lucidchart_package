import { PageProxy, BlockProxy } from 'lucid-extension-sdk';
import { v4 as uuidv4 } from 'uuid';
import {
    ConversionResult,
    ProcessAnalysisResult,
    BlockAnalysis,
    SimulationObjectType,
    Model,
    Activity,
    Generator,
    Resource,
    Connector,
    QuodsiLogger,
    SimulationObjectTypeFactory
} from '@quodsi/shared';
import { ModelDataSource, MODEL_COLLECTIONS } from '../../data_sources/model/ModelDataSource';

export class PageSchemaConversionService extends QuodsiLogger {
    protected readonly LOG_PREFIX = '[PageSchemaConversionService]';
    private collectionIds: { [key: string]: string } = {};

    constructor(private modelDataSource: ModelDataSource) {
        super();
        this.setLogging(true);
    }
    private analyzePage(page: PageProxy): ProcessAnalysisResult {
        this.log('Starting page analysis');
        const blockAnalysis = new Map<string, BlockAnalysis>();

        // Analyze connections and compute incoming/outgoing counts
        for (const [lineId, line] of page.allLines) {
            const endpoint1 = line.getEndpoint1();
            const endpoint2 = line.getEndpoint2();

            if (endpoint1.connection && endpoint2.connection) {
                const sourceId = endpoint1.connection.id;
                const targetId = endpoint2.connection.id;
                this.log(`Line ${lineId}: ${sourceId} -> ${targetId}`);
                this.updateBlockAnalysis(blockAnalysis, sourceId, 'outgoing');
                this.updateBlockAnalysis(blockAnalysis, targetId, 'incoming');
            }
        }

        // Determine element types
        this.determineElementTypes(blockAnalysis, page);

        return { blockAnalysis };
    }
    public canConvertPage(page: PageProxy): boolean {
        this.log('Checking if page can be converted');
        if (!page || !page.allBlocks || !page.allLines) {
            this.log('Page invalid - missing required properties');
            return false;
        }
        const blockCount = page.allBlocks.size;
        this.log(`Page has ${blockCount} blocks`);
        return blockCount > 0;
    }

    public async convertPage(page: PageProxy): Promise<ConversionResult> {
        this.log('========== Starting Page Conversion ==========');
        this.log(`Page ID: ${page.id}`);

        try {
            const result = this.modelDataSource.createModelDataSource(page.id);
            if (!result?.source) {
                throw new Error('Failed to create model data source');
            }
            const { source, collectionIds } = result;
            this.collectionIds = collectionIds;
            this.log('Collection IDs:', this.collectionIds);

            const model = Model.createDefault(page.id);
            this.log('Model defaults created:', model);

            this.log('Adding model to collection');
            const modelCollectionId = this.collectionIds[MODEL_COLLECTIONS.MODEL];
            this.log(`Using model collection ID: ${modelCollectionId}`);
            await source.collections.get(modelCollectionId)?.patchItems({
                added: [{
                    id: model.id,
                    name: model.name,
                    reps: model.reps,
                    forecastDays: model.forecastDays,
                    seed: model.seed,
                    oneClockUnit: model.oneClockUnit,
                    simulationTimeType: model.simulationTimeType,
                    warmupClockPeriod: model.warmupClockPeriod,
                    warmupClockPeriodUnit: model.warmupClockPeriodUnit,
                    runClockPeriod: model.runClockPeriod,
                    runClockPeriodUnit: model.runClockPeriodUnit,
                    type: SimulationObjectType.Model
                }]
            });

            const analysis = this.analyzePage(page);
            const convertedBlocks = await this.convertBlocks(page, analysis, source);
            const convertedConnectors = await this.convertConnections(page, analysis, source);

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
            this.logError('========== Conversion Failed ==========');
            this.logError('Error details:', error);
            throw error;
        }
    }

    private async createOperationSteps(objectId: string, operationSteps: any[], source: any) {
        const stepsCollectionId = this.collectionIds[MODEL_COLLECTIONS.OPERATION_STEPS];
        this.log(`Adding operation steps for ${objectId}`, { steps: operationSteps });

        const formattedSteps = operationSteps.map((step, index) => ({
            id: `${objectId}_step_${index}`,
            activityId: objectId,
            requirementId: step.requirementId,
            quantity: step.quantity,
            duration: JSON.stringify(step.duration)
        }));

        await source.collections.get(stepsCollectionId)?.patchItems({
            added: formattedSteps
        });
        this.log(`Added ${formattedSteps.length} operation steps`);
    }

    private async convertBlocks(
        page: PageProxy,
        analysis: ProcessAnalysisResult,
        source: any
    ): Promise<{ activities: number; generators: number; resources: number }> {
        let activities = 0, generators = 0, resources = 0;

        for (const [blockId, block] of page.allBlocks) {
            const blockAnalysis = analysis.blockAnalysis.get(blockId);
            if (!blockAnalysis?.elementType) continue;

            try {
                const name = this.getBlockName(block);
                const element = SimulationObjectTypeFactory.createElement(blockAnalysis.elementType, blockId);
                element.name = name;

                switch (blockAnalysis.elementType) {
                    case SimulationObjectType.Activity: {
                        const activity = element as Activity;
                        const collectionId = this.collectionIds[MODEL_COLLECTIONS.ACTIVITIES];

                        await source.collections.get(collectionId)?.patchItems({
                            added: [{
                                id: activity.id,
                                name: activity.name,
                                capacity: activity.capacity,
                                inputBufferCapacity: activity.inputBufferCapacity,
                                outputBufferCapacity: activity.outputBufferCapacity,
                                type: SimulationObjectType.Activity
                            }]
                        });

                        await this.createOperationSteps(activity.id, activity.operationSteps, source);

                        block.setReferenceKey('simulation_object', {
                            collectionId,
                            primaryKey: activity.id,
                            readonly: true
                        });
                        activities++;
                        break;
                    }

                    case SimulationObjectType.Generator: {
                        const generator = element as Generator;
                        const collectionId = this.collectionIds[MODEL_COLLECTIONS.GENERATORS];

                        await source.collections.get(collectionId)?.patchItems({
                            added: [{
                                id: generator.id,
                                name: generator.name,
                                activityKeyId: generator.activityKeyId,
                                entityId: generator.entityId,
                                periodicOccurrences: generator.periodicOccurrences,
                                periodIntervalDuration: JSON.stringify(generator.periodIntervalDuration),
                                entitiesPerCreation: generator.entitiesPerCreation,
                                periodicStartDuration: JSON.stringify(generator.periodicStartDuration),
                                maxEntities: generator.maxEntities,
                                type: SimulationObjectType.Generator
                            }]
                        });

                        block.setReferenceKey('simulation_object', {
                            collectionId,
                            primaryKey: generator.id,
                            readonly: true
                        });
                        generators++;
                        break;
                    }

                    case SimulationObjectType.Resource: {
                        const resource = element as Resource;
                        const collectionId = this.collectionIds[MODEL_COLLECTIONS.RESOURCES];

                        await source.collections.get(collectionId)?.patchItems({
                            added: [{
                                id: resource.id,
                                name: resource.name,
                                capacity: resource.capacity,
                                type: SimulationObjectType.Resource
                            }]
                        });

                        block.setReferenceKey('simulation_object', {
                            collectionId,
                            primaryKey: resource.id,
                            readonly: true
                        });
                        resources++;
                        break;
                    }
                }
            } catch (error) {
                this.logError(`Failed to convert block ${blockId}:`, error);
                throw error;
            }
        }

        return { activities, generators, resources };
    }

    private async convertConnections(
        page: PageProxy,
        analysis: ProcessAnalysisResult,
        source: any
    ): Promise<number> {
        let connectorCount = 0;
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

        const collectionId = this.collectionIds[MODEL_COLLECTIONS.CONNECTORS];
        for (const [lineId, line] of page.allLines) {
            try {
                const endpoint1 = line.getEndpoint1();
                const endpoint2 = line.getEndpoint2();

                if (!endpoint1?.connection || !endpoint2?.connection) continue;

                const sourceId = endpoint1.connection.id;
                const connector = SimulationObjectTypeFactory.createElement(SimulationObjectType.Connector, lineId) as Connector;
                connector.sourceId = sourceId;
                connector.targetId = endpoint2.connection.id;
                connector.probability = 1.0 / (outgoingConnectionCounts.get(sourceId) || 1);

                await source.collections.get(collectionId)?.patchItems({
                    added: [{
                        id: connector.id,
                        name: connector.name,
                        sourceId: connector.sourceId,
                        targetId: connector.targetId,
                        probability: connector.probability,
                        connectType: connector.connectType,
                        type: SimulationObjectType.Connector
                    }]
                });

                if (connector.operationSteps.length > 0) {
                    await this.createOperationSteps(connector.id, connector.operationSteps, source);
                }

                line.setReferenceKey('simulation_object', {
                    collectionId,
                    primaryKey: connector.id,
                    readonly: true
                });

                connectorCount++;
            } catch (error) {
                this.logError(`Failed to convert connection ${lineId}:`, error);
                throw error;
            }
        }

        return connectorCount;
    }

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

    private determineElementTypes(blockAnalysis: Map<string, BlockAnalysis>, page: PageProxy): void {
        this.log('Starting element type determination');

        // First pass: Block class identification
        this.log('First pass - Block class identification');
        for (const [blockId, block] of page.allBlocks) {
            const analysis = blockAnalysis.get(blockId) || {
                incomingCount: 0,
                outgoingCount: 0,
                elementType: undefined
            };
            blockAnalysis.set(blockId, analysis);
            this.log(`Block ${blockId} initial analysis:`, {
                incomingCount: analysis.incomingCount,
                outgoingCount: analysis.outgoingCount,
                elementType: analysis.elementType
            });
        }

        // Second pass: Connection pattern analysis
        this.log('Second pass - Connection pattern analysis');
        for (const [blockId, analysis] of blockAnalysis) {
            if (!analysis.elementType) {
                const oldType = analysis.elementType;
                if (analysis.incomingCount === 0 && analysis.outgoingCount > 0) {
                    analysis.elementType = SimulationObjectType.Generator;
                } else if (analysis.incomingCount > 0) {
                    analysis.elementType = SimulationObjectType.Activity;
                }
                this.log(`Block ${blockId} type determination:`, {
                    from: oldType,
                    to: analysis.elementType,
                    incomingCount: analysis.incomingCount,
                    outgoingCount: analysis.outgoingCount
                });
            }
        }
    }

    private getBlockName(block: BlockProxy): string {
        if (block.textAreas && block.textAreas.size > 0) {
            for (const text of block.textAreas.values()) {
                if (text && text.trim()) {
                    return text.trim();
                }
            }
        }

        const className = block.getClassName() || 'Block';
        return `New ${className}`;
    }
}
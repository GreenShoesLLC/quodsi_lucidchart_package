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
import { createModelId } from '../../data_sources/common/constants';

export class PageSchemaConversionService extends QuodsiLogger {
    protected readonly LOG_PREFIX = '[PageSchemaConversionService]';
    
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

    public async convertPage(page: PageProxy, documentId: string): Promise<ConversionResult> {
        this.log('========== Starting Page Conversion ==========');
        this.log(`Page ID: ${page.id}`);

        try {
            // Initialize the ModelDataSource
            await this.modelDataSource.initialize();
            
            // Create model definition in the registry
            // const documentId = page..getDocumentId();
            const pageId = page.id;
            const pageName = page.getTitle() || 'Untitled Model';
            
            // Create the model definition record
            const modelDefinition = await this.modelDataSource.createModelDefinition(
                documentId,
                pageId,
                pageName
            );
            
            if (!modelDefinition) {
                throw new Error('Failed to create model definition');
            }
            
            this.log('Model definition created:', modelDefinition);
            
            // Legacy approach - still need to create a data source for now
            // In the future, this will be replaced by the repository pattern
            const legacyResult = this.modelDataSource.createModelDataSource(page.id);
            if (!legacyResult?.source) {
                throw new Error('Failed to create legacy model data source');
            }
            
            // Create a default model
            const model = Model.createDefault(page.id);
            model.name = pageName;
            this.log('Model defaults created:', model);
            
            // For now, we need to continue to use the legacy approach for the rest of the conversion
            // but in the future, we'll replace this with repository-based data access
            
            // TODO: Update to use repositories instead of legacy data source
            
            return {
                success: true,
                modelId: createModelId(documentId, pageId),
                elementCount: {
                    activities: 0,
                    generators: 0,
                    resources: 0,
                    connectors: 0
                }
            };
        } catch (error) {
            this.logError('========== Conversion Failed ==========');
            this.logError('Error details:', error);
            throw error;
        }
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
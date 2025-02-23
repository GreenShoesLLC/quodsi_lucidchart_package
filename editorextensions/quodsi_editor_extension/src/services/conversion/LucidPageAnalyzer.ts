import { PageProxy, BlockProxy } from 'lucid-extension-sdk';
import {
    ProcessAnalysisResult,
    BlockAnalysis,
    SimulationObjectType,
    QuodsiLogger
} from '@quodsi/shared';

export class LucidPageAnalyzer extends QuodsiLogger {
    protected readonly LOG_PREFIX = '[LucidPageAnalyzer]';

    constructor() {
        super();
        this.setLogging(false);
    }

    public analyzePage(page: PageProxy): ProcessAnalysisResult {
        this.log('Analyzing page structure');
        const blockAnalysis = new Map<string, BlockAnalysis>();

        // Log all blocks first
        this.log('All blocks:', Array.from(page.allBlocks.keys()));
        this.log('All lines:', Array.from(page.allLines.keys()));

        // First pass: Initialize all blocks and analyze connections
        this.initializeBlocks(page, blockAnalysis);
        this.analyzeConnections(page, blockAnalysis);

        // Second pass: Determine types based on connection patterns
        this.determineTypesFromConnections(blockAnalysis);

        // Third pass: Apply block-specific overrides only if needed
        this.applyBlockSpecificLogic(page, blockAnalysis);

        // Log final results
        this.logFinalAnalysis(blockAnalysis);

        return { blockAnalysis };
    }

    private initializeBlocks(
        page: PageProxy,
        blockAnalysis: Map<string, BlockAnalysis>
    ): void {
        for (const [blockId] of page.allBlocks) {
            blockAnalysis.set(blockId, {
                incomingCount: 0,
                outgoingCount: 0,
                elementType: undefined
            });
        }
    }

    private analyzeConnections(
        page: PageProxy,
        blockAnalysis: Map<string, BlockAnalysis>
    ): void {
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

                this.updateBlockAnalysis(blockAnalysis, sourceId, 'outgoing');
                this.updateBlockAnalysis(blockAnalysis, targetId, 'incoming');
            }
        }
    }

    private updateBlockAnalysis(
        analysis: Map<string, BlockAnalysis>,
        blockId: string,
        connectionType: 'incoming' | 'outgoing'
    ): void {
        const blockInfo = analysis.get(blockId);
        if (!blockInfo) {
            return; // Should never happen due to initialization
        }

        if (connectionType === 'incoming') {
            blockInfo.incomingCount++;
        } else {
            blockInfo.outgoingCount++;
        }
    }

    private determineTypesFromConnections(
        blockAnalysis: Map<string, BlockAnalysis>
    ): void {
        this.log('Determining types from connection patterns');

        for (const [blockId, analysis] of blockAnalysis) {
            // Determine type based on connection patterns
            if (analysis.incomingCount === 0 && analysis.outgoingCount > 0) {
                analysis.elementType = SimulationObjectType.Generator;
                this.log(`Block ${blockId} set as Generator based on connections`, {
                    incomingCount: analysis.incomingCount,
                    outgoingCount: analysis.outgoingCount
                });
            } else if (analysis.incomingCount > 0) {
                analysis.elementType = SimulationObjectType.Activity;
                this.log(`Block ${blockId} set as Activity based on connections`, {
                    incomingCount: analysis.incomingCount,
                    outgoingCount: analysis.outgoingCount
                });
            }
        }
    }

    private applyBlockSpecificLogic(
        page: PageProxy,
        blockAnalysis: Map<string, BlockAnalysis>
    ): void {
        this.log('Applying block-specific logic');

        for (const [blockId, block] of page.allBlocks) {
            const analysis = blockAnalysis.get(blockId);
            if (!analysis) continue;

            const blockClass = block.getClassName();
            const previousType = analysis.elementType;

            // Only override in specific cases
            if (blockClass === 'TerminatorBlockV2') {
                analysis.elementType = SimulationObjectType.Generator;
            }
            // Add other specific overrides if needed

            if (previousType !== analysis.elementType) {
                this.log(`Block ${blockId} type changed by block-specific logic`, {
                    blockClass,
                    from: previousType,
                    to: analysis.elementType
                });
            }
        }
    }

    private logFinalAnalysis(blockAnalysis: Map<string, BlockAnalysis>): void {
        this.log('Final Analysis Results:');
        for (const [blockId, analysis] of blockAnalysis) {
            this.log(`Block ${blockId}:`, {
                elementType: analysis.elementType,
                incomingCount: analysis.incomingCount,
                outgoingCount: analysis.outgoingCount
            });
        }
    }
}
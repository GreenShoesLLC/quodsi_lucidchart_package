import { PageProxy, BlockProxy, LineProxy } from 'lucid-extension-sdk';
import {
    ProcessAnalysisResult,
    BlockAnalysis,
    SimulationObjectType,
    QuodsiLogger,
    ConversionPreviewData,
    ElementMappingPreview,
    DiagramElementKind,
    ConversionPreviewSummary,
    parseStructuredName,
    extractSimulationType
} from '@quodsi/shared';
import { StorageAdapter } from '../../core/StorageAdapter';

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

        // Second pass: Determine types based on explicit type field and connection patterns
        this.determineTypesFromConnections(page, blockAnalysis);

        // Third pass: Apply block-specific overrides only if needed
        this.applyBlockSpecificLogic(page, blockAnalysis);

        // Log final results
        this.logFinalAnalysis(blockAnalysis);

        return { blockAnalysis };
    }

    /**
     * Analyzes a page and returns preview data for the conversion UI.
     * This includes both blocks and lines, element names, and current simulation types.
     */
    public analyzePageForPreview(
        page: PageProxy,
        storageAdapter: StorageAdapter
    ): ConversionPreviewData {
        this.log('Analyzing page for preview');

        // First, run the standard analysis to get block types
        const analysis = this.analyzePage(page);

        // Check if page is already a Quodsi model
        const isAlreadyConverted = storageAdapter.isQuodsiModel(page);

        const mappings: ElementMappingPreview[] = [];

        // Process all blocks
        for (const [blockId, block] of page.allBlocks) {
            const blockAnalysis = analysis.blockAnalysis.get(blockId);
            const typeInfo = storageAdapter.getElementType(block);
            const currentType = typeInfo?.type ?? null;

            // Get proposed type from analysis (null if isolated/skipped)
            const proposedType = blockAnalysis?.elementType ?? null;

            // Get block dimensions
            const boundingBox = block.getBoundingBox();
            const width = boundingBox ? Math.round(boundingBox.w) : undefined;
            const height = boundingBox ? Math.round(boundingBox.h) : undefined;

            // Determine if block is isolated (no connections)
            const incomingCount = blockAnalysis?.incomingCount ?? 0;
            const outgoingCount = blockAnalysis?.outgoingCount ?? 0;
            const isIsolated = incomingCount === 0 && outgoingCount === 0;

            mappings.push({
                elementId: blockId,
                elementName: this.getBlockName(block),
                elementKind: DiagramElementKind.BLOCK,
                currentType: currentType,
                proposedType: proposedType,
                incomingCount,
                outgoingCount,
                blockClassName: block.getClassName() || undefined,
                width,
                height,
                isIsolated
            });
        }

        // Process all lines
        for (const [lineId, line] of page.allLines) {
            const lineTypeInfo = storageAdapter.getElementType(line);
            const currentType = lineTypeInfo?.type ?? null;

            // Check if line has valid connections
            const endpoint1 = line.getEndpoint1();
            const endpoint2 = line.getEndpoint2();
            const hasValidConnections = !!(endpoint1?.connection && endpoint2?.connection);

            // Lines with valid connections become Connectors, otherwise skipped
            const proposedType = hasValidConnections ? SimulationObjectType.Connector : null;

            // Get source and target block names for better display
            let sourceBlockName: string | undefined;
            let targetBlockName: string | undefined;

            if (endpoint1?.connection) {
                const sourceBlock = page.allBlocks.get(endpoint1.connection.id);
                if (sourceBlock) {
                    sourceBlockName = this.getBlockName(sourceBlock);
                }
            }

            if (endpoint2?.connection) {
                const targetBlock = page.allBlocks.get(endpoint2.connection.id);
                if (targetBlock) {
                    targetBlockName = this.getBlockName(targetBlock);
                }
            }

            // Build element name from source/target if available
            const elementName = (sourceBlockName && targetBlockName)
                ? `${sourceBlockName} → ${targetBlockName}`
                : this.getLineName(line, lineId);

            // Get line label from text areas
            const lineLabel = this.getLineLabel(line);

            mappings.push({
                elementId: lineId,
                elementName: elementName,
                elementKind: DiagramElementKind.LINE,
                currentType: currentType,
                proposedType: proposedType,
                incomingCount: 0,
                outgoingCount: 0,
                sourceBlockName,
                targetBlockName,
                lineLabel,
                isIsolated: !hasValidConnections
            });
        }

        // Calculate summary
        const summary = this.calculateSummary(mappings);

        return {
            pageId: page.id,
            isAlreadyConverted,
            mappings,
            summary
        };
    }

    /**
     * Gets a display name from a block's text areas or class name
     */
    private getBlockName(block: BlockProxy): string {
        // Try to get name from text areas
        if (block.textAreas && block.textAreas.size > 0) {
            for (const text of block.textAreas.values()) {
                if (text && text.trim()) {
                    return text.trim();
                }
            }
        }

        // Fallback to class name
        const className = block.getClassName();
        if (className) {
            return className;
        }

        return `Block ${block.id.substring(0, 8)}`;
    }

    /**
     * Gets a display name for a line
     */
    private getLineName(line: LineProxy, lineId: string): string {
        // Lines typically don't have text, use a generated name
        const endpoint1 = line.getEndpoint1();
        const endpoint2 = line.getEndpoint2();

        if (endpoint1?.connection && endpoint2?.connection) {
            const sourceId = endpoint1.connection.id.substring(0, 6);
            const targetId = endpoint2.connection.id.substring(0, 6);
            return `Line ${sourceId}→${targetId}`;
        }

        return `Line ${lineId.substring(0, 8)}`;
    }

    /**
     * Gets text label from a line's text areas (e.g., "Yes", "No", condition labels)
     */
    private getLineLabel(line: LineProxy): string | undefined {
        if (line.textAreas && line.textAreas.size > 0) {
            for (const text of line.textAreas.values()) {
                if (text && text.trim()) {
                    return text.trim();
                }
            }
        }
        return undefined;
    }

    /**
     * Calculates summary counts from the mappings
     */
    private calculateSummary(mappings: ElementMappingPreview[]): ConversionPreviewSummary {
        const summary: ConversionPreviewSummary = {
            totalBlocks: 0,
            totalLines: 0,
            generators: 0,
            activities: 0,
            resources: 0,
            entities: 0,
            connectors: 0,
            skipped: 0
        };

        for (const mapping of mappings) {
            // Count by element kind
            if (mapping.elementKind === DiagramElementKind.BLOCK) {
                summary.totalBlocks++;
            } else {
                summary.totalLines++;
            }

            // Count by proposed type
            switch (mapping.proposedType) {
                case SimulationObjectType.Generator:
                    summary.generators++;
                    break;
                case SimulationObjectType.Activity:
                    summary.activities++;
                    break;
                case SimulationObjectType.Resource:
                    summary.resources++;
                    break;
                case SimulationObjectType.Entity:
                    summary.entities++;
                    break;
                case SimulationObjectType.Connector:
                    summary.connectors++;
                    break;
                case null:
                    summary.skipped++;
                    break;
            }
        }

        return summary;
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
        page: PageProxy,
        blockAnalysis: Map<string, BlockAnalysis>
    ): void {
        this.log('Determining types from explicit type field and connection patterns');

        for (const [blockId, analysis] of blockAnalysis) {
            const block = page.allBlocks.get(blockId);
            if (!block) continue;

            // First: Check for explicit type in structured name
            const blockName = this.getBlockName(block);
            const parsed = parseStructuredName(blockName);
            const explicitType = extractSimulationType(parsed);

            if (explicitType) {
                // Explicit type overrides connection-based logic
                switch (explicitType) {
                    case 'resource':
                        analysis.elementType = SimulationObjectType.Resource;
                        break;
                    case 'activity':
                        analysis.elementType = SimulationObjectType.Activity;
                        break;
                    case 'generator':
                        analysis.elementType = SimulationObjectType.Generator;
                        break;
                    case 'entity':
                        analysis.elementType = SimulationObjectType.Entity;
                        break;
                }
                this.log(`Block ${blockId} set as ${explicitType} based on explicit type field`, {
                    blockName,
                    explicitType
                });
                continue; // Skip connection-based logic
            }

            // Fallback: Determine type based on connection patterns
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

            // REMOVED: Blind override that breaks connection-based logic
            // TerminatorBlockV2 shapes should be typed based on their connections:
            // - End/sink terminators (incoming, no outgoing) → Activity
            // - Source terminators (no incoming, has outgoing) → Generator
            // - Isolated terminators (no connections) → Skipped
            //
            // if (blockClass === 'TerminatorBlockV2') {
            //     analysis.elementType = SimulationObjectType.Generator;
            // }

            // Add other specific overrides if needed
            // (Only add overrides that respect connection patterns)

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
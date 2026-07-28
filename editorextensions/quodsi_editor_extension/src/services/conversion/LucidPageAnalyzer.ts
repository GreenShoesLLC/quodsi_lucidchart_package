import { PageProxy, BlockProxy, LineProxy } from 'lucid-extension-sdk';
import {
    ProcessAnalysisResult,
    BlockAnalysis,
    SimulationObjectType,
    QuodsiLogger,
    ConversionPreviewData,
    ElementMappingPreview,
    DiagramElementKind,
    parseStructuredName,
    extractSimulationType,
    classifyByTopology,
    ConversionNamer,
    pickName,
    pickConnectorName
} from '@quodsi/lucid-shared';
import { StorageAdapter } from '../../core/StorageAdapter';

import { blockToNameable, lineToNameable } from '../../types/nameableShape';

/**
 * Naming metadata per simulation type, matching what conversion passes to the
 * shared policy (see ActivityLucid / ResourceLucid / GeneratorLucid).
 */
const NAME_OPTS_BY_TYPE: Partial<Record<SimulationObjectType, { typeLabel: string; includeMasterName: boolean }>> = {
    [SimulationObjectType.Activity]: { typeLabel: 'Activity', includeMasterName: true },
    [SimulationObjectType.Generator]: { typeLabel: 'Generator', includeMasterName: true },
    [SimulationObjectType.Resource]: { typeLabel: 'Resource', includeMasterName: false },
};

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

        // Predict the names conversion will assign, using the SAME policy and the
        // same per-type sequence/de-duplication bookkeeping (ConversionNamer).
        // The preview previously invented its own display names -- a block's class
        // ("ProcessBlock") where conversion produces "Activity 1" -- so the screen
        // you use to choose types disagreed with the result.
        const namer = new ConversionNamer();
        const assignedBlockNames = new Map<string, string>();

        // Process all blocks
        for (const [blockId, block] of page.allBlocks) {
            // Skip swimlane container blocks — they're not simulation objects.
            // Their lanes are converted to Resources separately.
            if (block.getClassName() === 'AdvancedSwimLaneBlock') {
                // Not a simulation object; its lanes become Resources separately.
                continue;
            }
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

            // Name it the way conversion would. Only claim a name for shapes that
            // will actually be converted -- an unmapped shape never reaches the
            // naming step, so letting it consume a sequence slot would shift every
            // later number away from what conversion produces.
            const namingType = proposedType ?? currentType;
            const nameOpts = namingType ? NAME_OPTS_BY_TYPE[namingType] : undefined;
            let elementName: string;
            if (nameOpts) {
                elementName = namer.claim(
                    nameOpts.typeLabel,
                    pickName(blockToNameable(block), {
                        typeLabel: nameOpts.typeLabel,
                        includeMasterName: nameOpts.includeMasterName,
                        sequence: namer.nextSequence(nameOpts.typeLabel),
                    })
                );
            } else {
                // Skipped shape: show what the user sees on the canvas.
                elementName = pickName(blockToNameable(block), {
                    typeLabel: 'Block',
                    includeMasterName: true,
                });
            }
            assignedBlockNames.set(blockId, elementName);

            mappings.push({
                elementId: blockId,
                elementName,
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

            // Endpoint names are the names those blocks were just ASSIGNED above,
            // not their raw canvas text -- conversion resolves them the same way
            // (ConnectorLucid.resolveEndpointName), which is what keeps a connector
            // into a de-duplicated "Process_2" from being labelled "Process".
            if (endpoint1?.connection) {
                sourceBlockName = assignedBlockNames.get(endpoint1.connection.id);
            }

            if (endpoint2?.connection) {
                targetBlockName = assignedBlockNames.get(endpoint2.connection.id);
            }

            // Same policy conversion uses: the line's own label wins, else
            // "<source> → <target>", else a friendly fallback. Only claim a name
            // when this line will actually become a Connector.
            const proposedConnectorName = pickConnectorName(lineToNameable(line), {
                sourceName: sourceBlockName,
                targetName: targetBlockName,
            });
            const elementName = proposedType
                ? namer.claim('Connector', proposedConnectorName)
                : proposedConnectorName;

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

        return {
            pageId: page.id,
            isAlreadyConverted,
            mappings
        };
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

    private initializeBlocks(
        page: PageProxy,
        blockAnalysis: Map<string, BlockAnalysis>
    ): void {
        for (const [blockId, block] of page.allBlocks) {
            // Skip swimlane container blocks — they're not simulation objects.
            // Their lanes are converted to Resources separately.
            if (block.getClassName() === 'AdvancedSwimLaneBlock') {
                continue;
            }
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
            // RAW canvas text, deliberately — this parses structured names like
            // "type: resource", so it must see what the user typed, not the
            // display name the naming policy would pick.
            const blockName = blockToNameable(block).text ?? '';
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
                    // 'entity' is intentionally not mapped: entities are no longer
                    // shape-mapped (they live in the Model Editor's Entities tab /
                    // q_entities). An explicitly entity-named shape is left unconverted
                    // (elementType stays undefined → proposedType null → skipped).
                }
                this.log(`Block ${blockId} set as ${explicitType} based on explicit type field`, {
                    blockName,
                    explicitType
                });
                continue; // Skip connection-based logic
            }

            // Fallback: topology decides. The rule is the SHARED one in
            // @quodsi/shared (diagram-mapping/classifyByTopology) that drawio
            // and Visio run through PageAnalyzer -- this used to be a private
            // re-implementation of the same if/else, which is how the rule
            // could drift per platform. Blocks are 2-D, so bothEndpointsResolved
            // is irrelevant here; it only decides Connector for 1-D shapes.
            const verdict = classifyByTopology({
                is1D: false,
                bothEndpointsResolved: false,
                incomingCount: analysis.incomingCount,
                outgoingCount: analysis.outgoingCount
            });
            if (verdict === 'Generator') {
                analysis.elementType = SimulationObjectType.Generator;
            } else if (verdict === 'Activity') {
                analysis.elementType = SimulationObjectType.Activity;
            }
            if (verdict) {
                this.log(`Block ${blockId} set as ${verdict} based on connections`, {
                    incomingCount: analysis.incomingCount,
                    outgoingCount: analysis.outgoingCount
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
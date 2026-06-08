import { SimulationObjectType } from '@quodsi/shared';

/**
 * Identifies whether a diagram element is a block (shape) or line (connector)
 */
export enum DiagramElementKind {
    BLOCK = 'block',
    LINE = 'line'
}

/**
 * Preview data for a single element's type mapping during conversion
 */
export interface ElementMappingPreview {
    /** Unique identifier for the diagram element */
    elementId: string;
    /** Display name extracted from block text or auto-generated */
    elementName: string;
    /** Whether this is a block or line in the diagram */
    elementKind: DiagramElementKind;
    /** Current simulation type if already converted, null if unconverted */
    currentType: SimulationObjectType | null;
    /** Proposed type based on connection pattern analysis, null means skip */
    proposedType: SimulationObjectType | null;
    /** Number of incoming connections to this element */
    incomingCount: number;
    /** Number of outgoing connections from this element */
    outgoingCount: number;
    /** LucidChart block class name for debugging/display */
    blockClassName?: string;
    /** For lines: name of the source block */
    sourceBlockName?: string;
    /** For lines: name of the target block */
    targetBlockName?: string;
    /** For lines: text label on the line (e.g., "Yes", "No") */
    lineLabel?: string;
    /** Block width in pixels */
    width?: number;
    /** Block height in pixels */
    height?: number;
    /** True if element has no connections (0 incoming AND 0 outgoing) */
    isIsolated: boolean;
}

/**
 * Complete preview data for a page conversion
 */
export interface ConversionPreviewData {
    /** ID of the page being analyzed */
    pageId: string;
    /** Whether the page has already been converted to a Quodsi model */
    isAlreadyConverted: boolean;
    /** Array of all element mappings */
    mappings: ElementMappingPreview[];
    /** Summary counts of proposed types */
    summary: ConversionPreviewSummary;
}

/**
 * Summary counts for the conversion preview
 */
export interface ConversionPreviewSummary {
    totalBlocks: number;
    totalLines: number;
    generators: number;
    activities: number;
    resources: number;
    entities: number;
    connectors: number;
    skipped: number;
    /** Number of swimlane lanes that will be auto-converted to Resources */
    swimlaneLaneCount: number;
}

/**
 * A user override for an element's target type
 */
export interface ElementMappingOverride {
    /** The element ID to override */
    elementId: string;
    /** The target type to apply, null means skip/remove */
    targetType: SimulationObjectType | null;
}

/**
 * Request payload for applying conversion with user overrides
 */
export interface ConversionApplyRequest {
    /** ID of the page to convert */
    pageId: string;
    /** Array of user overrides to apply on top of proposed mappings */
    overrides: ElementMappingOverride[];
}

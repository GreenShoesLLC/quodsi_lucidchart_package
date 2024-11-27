import { SimulationElementType } from './ModelTypes';
/**
 * Information about a connection between blocks
 */
export interface ConnectionInfo {
    sourceId: string;
    targetId: string;
    probability: number;
}
/**
 * Analysis information for a block
 */
export interface BlockAnalysis {
    incomingCount: number;
    outgoingCount: number;
    elementType?: SimulationElementType;
}
/**
 * Result of process flow analysis
 */
export interface ProcessAnalysisResult {
    connections: Map<string, ConnectionInfo>;
    blockAnalysis: Map<string, BlockAnalysis>;
}
/**
 * Result of page conversion
 */
export interface ConversionResult {
    success: boolean;
    modelId: string;
    elementCount: {
        activities: number;
        generators: number;
        resources: number;
        connectors: number;
    };
}

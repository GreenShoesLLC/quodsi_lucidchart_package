import { SimulationObjectType } from '@quodsi/lucid-shared';

/** One block's connection counts from LucidPageAnalyzer. */
export interface BlockAnalysis {
    incomingCount: number;
    outgoingCount: number;
    elementType?: SimulationObjectType;
}

export interface ProcessAnalysisResult {
    blockAnalysis: Map<string, BlockAnalysis>;
}

/** Result of LucidPageConversionService converting a page. */
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
